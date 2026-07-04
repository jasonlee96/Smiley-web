# Net Worth (Assets + Loans) — Smiley Web Design Spec

**Date:** 2026-07-04
**Status:** Approved

## Overview

Port the mobile app's Net Worth tracking (net-worth dashboard, asset management, loan management with payoff simulator and amortization schedule) to `smiley-web`. The backend (`smiley-mobile/api`'s `assets`, `loans` routes and `lib/networth.ts`) already exists and is unchanged — this is a frontend-only build, full feature parity with mobile, same shape as the earlier Rate Transfer Alert work.

This is the first of five sub-projects identified for porting the mobile app's "finance module" to web (Net Worth → Savings Goals → Financial Advisor → Expense Import enhancement → Nav restructure), each getting its own spec/plan/build cycle.

**Explicitly out of scope for this cycle:** the mobile "log as expense" quick action tied to asset/loan value updates — that depends on expense/cost tracking, which doesn't exist in `smiley-web` yet and is a separate sub-project. Savings Goals and Financial Advisor are separate sub-projects, not part of this build.

---

## Routes & Navigation

| Route | Component | Description |
|-------|-----------|-------------|
| `/net-worth` | `NetWorthPage` | Tab shell: Dashboard \| Assets \| Loans |

- Added to `src/App.tsx` route table.
- New nav entry in `src/components/Layout.tsx`'s `NAV` array: `{ to: '/net-worth', label: 'Net Worth', icon: Wallet }` (`Wallet` from `lucide-react`), placed after Rates.
- Single nav entry, not three — the top nav is already at 10 icons; internal tabs keep it from growing further ahead of a planned "More" overflow restructure (separate future sub-project).
- Internal tab state (`useState<'dashboard'|'assets'|'loans'>`), no sub-routing — mirrors `TripDetailPage.tsx`'s exact pattern (one route, `tabs/` subfolder, tab buttons at the top of the page).

---

## File Structure

```
src/
  types/networth.ts          # Asset, Loan, NetWorthSummary, NetWorthHistoryPoint, PayoffResult, AmortizationRow
  api/networth.ts            # typed client functions for /assets/* and /loans/*
  hooks/useNetworth.ts        # React Query hooks (queries + mutations)
  modules/networth/
    NetWorthPage.tsx          # tab shell (Dashboard | Assets | Loans), mirrors TripDetailPage.tsx
    tabs/
      DashboardTab.tsx        # net worth summary + timeline chart + breakdown + AI insight
      AssetsTab.tsx           # asset table + inline value edit + add/edit modal + delete
      LoansTab.tsx            # loan table + payment logging + payoff simulator + amortization + add/edit modal + delete
    AssetFormModal.tsx        # shared add/edit modal for assets (create vs edit via `asset?: Asset` prop)
    LoanFormModal.tsx         # shared add/edit modal for loans (create vs edit via `loan?: Loan` prop)
```

No backend changes. No new env vars. Auth uses the existing `smiley_token` Bearer JWT (same `client` instance as every other module).

---

## Data Model (`src/types/networth.ts`)

Types mirror the backend response shapes exactly — no reshaping.

```ts
export type AssetType = 'property' | 'vehicle' | 'cash' | 'investment' | 'epf' | 'fd' | 'crypto' | 'other'
export type DepreciationType = 'manual' | 'straight_line' | 'declining_balance'
export type LoanType = 'home' | 'car' | 'personal' | 'other'

export interface Asset {
  id: number
  name: string
  asset_type: AssetType
  currency: string
  value: number
  purchase_price: number | null
  purchase_date: string | null
  depreciation_type: DepreciationType | null
  institution: string | null
  notes: string | null
  current_value_local: number
  current_value_myr: number
  sgd_rate: number
}

export interface Loan {
  id: number
  name: string
  loan_type: LoanType
  principal: number
  outstanding: number
  interest_rate: number
  monthly_payment: number
  start_date: string
  due_day: number
  is_active: boolean
  linked_asset_id: number | null
  linked_asset_name: string | null
}

export interface NetWorthSummary {
  net_worth_myr: number
  total_assets_myr: number
  total_liabilities_myr: number
  assets_by_type: Record<string, number>
  sgd_rate: number
  insight: string
}

export interface NetWorthHistoryPoint {
  snapshot_date: string
  total_assets_myr: number
  total_liabilities_myr: number
  net_worth_myr: number
}

export interface PayoffResult {
  outstanding: number
  base_months: number
  base_total_interest: number
  with_extra_months: number
  with_extra_total_interest: number
  months_saved: number
  interest_saved: number
  extra_monthly: number
  interest_paid_to_date: number
}

export interface AmortizationRow {
  month_num: number
  payment_date: string
  payment: number
  principal: number
  interest: number
  balance: number
}
```

