# Expenses Tracker — Smiley Web Design Spec

**Date:** 2026-07-05
**Status:** Approved

## Overview

Port the mobile app's Expenses tracker (monthly income/expense entries, category breakdown, AI savings insight, PDF statement import) to `smiley-web`. The backend (`smiley-mobile/api`'s `expenses.ts` route, `smileyapp.expense_categories`/`expense_months`/`expense_entries` tables) already exists and is unchanged — this is a frontend-only build, full feature parity with mobile including PDF import, same shape as the Net Worth web port.

This is a separate sub-project from Net Worth (previously noted in the Net Worth spec as one of five finance-module sub-projects). **Explicitly out of scope:** the "Transfer to Savings Goal" cross-link shown on the mobile Month Detail screen when net savings > 0 — Savings Goals has no `smiley-web` frontend yet and is its own future sub-project.

---

## Routes & Navigation

| Route | Component | Description |
|-------|-----------|-------------|
| `/expenses` | `ExpensesHubPage` | Hero card (current month) + category donut + month history list |
| `/expenses/:year/:month` | `MonthDetailPage` | Notes, category bars, income/expense entry lists, AI insight |
| `/expenses/categories` | `CategoriesPage` | Category manager (add/edit/reorder/soft-delete) |
| `/expenses/import` | `ImportPage` | PDF statement import wizard |

- Added to `src/App.tsx` route table (4 routes, `:year` and `:month` as route params on the detail route).
- New nav entry in `src/components/Layout.tsx`'s `NAV` array: `{ to: '/expenses', label: 'Expenses', icon: Receipt }` (`Receipt` from `lucide-react` — `Wallet` is already used by Net Worth), placed after Net Worth.
- Route-based structure (not a tab shell like Net Worth) because this feature has a genuine hub→drill-down relationship plus two standalone management screens, unlike Net Worth's three flat, equally-weighted views. Each URL is independently bookmarkable (e.g. linking directly to a specific month).
- The Entry Form (add/edit) is a modal, not a route — consistent with `AssetFormModal`/`LoanFormModal` precedent; simpler than mobile's separate screen since web has no back-stack to manage.
- The Category Form (add/edit) is likewise a modal within `CategoriesPage`.

---

## File Structure

```
src/
  types/expenses.ts             # ExpenseCategory, ExpenseMonthSummary, ExpenseMonthDetail,
                                 # CategoryBreakdown, IncomeSource, ExpenseEntry, DraftTransaction, ImportPreviewResult
  api/expenses.ts                # typed client functions for /expenses/*
  hooks/useExpenses.ts            # React Query hooks (queries + mutations)
  modules/expenses/
    ExpensesHubPage.tsx           # hero + donut + month history
    MonthDetailPage.tsx           # notes, category bars, entry lists, AI insight, move-to-month
    CategoriesPage.tsx            # category manager
    ImportPage.tsx                # PDF import wizard (stage machine)
    EntryFormModal.tsx            # add/edit entry (income or expense)
    CategoryFormModal.tsx         # add/edit category
    ionicons-map.ts               # curated Ionicons name -> lucide-react component map + fallback
```

No backend changes. No new env vars. Auth uses the existing `smiley_token` Bearer JWT (same `client` instance as every other module).

---

## Data Model (`src/types/expenses.ts`)

Types mirror the backend response shapes. `ExpenseEntry`'s numeric fields are typed `string` because that is what the wire actually sends (Postgres `NUMERIC` columns, unparsed by the `/entries` route) — this is intentional, not an oversight, and the API layer converts them immediately (see below).

```ts
export type EntryType = 'income' | 'expense'
export type Currency = 'MYR' | 'SGD'
export type ParseConfidence = 'high' | 'low'

export interface ExpenseCategory {
  id: number
  slug: string
  label: string
  icon: string        // Ionicons name, e.g. 'fast-food-outline'
  color: string        // hex string
  sort_order: number
  is_active: boolean
  created_at: string
}

// GET /expenses/months list item
export interface ExpenseMonthSummary {
  id: number
  year: number
  month: number
  total_income: number
  total_expenses: number
  net_savings: number
  entry_count: number
}

export interface CategoryBreakdown {
  category_id: number
  slug: string
  label: string
  color: string
  icon: string
  total: number
  count: number
}

export interface IncomeSource {
  label: string
  total: number
}

// GET /expenses/months/:year/:month
export interface ExpenseMonthDetail {
  id: number
  year: number
  month: number
  notes: string | null
  total_income: number
  total_expenses: number
  net_savings: number
  savings_rate: number
  by_category: CategoryBreakdown[]
  income_sources: IncomeSource[]
  insight: string | null
  insight_generated_at: string | null
}

// Raw wire shape from GET /expenses/months/:year/:month/entries — numeric fields are strings
export interface ExpenseEntryRaw {
  id: number
  month_id: number
  entry_type: EntryType
  category_id: number | null
  label: string
  amount: string
  currency: Currency
  original_amount: string | null
  exchange_rate: string | null
  entry_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  category_slug: string | null
  category_label: string | null
  category_color: string | null
  category_icon: string | null
}

// Parsed shape used everywhere in the app after api/expenses.ts converts amount/original_amount/exchange_rate to number
export interface ExpenseEntry extends Omit<ExpenseEntryRaw, 'amount' | 'original_amount' | 'exchange_rate'> {
  amount: number
  original_amount: number | null
  exchange_rate: number | null
}

export interface CreateEntryInput {
  entry_type: EntryType
  category_id?: number | null
  label: string
  amount: number
  currency?: Currency
  entry_date?: string | null
  notes?: string | null
}

export interface DraftTransaction {
  id: string
  entry_date: string | null
  label: string
  amount: number
  currency: Currency
  original_amount: null
  category_slug: string
  category_id: number | null
  category_label: string
  category_color: string
  category_icon: string
  excluded: boolean
  parse_confidence: ParseConfidence
}

export interface ImportPreviewResult {
  transactions: DraftTransaction[]
  total_parsed: number
  text_truncated: boolean
  statement_month: string | null
  skipped_rows: number
}

export interface ImportConfirmResult {
  inserted: number
  skipped: number
  months_touched: string[]
}
```

---

## API Client (`src/api/expenses.ts`)

One function per backend route. The `parseEntry` helper is the single point where string→number coercion happens, so no downstream code ever touches a raw string field.