---

## API Client (`src/api/networth.ts`)

One function per backend route:

```ts
import client from './client'
import type { Asset, Loan, NetWorthSummary, NetWorthHistoryPoint, PayoffResult, AmortizationRow } from '../types/networth'

export const networthApi = {
  getAssets: () => client.get<Asset[]>('/assets').then(r => r.data),
  getAssetsSummary: () => client.get<NetWorthSummary>('/assets/summary').then(r => r.data),
  getNetworthHistory: (days: number) =>
    client.get<NetWorthHistoryPoint[]>('/assets/networth-history', { params: { days } }).then(r => r.data),
  createAsset: (data: Partial<Asset>) => client.post<Asset>('/assets', data).then(r => r.data),
  updateAsset: (id: number, data: Partial<Asset>) => client.put<Asset>(`/assets/${id}`, data).then(r => r.data),
  updateAssetValue: (id: number, value: number) =>
    client.patch<Asset>(`/assets/${id}/update-value`, { value }).then(r => r.data),
  deleteAsset: (id: number) => client.delete(`/assets/${id}`),

  getLoans: () => client.get<Loan[]>('/loans').then(r => r.data),
  createLoan: (data: Partial<Loan>) => client.post<Loan>('/loans', data).then(r => r.data),
  updateLoan: (id: number, data: Partial<Loan>) => client.put<Loan>(`/loans/${id}`, data).then(r => r.data),
  deleteLoan: (id: number) => client.delete(`/loans/${id}`),
  logLoanPayment: (id: number, amount: number) =>
    client.patch<Loan>(`/loans/${id}/payment`, { amount }).then(r => r.data),
  getLoanPayoff: (id: number, extraMonthly: number) =>
    client.get<PayoffResult>(`/loans/${id}/payoff`, { params: { extra_monthly: extraMonthly } }).then(r => r.data),
  getLoanAmortization: (id: number) =>
    client.get<AmortizationRow[]>(`/loans/${id}/amortization`).then(r => r.data),
}
```

---

## Hooks (`src/hooks/useNetworth.ts`)

Standard React Query pattern matching `useRates.ts`:

- `useAssets()`, `useLoans()`, `useAssetsSummary()`, `useNetworthHistory(days)` — query hooks. Summary and history use `refetchInterval: 300_000` (live data, same cadence as Rates); the asset/loan lists don't need polling (mutation-driven invalidation is enough).
- `useCreateAsset()`, `useUpdateAsset()`, `useUpdateAssetValue()`, `useDeleteAsset()` — mutation hooks, each invalidating `['assets']` and `['assets','summary']` (and `['assets','networth-history']` where value changes) on success.
- `useCreateLoan()`, `useUpdateLoan()`, `useDeleteLoan()`, `useLogLoanPayment()` — mutation hooks invalidating `['loans']` and `['assets','summary']` (liabilities affect net worth) on success.
- `useLoanPayoff(id, extraMonthly)` — query hook, key includes `extraMonthly` so it refetches as the user adjusts the extra-payment input (debounced upstream in the component, same 400ms pattern as the transfer alert's amount input).
- `useLoanAmortization(id)` — query hook, fetched on-demand when the schedule view opens (`enabled: showSchedule`).

---

## NetWorthPage (tab shell)

Mirrors `TripDetailPage.tsx` exactly: `useState<'dashboard'|'assets'|'loans'>('dashboard')`, a row of tab buttons at the top (same style as `TripDetailPage`'s `TABS` buttons), and the active tab's component rendered below.

---

## Dashboard Tab

- **Stat row**: 3 `GlassCard`s — Net Worth (large, `IBM Plex Mono`, same treatment as the Rates "Current Rate" card), Total Assets, Total Liabilities.
- **Period toggle**: 30d / 90d / 1y segmented buttons (same style as the Rates page's urgency toggle), driving `useNetworthHistory(days)`.
- **Timeline chart**: Recharts `AreaChart` with gradient fill, same visual treatment as the Rates 7-day spark chart.
- **Delta line**: "+RM X vs {period} ago" computed client-side from the first and last history points, green/red per sign — same pattern as Rates' 7-day change indicator.
- **Assets by Type breakdown**: sorted `type: RM amount` rows in a `GlassCard`, descending by value.
- **AI Insight**: renders `summary.insight` in italicized muted text, only when non-empty (fail-quiet on empty, same convention as the transfer alert's reason chips).
- Loading: per-section `Spinner`, not full-page.

---

## Assets Tab

- **Table** (not cards — matches the "Daily Rates" table convention in `RatesPage`): Name, Type, Value (shows local currency + MYR-converted when foreign; vehicles show the computed depreciated `current_value_myr`), Institution, Actions (Edit/Delete).
- **Inline value edit**: click the Value cell to edit in place, Enter/blur to save via `updateAssetValue` — single-field, no modal (mobile's quick-update maps to this).
- **Add/Edit**: `AssetFormModal.tsx`, `asset?: Asset` prop toggles create/edit (same convention as `TripFormModal.tsx`). Fields: name, asset_type (select), currency (select: `['MYR', 'SGD', 'USD', 'GBP', 'EUR', 'JPY', 'AUD']`, default MYR — matches mobile's `asset-form.tsx` `CURRENCIES` constant exactly), value, institution, notes, and — only when `asset_type === 'vehicle'` — purchase_price, purchase_date, depreciation_type (manual / straight_line / declining_balance), shown/hidden conditionally exactly like the mobile form.
- **Delete**: `window.confirm('Remove "${name}"?')` before calling `deleteAsset` — matches the exact pattern used in `TripsPage`/`TourDetailPage`/`ChatTab` etc. (verified: this codebase uses plain `confirm()`, no modal-based confirmation component exists).

---

## Loans Tab

- **Table**: Name, Type, Outstanding, Monthly Payment, Interest Rate, Status (Active/Inactive badge), Actions.
- **Add/Edit**: `LoanFormModal.tsx`, `loan?: Loan` prop toggles create/edit. Fields: name, loan_type (select), principal, outstanding, interest_rate, monthly_payment, start_date, due_day, linked_asset_id (select from `useAssets()`, optional).
- **Delete**: `window.confirm(...)`, same convention as Assets.
- **Log payment**: small "Log Payment" button opens a lightweight amount prompt, calls `logLoanPayment`.
- **Payoff simulator**: per-loan expandable panel with a debounced (400ms) "extra monthly payment" numeric input driving `useLoanPayoff`. Shows months-saved and interest-saved deltas alongside the base vs. with-extra figures.
- **Amortization schedule**: "View Schedule" button opens a table (Month, Date, Payment, Principal, Interest, Balance) fetched on-demand via `useLoanAmortization`, same table styling as the Assets/Loans lists.

---

## Error Handling

Consistent with the rest of the app: React Query `isLoading`/`isError` states render per-section `Spinner`/inline muted error text, not full-page error states. Mutation failures surface as inline error text near the triggering action — no toast system exists in this app, so none is introduced here.

---

## Testing

No test framework exists in `smiley-web` (confirmed absent, same finding as the Rate Transfer Alert work). Verification is `npx tsc --noEmit` plus manual dev-server checks: dashboard renders real data across all three periods, add/edit/delete a test asset, add/edit/delete a test loan, payoff simulator responds to input changes, amortization schedule loads, inline value edit persists.

---

## Out of Scope

- No changes to `smiley-mobile`/API — purely additive frontend consumption of existing endpoints.
- No expense-logging quick actions (depends on a not-yet-ported expense/cost module — separate sub-project).
- No Savings Goals or Financial Advisor screens — separate sub-projects.
- No nav "More" overflow restructure — separate sub-project, to be scoped once the finance module's final screen count is known.