```ts
import client from './client'
import type {
  ExpenseCategory, ExpenseMonthSummary, ExpenseMonthDetail,
  ExpenseEntry, ExpenseEntryRaw, CreateEntryInput,
  ImportPreviewResult, ImportConfirmResult,
} from '../types/expenses'

function parseEntry(e: ExpenseEntryRaw): ExpenseEntry {
  return {
    ...e,
    amount: parseFloat(e.amount),
    original_amount: e.original_amount != null ? parseFloat(e.original_amount) : null,
    exchange_rate: e.exchange_rate != null ? parseFloat(e.exchange_rate) : null,
  }
}

export const expensesApi = {
  getCategories: () => client.get<ExpenseCategory[]>('/expenses/categories').then(r => r.data),
  createCategory: (data: { label: string; slug: string; icon: string; color: string }) =>
    client.post<ExpenseCategory>('/expenses/categories', data).then(r => r.data),
  reorderCategories: (order: { id: number; sort_order: number }[]) =>
    client.patch('/expenses/categories/reorder', { order }),
  updateCategory: (id: number, data: { label: string; icon: string; color: string }) =>
    client.put<ExpenseCategory>(`/expenses/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id: number) => client.delete(`/expenses/categories/${id}`),

  getMonths: (limit = 12, offset = 0) =>
    client.get<ExpenseMonthSummary[]>('/expenses/months', { params: { limit, offset } }).then(r => r.data),
  getMonthDetail: (year: number, month: number) =>
    client.get<ExpenseMonthDetail>(`/expenses/months/${year}/${month}`).then(r => r.data),
  updateMonthNotes: (year: number, month: number, notes: string | null) =>
    client.patch(`/expenses/months/${year}/${month}/notes`, { notes }),
  moveMonth: (year: number, month: number, toYear: number, toMonth: number) =>
    client.patch(`/expenses/months/${year}/${month}/move-to`, { to_year: toYear, to_month: toMonth }),
  generateInsight: (year: number, month: number) =>
    client.post<{ insight: string; generated_at: string }>(`/expenses/months/${year}/${month}/insight`).then(r => r.data),

  getEntries: (year: number, month: number) =>
    client.get<ExpenseEntryRaw[]>(`/expenses/months/${year}/${month}/entries`).then(r => r.data.map(parseEntry)),
  createEntry: (year: number, month: number, data: CreateEntryInput) =>
    client.post<ExpenseEntryRaw>(`/expenses/months/${year}/${month}/entries`, data).then(r => parseEntry(r.data)),
  updateEntry: (id: number, data: CreateEntryInput) =>
    client.put<ExpenseEntryRaw>(`/expenses/entries/${id}`, data).then(r => parseEntry(r.data)),
  deleteEntry: (id: number) => client.delete(`/expenses/entries/${id}`),

  importPreview: (file: File, password?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (password) form.append('password', password)
    return client.post<ImportPreviewResult>('/expenses/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  importConfirm: (transactions: unknown[], overrideYear?: number, overrideMonth?: number) =>
    client.post<ImportConfirmResult>('/expenses/import/confirm', {
      transactions, override_year: overrideYear, override_month: overrideMonth,
    }).then(r => r.data),
}
```

---

## Hooks (`src/hooks/useExpenses.ts`)

Standard React Query pattern matching `useNetworth.ts`:

- `useExpenseCategories()` — query, key `['expenses','categories']`.
- `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()`, `useReorderCategories()` — mutations invalidating `['expenses','categories']`.
- `useExpenseMonths(limit)` — query, key `['expenses','months',limit]`.
- `useExpenseMonthDetail(year, month)` — query, key `['expenses','months',year,month]`. Note: this GET has a server-side side effect (`getOrCreateMonth`) — acceptable since it mirrors mobile behavior exactly and the row it creates is harmless (empty aggregates).
- `useUpdateMonthNotes(year, month)`, `useMoveMonth(year, month)` — mutations invalidating the month-detail key and `['expenses','months']` (the history list).
- `useGenerateInsight(year, month)` — mutation invalidating the month-detail key on success (so the new insight text appears without a manual refetch).
- `useExpenseEntries(year, month)` — query, key `['expenses','entries',year,month]`.
- `useCreateEntry(year, month)`, `useUpdateEntry(year, month)`, `useDeleteEntry(year, month)` — mutations invalidating `['expenses','entries',year,month]`, `['expenses','months',year,month]` (aggregates change), and `['expenses','months']` (history list total/net-savings change).
- `useImportPreview()` — mutation (not a query — triggered once per file selection), returns `ImportPreviewResult`.
- `useImportConfirm()` — mutation invalidating `['expenses','months']` broadly (import can touch multiple months) plus any currently-viewed month-detail/entries keys.

---

## Expenses Hub (`ExpensesHubPage`)

- **Hero card** (`GlassCard`): current calendar month/year label, "Net Savings" large value (red-tinted if negative), income/expenses sub-row with up/down indicator, "{rate}% savings rate" pill (shown only if `total_income > 0`). Header actions: "Import" button (→ `/expenses/import`) and "+ Add Entry" button (opens `EntryFormModal` for the current month, `entry` undefined = create mode).
- **Donut chart card** ("Spending by Category") — rendered only if `by_category` is non-empty. Recharts `PieChart`/`Pie` with `innerRadius`/`outerRadius` set (donut), one `Cell` per category colored from `category.color`, `Tooltip` formatted as `RM {amount}`. A legend list below the chart (colored dot + label + `RM {total}` + `{pct}%`) — this is the first `Pie`/donut usage in `smiley-web`; `recharts` is already a dependency, no new package needed.
- **Month History section** — small overline label + a "Categories" gear-icon button (→ `/expenses/categories`) on the right.
- Empty state (calendar icon + "No expense data yet") when `months` is empty.
- **Month row list** — each row (from `useExpenseMonths(12)`): month/year label, "RM {total_expenses} spent · {entry_count} entries" subtext, right-aligned net-savings value (green/red, `+`/no-sign), a client-computed savings-rate % (`net_savings/total_income*100`, matching mobile's history-row computation, not the server's `savings_rate` field which is only used on hero/detail), chevron. Clicking navigates to `/expenses/:year/:month`.
- Data: `useExpenseMonthDetail(currentYear, currentMonth)` for hero+donut, `useExpenseMonths(12)` for history.

---

## Month Detail (`MonthDetailPage`)

- **Header**: "{Month} {Year}" title + "Move to month" button, opening a small stepper modal (`< Month Year >` buttons with 12/1 wraparound, matching mobile's `shiftMoveMonth`) with a confirm action calling `useMoveMonth`, then navigating back to the hub on success.
- **Notes**: click-to-edit inline text field ("Tap to add a note..." placeholder when empty), Save/Cancel via `useUpdateMonthNotes`.
- **Summary strip**: three boxes (Income green-tinted, Expenses red-tinted, Net tinted by sign) using `total_income`/`total_expenses`/`net_savings` from `useExpenseMonthDetail`.
- **Category Breakdown bars**: one horizontal bar per `by_category` entry — icon (via `ionicons-map`) + label, proportional fill width (`cat.total / maxCatTotal * 100%`, min 2%), amount, and `%` of total expenses (client-computed `round(cat.total/total_expenses*100)`).
- **AI Insight card**: bulb icon + "AI Insight" title. If `insight` is set, shows the text + a "Refresh" link calling `useGenerateInsight` again; else a "Generate Insight" button. `Spinner` while the mutation is pending (the backend call can take up to 60s — Claude CLI invocation).
- **Income entries list**: rows from `useExpenseEntries(year, month)` filtered to `entry_type === 'income'` — label, date (if set, else omitted), `SGD {original_amount} @ {exchange_rate}` sub-line when present, amount in green with `+` prefix. Click → `EntryFormModal` (edit mode); Trash2 icon → confirm + `useDeleteEntry`.
- **Expense entries list**: same pattern, category-colored icon circle (via `ionicons-map` + `category_color`) instead of a fixed icon, category label chip next to the date, amount in red with `-` prefix.
- **Floating "+ Add Entry" button** (bottom-right) → `EntryFormModal` (create mode, pre-filled with this month).

*(No "Transfer to Savings Goal" button — explicitly out of scope.)*

---

## Entry Form Modal (`EntryFormModal`)

Props: `{ year: number; month: number; entry?: ExpenseEntry; onClose: () => void }` — same create/edit toggle convention as `AssetFormModal`/`LoanFormModal`.

Fields:
- **Type toggle**: segmented Expense/Income buttons (red/green highlight when active).
- **Amount + currency**: numeric input plus an inline MYR/SGD toggle. When SGD is selected, fetches `/rates/latest` (existing Rates feature endpoint, via a small inline call — not a new hook, reusing the existing `ratesApi` client) to show "Rate: 1 SGD = {rate} MYR (RM {converted})"; falls back to a hardcoded `3.4` if that fetch fails, matching mobile.
- **Label**: free text, placeholder differs by type ("e.g. Grab to office" vs "e.g. Salary").
- **Category picker** (expense only): horizontal scrollable pill row from `useExpenseCategories()`, icon (via `ionicons-map`) + label, filled solid with the category's color + white text when selected.
- **Date** (optional): plain text input, `YYYY-MM-DD` placeholder hint (no native date-picker component, matching mobile).
- **Notes** (optional): multiline textarea.
- **Save/Update**: validates label non-empty, amount is a positive number, category selected when type is expense; calls `useCreateEntry`/`useUpdateEntry`.
- **Delete** (edit mode only): `window.confirm(...)` then `useDeleteEntry`.

---

## Categories Page (`CategoriesPage`)

- List of categories (from `useExpenseCategories()`): icon (via `ionicons-map`) in a color-tinted circle, label, move-up/move-down chevrons (disabled at list ends, reordering locally then persisting via `useReorderCategories`), Pencil (opens `CategoryFormModal` pre-filled), Trash2 (`window.confirm` then `useDeleteCategory`, soft-delete).
- "+ Add" button → `CategoryFormModal` (create mode).

**Category Form Modal**: label input, live preview chip (icon + color + label), icon grid (the curated preset list — same ~33 names as mobile, rendered via `ionicons-map`), color grid (16 preset hex swatches matching the seeded categories), Save/Update. On create, slug is auto-derived client-side (`label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')`), matching mobile's `slugify()`.

---

## Icon Mapping (`ionicons-map.ts`)

`Record<string, LucideIcon>` covering the 16 seeded category icons (`fast-food-outline`, transport/utilities/groceries/entertainment/health/shopping/education/dining_out/subscriptions/travel/personal_care/household/savings/card_payment/other icons) plus the remaining preset icons offered in the Category Form's icon grid (~33 total, matching mobile's picker exactly so existing category icons never fall back). Unmapped names (shouldn't occur given the curated list matches mobile's exact preset set, but defensive) render a generic `Circle` icon.

---

## PDF Import (`ImportPage`)

Stage machine matching mobile exactly: `idle → picked → uploading → reviewing → confirming → done | error`.

- **idle**: file input (PDF only, `accept="application/pdf"`), optional password field (for encrypted statements), "Upload" button.
- **uploading**: calls `useImportPreview()` with the file (+ password if provided); `Spinner` with "Parsing statement..." (can take up to 90s — Claude CLI call).
- **error**: maps the backend's `error` code to a message via an `ERROR_MESSAGES` dict (`NO_FILE`, `WRONG_PASSWORD`, `ENCRYPTED_PDF`, `EXTRACT_FAILED`, `SCAN_PDF`, `CLAUDE_FAILED`, `PARSE_FAILED`, `NO_TRANSACTIONS`), matching mobile's copy. `WRONG_PASSWORD`/`ENCRYPTED_PDF` route back to `idle` with the password field focused; other errors show a "Try again" button.
- **reviewing**: table of `transactions` from the preview result — each row: date, editable label, amount, currency, a category `<select>` (from `useExpenseCategories()`, defaulting to the AI's `category_slug` guess), an "Exclude" checkbox, and a confidence badge (amber for `parse_confidence === 'low'`). A summary line shows `total_parsed`/`skipped_rows`/`text_truncated` (if true, a note that only the first portion of a very long statement was parsed). An optional "override month" stepper (defaults to `statement_month` if detected, else the current month) — passed as `override_year`/`override_month` to confirm, matching mobile's ability to force all imported transactions into one target month regardless of individual dates.
- **confirming**: calls `useImportConfirm()` with the edited transaction list (respecting per-row `excluded` toggles and edited `category_id`/label where changed) and the override month.
- **done**: summary card — "{inserted} entries added, {skipped} duplicates skipped" + list of `months_touched`, with a "View Month" link per touched month and a "Back to Expenses" button.

---

## Error Handling

Consistent with the rest of the app: React Query `isLoading`/`isError` states render per-section `Spinner`/inline muted error text, not full-page error states. Mutation failures surface as inline error text near the triggering action. The PDF import flow is the one place with a dedicated multi-code error-message mapping, matching the richer error surface the backend already provides for that endpoint specifically.

---

## Testing

No test framework exists in `smiley-web` (confirmed absent, same finding as Net Worth). Verification is `npx tsc --noEmit` plus manual dev-server checks against live data:
- Hub renders current-month hero, donut chart (with real category data), and month history list.
- Create/edit/delete an entry — both income and expense, both MYR and SGD (confirming the SGD rate-conversion hint and stored `original_amount`/`exchange_rate`).
- Month detail: notes edit persists, category bars render with correct proportions, AI insight generates and displays, move-to-month works.
- Category manager: add/edit/reorder/soft-delete a test category, confirm icon/color render correctly via `ionicons-map`.
- PDF import: run a real statement through preview → review (edit a row's category, exclude a row) → confirm, verify entries land in the correct month and duplicates are skipped on a second run of the same file.

---

## Out of Scope

- No changes to `smiley-mobile`/API — purely additive frontend consumption of existing endpoints (including the string-numeric `/entries` route, handled via client-side `parseFloat` in `api/expenses.ts` rather than a backend patch).
- No "Transfer to Savings Goal" cross-link on Month Detail — Savings Goals has no `smiley-web` frontend yet; separate future sub-project.
- No nav "More" overflow restructure — separate sub-project (nav is now at 12 entries with this addition).
