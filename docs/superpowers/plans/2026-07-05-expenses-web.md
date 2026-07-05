# Expenses Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the mobile app's Expenses tracker (monthly income/expense entries, category breakdown, AI savings insight, PDF statement import) to `smiley-web`, full feature parity, backend unchanged.

**Architecture:** Frontend-only addition to `smiley-web` (React + TypeScript + Vite + TanStack Query + React Router). Four routes under `/expenses` mirror the mobile app's screen structure (hub, month detail, categories, import), plus two modals (entry form, category form) following the Net Worth module's modal convention.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, React Router v6, axios, `lucide-react`, Recharts (`Pie`/`PieChart` — first use in this codebase), `date-fns`, inline `style={{...}}` objects + CSS custom properties (existing project convention, no CSS-in-JS library, no Tailwind).

## Global Constraints

- No backend changes — consume `smiley-mobile/api`'s existing `/expenses/*` routes as-is.
- No test framework exists in `smiley-web` (confirmed absent, same finding as the Net Worth build) — verification is `npx tsc --noEmit` plus manual dev-server checks. Do not add a test framework as part of this work.
- `GET /expenses/months/:year/:month/entries` (and the create/update entry routes) return `amount`, `original_amount`, `exchange_rate` as raw Postgres strings (unlike `/months` and `/months/:year/:month`, which already `parseFloat` server-side). Fix this client-side only, in `api/expenses.ts`, via a `parseEntry()` helper applied to every entry response — do not patch the backend. This is the same bug class that hit Net Worth's loan amounts; the fix here is structural (one coercion point) rather than scattered `Number()` calls.
- Category `icon` values are Ionicons name strings persisted to a table shared with the mobile app — the web's category icon picker MUST offer the exact same 34 Ionicons name strings mobile uses (`PRESET_ICONS`, see Task 3), not arbitrary lucide names, so categories created on web still render correctly in the mobile app. The lucide mapping is a *display-only* translation layer.
- Delete confirmations use plain `window.confirm(...)` — matches every existing module (`AssetsTab`, `LoansTab`, `TripsPage`, etc.). No modal-based confirm component exists in this codebase.
- Currency options for entries are exactly `MYR` and `SGD` (unlike Net Worth's 7-currency list) — matches the backend's `getLatestSgdRate()` special-casing, which only auto-converts when `currency === 'SGD'`.
- Route-based navigation (not tabs) — `/expenses`, `/expenses/:year/:month`, `/expenses/categories`, `/expenses/import` — because this feature has a hub→drill-down relationship plus two standalone management screens, unlike Net Worth's three flat, equally-weighted tabs.
- Explicitly out of scope: the mobile Month Detail screen's "Transfer to Savings Goal" button. Savings Goals has no `smiley-web` frontend yet and is a separate future sub-project. Do not build any Savings Goal picker/contribute UI.
- Nav entry: `{ to: '/expenses', label: 'Expenses', icon: Receipt }` (lucide `Receipt` — `Wallet` is already used by Net Worth), placed after Net Worth in `src/components/Layout.tsx`'s `NAV` array.

---

## File Structure

```
src/
  types/expenses.ts               # CREATE: all Expenses types
  api/expenses.ts                  # CREATE: expensesApi client (incl. parseEntry numeric-coercion helper)
  hooks/useExpenses.ts              # CREATE: React Query hooks
  modules/expenses/
    ionicons-map.ts                 # CREATE: PRESET_ICONS, PRESET_COLORS, ICON_MAP, getCategoryIcon()
    CategoryFormModal.tsx            # CREATE: add/edit category modal
    CategoriesPage.tsx               # CREATE: category manager
    EntryFormModal.tsx               # CREATE: add/edit entry modal
    ExpensesHubPage.tsx              # CREATE: hero + donut + month history
    MonthDetailPage.tsx              # CREATE: notes, category bars, entries, AI insight, move-to-month
    ImportPage.tsx                   # CREATE: PDF import wizard
  App.tsx                           # MODIFY: add 4 routes
  components/Layout.tsx             # MODIFY: add nav entry
```

**Interfaces produced/consumed across tasks:**
- All types (`ExpenseCategory`, `ExpenseMonthSummary`, `ExpenseMonthDetail`, `CategoryBreakdown`, `IncomeSource`, `ExpenseEntryRaw`, `ExpenseEntry`, `CreateEntryInput`, `DraftTransaction`, `ImportPreviewResult`, `ImportConfirmResult`) — defined in `types/expenses.ts` (Task 1), used everywhere.
- `expensesApi.{getCategories,createCategory,reorderCategories,updateCategory,deleteCategory,getMonths,getMonthDetail,updateMonthNotes,moveMonth,generateInsight,getEntries,createEntry,updateEntry,deleteEntry,importPreview,importConfirm}` — defined in `api/expenses.ts` (Task 1).
- `useExpenseCategories()`, `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()`, `useReorderCategories()`, `useExpenseMonths(limit)`, `useExpenseMonthDetail(year, month)`, `useUpdateMonthNotes(year, month)`, `useMoveMonth(year, month)`, `useGenerateInsight(year, month)`, `useExpenseEntries(year, month)`, `useCreateEntry(year, month)`, `useUpdateEntry(year, month)`, `useDeleteEntry(year, month)`, `useImportPreview()`, `useImportConfirm()` — defined in `hooks/useExpenses.ts` (Task 2).
- `PRESET_ICONS: string[]`, `PRESET_COLORS: string[]`, `getCategoryIcon(icon: string): LucideIcon` — defined in `ionicons-map.ts` (Task 3).
- `CategoryFormModal({ category?: ExpenseCategory; onClose: () => void })` (Task 4), `EntryFormModal({ year: number; month: number; entry?: ExpenseEntry; onClose: () => void })` (Task 5) — default exports, consumed by their respective pages.

---

### Task 1: Types + API client

**Files:**
- Create: `src/types/expenses.ts`
- Create: `src/api/expenses.ts`

**Interfaces:**
- Produces: all types listed above, `expensesApi` object with all 16 functions.

- [ ] **Step 1: Create `src/types/expenses.ts`**

```ts
export type EntryType = 'income' | 'expense'
export type Currency = 'MYR' | 'SGD'
export type ParseConfidence = 'high' | 'low'

export interface ExpenseCategory {
  id: number
  slug: string
  label: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

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

- [ ] **Step 2: Create `src/api/expenses.ts`**

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

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors from `types/expenses.ts` or `api/expenses.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/types/expenses.ts src/api/expenses.ts
git commit -m "Add Expenses types and API client"
```

---

### Task 2: React Query hooks

**Files:**
- Create: `src/hooks/useExpenses.ts`

**Interfaces:**
- Consumes: `expensesApi` (Task 1), all types (Task 1).
- Produces: all 16 hooks listed in the file-structure interfaces section.

- [ ] **Step 1: Create `src/hooks/useExpenses.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../api/expenses'
import type { CreateEntryInput } from '../types/expenses'

// ── Categories ────────────────────────────────────────────────────────────

export function useExpenseCategories() {
  return useQuery({ queryKey: ['expenses', 'categories'], queryFn: expensesApi.getCategories })
}

function invalidateCategories(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['expenses', 'categories'] })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; slug: string; icon: string; color: string }) =>
      expensesApi.createCategory(data),
    onSuccess: () => invalidateCategories(qc),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label: string; icon: string; color: string } }) =>
      expensesApi.updateCategory(id, data),
    onSuccess: () => invalidateCategories(qc),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expensesApi.deleteCategory(id),
    onSuccess: () => invalidateCategories(qc),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (order: { id: number; sort_order: number }[]) => expensesApi.reorderCategories(order),
    onSuccess: () => invalidateCategories(qc),
  })
}

// ── Months ────────────────────────────────────────────────────────────────

export function useExpenseMonths(limit = 12) {
  return useQuery({ queryKey: ['expenses', 'months', limit], queryFn: () => expensesApi.getMonths(limit) })
}

export function useExpenseMonthDetail(year: number, month: number) {
  return useQuery({
    queryKey: ['expenses', 'months', year, month],
    queryFn: () => expensesApi.getMonthDetail(year, month),
    enabled: !!year && !!month,
  })
}

function invalidateMonths(qc: ReturnType<typeof useQueryClient>) {
  // Broad prefix match: covers both the history list (['expenses','months',limit])
  // and any month-detail queries (['expenses','months',year,month]).
  qc.invalidateQueries({ queryKey: ['expenses', 'months'] })
}

export function useUpdateMonthNotes(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notes: string | null) => expensesApi.updateMonthNotes(year, month, notes),
    onSuccess: () => invalidateMonths(qc),
  })
}

export function useMoveMonth(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ toYear, toMonth }: { toYear: number; toMonth: number }) =>
      expensesApi.moveMonth(year, month, toYear, toMonth),
    onSuccess: () => {
      invalidateMonths(qc)
      qc.invalidateQueries({ queryKey: ['expenses', 'entries', year, month] })
    },
  })
}

export function useGenerateInsight(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => expensesApi.generateInsight(year, month),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses', 'months', year, month] }),
  })
}

// ── Entries ───────────────────────────────────────────────────────────────

export function useExpenseEntries(year: number, month: number) {
  return useQuery({
    queryKey: ['expenses', 'entries', year, month],
    queryFn: () => expensesApi.getEntries(year, month),
    enabled: !!year && !!month,
  })
}

function invalidateEntryQueries(qc: ReturnType<typeof useQueryClient>, year: number, month: number) {
  qc.invalidateQueries({ queryKey: ['expenses', 'entries', year, month] })
  invalidateMonths(qc)
}

export function useCreateEntry(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEntryInput) => expensesApi.createEntry(year, month, data),
    onSuccess: () => invalidateEntryQueries(qc, year, month),
  })
}

export function useUpdateEntry(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateEntryInput }) => expensesApi.updateEntry(id, data),
    onSuccess: () => invalidateEntryQueries(qc, year, month),
  })
}

export function useDeleteEntry(year: number, month: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => expensesApi.deleteEntry(id),
    onSuccess: () => invalidateEntryQueries(qc, year, month),
  })
}

// ── Import ────────────────────────────────────────────────────────────────

export function useImportPreview() {
  return useMutation({
    mutationFn: ({ file, password }: { file: File; password?: string }) =>
      expensesApi.importPreview(file, password),
  })
}

export function useImportConfirm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ transactions, overrideYear, overrideMonth }: {
      transactions: unknown[]; overrideYear?: number; overrideMonth?: number
    }) => expensesApi.importConfirm(transactions, overrideYear, overrideMonth),
    onSuccess: (result) => {
      invalidateMonths(qc)
      for (const ym of result.months_touched) {
        const [y, m] = ym.split('-').map(Number)
        qc.invalidateQueries({ queryKey: ['expenses', 'entries', y, m] })
      }
    },
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExpenses.ts
git commit -m "Add React Query hooks for Expenses module"
```

---

### Task 3: Icon mapping

**Files:**
- Create: `src/modules/expenses/ionicons-map.ts`

**Interfaces:**
- Produces: `PRESET_ICONS: string[]`, `PRESET_COLORS: string[]`, `getCategoryIcon(icon: string): LucideIcon`.

- [ ] **Step 1: Create `src/modules/expenses/ionicons-map.ts`**

```ts
import {
  Utensils, UtensilsCrossed, Coffee, Beer,
  Car, Bike, Plane, Bus,
  Zap, Wifi, Smartphone, Tv,
  ShoppingBasket, ShoppingBag, Shirt, Gift,
  Stethoscope, HeartPulse, Dumbbell, PawPrint,
  Film, Music, Book, Gamepad2,
  GraduationCap, Briefcase, Hammer, Home,
  Repeat, PiggyBank, CreditCard, Banknote,
  Scissors, Circle,
  type LucideIcon,
} from 'lucide-react'

// Exact Ionicons name strings offered by the mobile app's category picker
// (smiley-mobile/mobile/app/expense-categories.tsx PRESET_ICONS). The web
// picker MUST offer these same string values — categories are stored in a
// table shared with mobile, and mobile renders `icon` via @expo/vector-icons
// Ionicons directly, so any value not in this exact list won't render there.
export const PRESET_ICONS = [
  'fast-food-outline', 'restaurant-outline', 'cafe-outline', 'beer-outline',
  'car-outline', 'bicycle-outline', 'airplane-outline', 'bus-outline',
  'flash-outline', 'wifi-outline', 'phone-portrait-outline', 'tv-outline',
  'basket-outline', 'bag-handle-outline', 'shirt-outline', 'gift-outline',
  'medkit-outline', 'fitness-outline', 'barbell-outline', 'paw-outline',
  'film-outline', 'musical-notes-outline', 'book-outline', 'game-controller-outline',
  'school-outline', 'business-outline', 'hammer-outline', 'home-outline',
  'repeat-outline', 'save-outline', 'card-outline', 'cash-outline',
  'cut-outline', 'ellipsis-horizontal-circle-outline',
]

// Exact hex values from the mobile app's category picker (same file, PRESET_COLORS)
export const PRESET_COLORS = [
  '#E67E22', '#F39C12', '#E74C3C', '#E91E63', '#9B59B6',
  '#3498DB', '#00BCD4', '#1ABC9C', '#27AE60', '#2ECC71',
  '#8BC34A', '#FF5722', '#607D8B', '#795548', '#5C6BC0',
  '#95A5A6',
]

const ICON_MAP: Record<string, LucideIcon> = {
  'fast-food-outline': Utensils,
  'restaurant-outline': UtensilsCrossed,
  'cafe-outline': Coffee,
  'beer-outline': Beer,
  'car-outline': Car,
  'bicycle-outline': Bike,
  'airplane-outline': Plane,
  'bus-outline': Bus,
  'flash-outline': Zap,
  'wifi-outline': Wifi,
  'phone-portrait-outline': Smartphone,
  'tv-outline': Tv,
  'basket-outline': ShoppingBasket,
  'bag-handle-outline': ShoppingBag,
  'shirt-outline': Shirt,
  'gift-outline': Gift,
  'medkit-outline': Stethoscope,
  'fitness-outline': HeartPulse,
  'barbell-outline': Dumbbell,
  'paw-outline': PawPrint,
  'film-outline': Film,
  'musical-notes-outline': Music,
  'book-outline': Book,
  'game-controller-outline': Gamepad2,
  'school-outline': GraduationCap,
  'business-outline': Briefcase,
  'hammer-outline': Hammer,
  'home-outline': Home,
  'repeat-outline': Repeat,
  'save-outline': PiggyBank,
  'card-outline': CreditCard,
  'cash-outline': Banknote,
  'cut-outline': Scissors,
  'ellipsis-horizontal-circle-outline': Circle,
}

export function getCategoryIcon(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? Circle
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/expenses/ionicons-map.ts
git commit -m "Add Ionicons-to-lucide icon mapping for expense categories"
```

---

### Task 4: Category form modal + Categories page

**Files:**
- Create: `src/modules/expenses/CategoryFormModal.tsx`
- Create: `src/modules/expenses/CategoriesPage.tsx`

**Interfaces:**
- Consumes: `ExpenseCategory` (Task 1); `useExpenseCategories()`, `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()`, `useReorderCategories()` (Task 2); `PRESET_ICONS`, `PRESET_COLORS`, `getCategoryIcon()` (Task 3); `GlassCard`, `Spinner`.
- Produces: default-exported `CategoryFormModal({ category?: ExpenseCategory; onClose: () => void })`, default-exported `CategoriesPage` (no props, rendered at `/expenses/categories`).

- [ ] **Step 1: Create `src/modules/expenses/CategoryFormModal.tsx`**

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateCategory, useUpdateCategory } from '../../hooks/useExpenses'
import { PRESET_ICONS, PRESET_COLORS, getCategoryIcon } from './ionicons-map'
import type { ExpenseCategory } from '../../types/expenses'

function slugify(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', width: '100%', colorScheme: 'dark',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono',
  textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4,
}

export default function CategoryFormModal({ category, onClose }: { category?: ExpenseCategory; onClose: () => void }) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const isEdit = !!category

  const [label, setLabel] = useState(category?.label ?? '')
  const [icon, setIcon] = useState(category?.icon ?? PRESET_ICONS[0])
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0])

  const loading = create.isPending || update.isPending
  const valid = label.trim().length > 0
  const PreviewIcon = getCategoryIcon(icon)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    if (isEdit && category) {
      await update.mutateAsync({ id: category.id, data: { label: label.trim(), icon, color } })
    } else {
      await create.mutateAsync({ label: label.trim(), slug: slugify(label), icon, color })
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Category' : 'New Category'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${color}22`,
            }}>
              <PreviewIcon size={18} color={color} />
            </div>
            <input style={inputStyle} placeholder="Category name *" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
          </div>

          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {PRESET_ICONS.map(name => {
                const Icon = getCategoryIcon(name)
                const active = icon === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${active ? 'var(--border-active)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={15} color={active ? color : 'var(--text-secondary)'} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c, cursor: 'pointer',
                    border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !valid}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/modules/expenses/CategoriesPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useExpenseCategories, useDeleteCategory, useReorderCategories } from '../../hooks/useExpenses'
import { getCategoryIcon } from './ionicons-map'
import CategoryFormModal from './CategoryFormModal'
import type { ExpenseCategory } from '../../types/expenses'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { data: categories = [], isLoading } = useExpenseCategories()
  const deleteCategory = useDeleteCategory()
  const reorder = useReorderCategories()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | undefined>(undefined)

  function openCreate() { setEditing(undefined); setShowForm(true) }
  function openEdit(c: ExpenseCategory) { setEditing(c); setShowForm(true) }
  function confirmDelete(c: ExpenseCategory) {
    if (confirm(`Remove "${c.label}"?`)) deleteCategory.mutate(c.id)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const reordered = [...categories]
    const tmp = reordered[index]
    reordered[index] = reordered[target]
    reordered[target] = tmp
    reorder.mutate(reordered.map((c, i) => ({ id: c.id, sort_order: i + 1 })))
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => navigate('/expenses')}>
          <ChevronLeft size={16} />
        </button>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Expense Categories</h1>
        <div style={{ flex: 1 }} />
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={openCreate}>
          <Plus size={14} /> Add
        </button>
      </div>

      <GlassCard style={{ padding: '8px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
        ) : categories.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No categories yet.
          </div>
        ) : (
          categories.map((c, i) => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderBottom: i < categories.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${c.color}22`,
                }}>
                  <Icon size={15} color={c.color} />
                </div>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{c.label}</span>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={13} />
                </button>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} disabled={i === categories.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown size={13} />
                </button>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEdit(c)}><Pencil size={13} /></button>
                <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => confirmDelete(c)}><Trash2 size={13} /></button>
              </div>
            )
          })
        )}
      </GlassCard>

      {showForm && <CategoryFormModal category={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/expenses/CategoryFormModal.tsx src/modules/expenses/CategoriesPage.tsx
git commit -m "Add category form modal and category manager page"
```

---

### Task 5: Entry form modal

**Files:**
- Create: `src/modules/expenses/EntryFormModal.tsx`

**Interfaces:**
- Consumes: `ExpenseEntry`, `EntryType`, `Currency` (Task 1); `useCreateEntry()`, `useUpdateEntry()`, `useDeleteEntry()`, `useExpenseCategories()` (Task 2); `getCategoryIcon()` (Task 3); `ratesApi.getLatest()` (existing `src/api/rates.ts`).
- Produces: default-exported `EntryFormModal({ year, month, entry?, onClose })`, consumed by `ExpensesHubPage.tsx` (Task 6) and `MonthDetailPage.tsx` (Task 7).

- [ ] **Step 1: Create `src/modules/expenses/EntryFormModal.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCreateEntry, useUpdateEntry, useDeleteEntry, useExpenseCategories } from '../../hooks/useExpenses'
import { getCategoryIcon } from './ionicons-map'
import { ratesApi } from '../../api/rates'
import type { ExpenseEntry, EntryType, Currency } from '../../types/expenses'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', width: '100%', colorScheme: 'dark',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono',
  textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4,
}

export default function EntryFormModal({
  year, month, entry, onClose,
}: { year: number; month: number; entry?: ExpenseEntry; onClose: () => void }) {
  const create = useCreateEntry(year, month)
  const update = useUpdateEntry(year, month)
  const del = useDeleteEntry(year, month)
  const { data: categories = [] } = useExpenseCategories()
  const isEdit = !!entry

  const [entryType, setEntryType] = useState<EntryType>(entry?.entry_type ?? 'expense')
  const [amount, setAmount] = useState(entry ? String(entry.original_amount ?? entry.amount) : '')
  const [currency, setCurrency] = useState<Currency>(entry?.currency ?? 'MYR')
  const [label, setLabel] = useState(entry?.label ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(entry?.category_id ?? null)
  const [entryDate, setEntryDate] = useState(entry?.entry_date?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [sgdRate, setSgdRate] = useState(3.4)

  useEffect(() => {
    if (currency !== 'SGD') return
    ratesApi.getLatest()
      .then(latest => setSgdRate(parseFloat(String(latest.buy_rate)) || 3.4))
      .catch(() => setSgdRate(3.4))
  }, [currency])

  const loading = create.isPending || update.isPending || del.isPending
  const amountNum = parseFloat(amount)
  const valid = label.trim().length > 0 && !isNaN(amountNum) && amountNum > 0 &&
    (entryType === 'income' || categoryId != null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data = {
      entry_type: entryType,
      category_id: entryType === 'expense' ? categoryId : null,
      label: label.trim(),
      amount: amountNum,
      currency,
      entry_date: entryDate || null,
      notes: notes.trim() || null,
    }
    if (isEdit && entry) {
      await update.mutateAsync({ id: entry.id, data })
    } else {
      await create.mutateAsync(data)
    }
    onClose()
  }

  async function handleDelete() {
    if (!entry) return
    if (!confirm(`Delete "${entry.label}"?`)) return
    await del.mutateAsync(entry.id)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Entry' : 'New Entry'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 8, padding: 4 }}>
            {(['expense', 'income'] as EntryType[]).map(t => (
              <button
                key={t} type="button" onClick={() => setEntryType(t)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: entryType === t ? (t === 'expense' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)') : 'transparent',
                  color: entryType === t ? (t === 'expense' ? '#ef4444' : 'var(--accent-green)') : 'var(--text-muted)',
                }}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Amount *</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                <option value="MYR">MYR</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
          </div>
          {currency === 'SGD' && !isNaN(amountNum) && amountNum > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -6 }}>
              Rate: 1 SGD = {sgdRate.toFixed(4)} MYR (RM {(amountNum * sgdRate).toFixed(2)})
            </p>
          )}

          <input
            style={inputStyle}
            placeholder={entryType === 'expense' ? 'e.g. Grab to office' : 'e.g. Salary'}
            value={label} onChange={e => setLabel(e.target.value)}
          />

          {entryType === 'expense' && (
            <div>
              <label style={labelStyle}>Category *</label>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {categories.map(c => {
                  const Icon = getCategoryIcon(c.icon)
                  const active = categoryId === c.id
                  return (
                    <button
                      key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${c.color}`,
                        background: active ? c.color : 'transparent',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12, whiteSpace: 'nowrap',
                      }}
                    >
                      <Icon size={13} color={active ? '#fff' : c.color} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Date</label>
            <input type="text" placeholder="YYYY-MM-DD" style={inputStyle} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>

          <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
            {isEdit ? (
              <button type="button" className="btn-ghost" style={{ color: '#ef4444' }} onClick={handleDelete} disabled={loading}>Delete</button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading || !valid}>
                {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/expenses/EntryFormModal.tsx
git commit -m "Add entry form modal for income and expense entries"
```

---

### Task 6: Expenses Hub page

**Files:**
- Create: `src/modules/expenses/ExpensesHubPage.tsx`

**Interfaces:**
- Consumes: `useExpenseMonthDetail(year, month)`, `useExpenseMonths(limit)` (Task 2); `EntryFormModal` (Task 5); `GlassCard`, `Spinner`.
- Produces: default-exported `ExpensesHubPage` (no props), rendered at `/expenses`.

- [ ] **Step 1: Create `src/modules/expenses/ExpensesHubPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Upload, Settings, Calendar } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useExpenseMonthDetail, useExpenseMonths } from '../../hooks/useExpenses'
import EntryFormModal from './EntryFormModal'

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ExpensesHubPage() {
  const navigate = useNavigate()
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  const [showEntryForm, setShowEntryForm] = useState(false)

  const monthQuery = useExpenseMonthDetail(curYear, curMonth)
  const historyQuery = useExpenseMonths(12)

  const detail = monthQuery.data
  const months = historyQuery.data ?? []
  const netSavings = detail?.net_savings ?? 0
  const totalIncome = detail?.total_income ?? 0
  const totalExpenses = detail?.total_expenses ?? 0
  const savingsRate = detail?.savings_rate ?? 0

  const donutData = (detail?.by_category ?? []).map(c => ({ name: c.label, value: c.total, color: c.color }))

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Expenses</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Monthly income, spending, and savings</p>
      </div>

      <GlassCard style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {MONTH_NAMES[curMonth - 1]} {curYear} · Net Savings
            </p>
            {monthQuery.isLoading ? <Spinner /> : (
              <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 30, color: netSavings >= 0 ? 'var(--accent-green)' : '#ef4444', marginTop: 6 }}>
                RM {fmt(netSavings)}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }} onClick={() => navigate('/expenses/import')}>
              <Upload size={14} /> Import
            </button>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={() => setShowEntryForm(true)}>
              <Plus size={14} /> Add Entry
            </button>
          </div>
        </div>
        {!monthQuery.isLoading && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--accent-green)' }}>↑ RM {fmt(totalIncome)}</span>
            <span style={{ fontSize: 13, color: '#ef4444' }}>↓ RM {fmt(totalExpenses)}</span>
            {totalIncome > 0 && (
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 999,
                background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)',
              }}>
                {savingsRate}% savings rate
              </span>
            )}
          </div>
        )}
      </GlassCard>

      {donutData.length > 0 && (
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Spending by Category</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(v: number) => `RM ${fmt(v)}`} contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {donutData.map((d, i) => {
                const pct = totalExpenses > 0 ? Math.round((d.value / totalExpenses) * 100) : 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>RM {fmt(d.value)}</span>
                    <span style={{ color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Month History</p>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }} onClick={() => navigate('/expenses/categories')}>
          <Settings size={13} /> Categories
        </button>
      </div>

      {historyQuery.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
      ) : months.length === 0 ? (
        <GlassCard style={{ padding: '30px', textAlign: 'center' }}>
          <Calendar size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No expense data yet. Add an entry to get started.</p>
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: '8px' }}>
          {months.map((m, i) => {
            const rate = m.total_income > 0 ? Math.round((m.net_savings / m.total_income) * 100) : 0
            return (
              <div
                key={m.id}
                onClick={() => navigate(`/expenses/${m.year}/${m.month}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', cursor: 'pointer',
                  borderBottom: i < months.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{MONTH_NAMES[m.month - 1]} {m.year}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>RM {fmt(m.total_expenses)} spent · {m.entry_count} entries</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: m.net_savings >= 0 ? 'var(--accent-green)' : '#ef4444' }}>
                    {m.net_savings >= 0 ? '+' : ''}RM {fmt(m.net_savings)}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rate}% savings rate</p>
                </div>
              </div>
            )
          })}
        </GlassCard>
      )}

      {showEntryForm && <EntryFormModal year={curYear} month={curMonth} onClose={() => setShowEntryForm(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/expenses/ExpensesHubPage.tsx
git commit -m "Add Expenses hub page with hero, donut chart, and month history"
```

---

### Task 7: Month Detail page

**Files:**
- Create: `src/modules/expenses/MonthDetailPage.tsx`

**Interfaces:**
- Consumes: `useExpenseMonthDetail`, `useExpenseEntries`, `useUpdateMonthNotes`, `useMoveMonth`, `useGenerateInsight` (Task 2); `EntryFormModal` (Task 5); `getCategoryIcon` (Task 3); `GlassCard`, `Spinner`.
- Produces: default-exported `MonthDetailPage` (no props), rendered at `/expenses/:year/:month`.

- [ ] **Step 1: Create `src/modules/expenses/MonthDetailPage.tsx`**

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2, Plus, Lightbulb, ArrowLeftRight } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import {
  useExpenseMonthDetail, useExpenseEntries, useUpdateMonthNotes, useMoveMonth, useGenerateInsight, useDeleteEntry,
} from '../../hooks/useExpenses'
import { getCategoryIcon } from './ionicons-map'
import EntryFormModal from './EntryFormModal'
import type { ExpenseEntry } from '../../types/expenses'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MonthDetailPage() {
  const { year: yearParam, month: monthParam } = useParams<{ year: string; month: string }>()
  const year = parseInt(yearParam ?? '0')
  const month = parseInt(monthParam ?? '0')
  const navigate = useNavigate()

  const detailQuery = useExpenseMonthDetail(year, month)
  const entriesQuery = useExpenseEntries(year, month)
  const updateNotes = useUpdateMonthNotes(year, month)
  const moveMonth = useMoveMonth(year, month)
  const generateInsight = useGenerateInsight(year, month)
  const deleteEntry = useDeleteEntry(year, month)

  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveYear, setMoveYear] = useState(year)
  const [moveMonthNum, setMoveMonthNum] = useState(month)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | undefined>(undefined)

  const detail = detailQuery.data
  const entries = entriesQuery.data ?? []
  const incomeEntries = entries.filter(e => e.entry_type === 'income')
  const expenseEntries = entries.filter(e => e.entry_type === 'expense')
  const maxCatTotal = Math.max(1, ...(detail?.by_category ?? []).map(c => c.total))

  function startEditNotes() {
    setNotesInput(detail?.notes ?? '')
    setEditingNotes(true)
  }
  function saveNotes() {
    updateNotes.mutate(notesInput || null)
    setEditingNotes(false)
  }

  function shiftMoveMonth(delta: number) {
    let m = moveMonthNum + delta
    let y = moveYear
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMoveMonthNum(m)
    setMoveYear(y)
  }

  async function confirmMove() {
    await moveMonth.mutateAsync({ toYear: moveYear, toMonth: moveMonthNum })
    navigate('/expenses')
  }

  function openEntry(e?: ExpenseEntry) {
    setEditingEntry(e)
    setShowEntryForm(true)
  }

  if (detailQuery.isLoading || !detail) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => navigate('/expenses')}>
          <ChevronLeft size={16} />
        </button>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>
          {MONTH_NAMES[month - 1]} {year}
        </h1>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }} onClick={() => setShowMoveModal(true)}>
          <ArrowLeftRight size={13} /> Move to month
        </button>
      </div>

      <GlassCard style={{ padding: '16px 18px' }}>
        {editingNotes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              autoFocus
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-active)', borderRadius: 8,
                padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', minHeight: 60, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setEditingNotes(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveNotes}>Save</button>
            </div>
          </div>
        ) : (
          <p
            onClick={startEditNotes}
            style={{ fontSize: 13, color: detail.notes ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: detail.notes ? 'normal' : 'italic', cursor: 'pointer' }}
          >
            {detail.notes || 'Tap to add a note...'}
          </p>
        )}
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <GlassCard style={{ padding: '16px 18px', background: 'rgba(16,185,129,0.06)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Income</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: 'var(--accent-green)', marginTop: 4 }}>RM {fmt(detail.total_income)}</p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 18px', background: 'rgba(239,68,68,0.06)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expenses</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: '#ef4444', marginTop: 4 }}>RM {fmt(detail.total_expenses)}</p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: detail.net_savings >= 0 ? 'var(--accent-green)' : '#ef4444', marginTop: 4 }}>
            RM {fmt(detail.net_savings)}
          </p>
        </GlassCard>
      </div>

      {detail.by_category.length > 0 && (
        <GlassCard style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Category Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {detail.by_category.map(c => {
              const Icon = getCategoryIcon(c.icon)
              const pct = detail.total_expenses > 0 ? Math.round((c.total / detail.total_expenses) * 100) : 0
              const barWidth = Math.max(2, (c.total / maxCatTotal) * 100)
              return (
                <div key={c.category_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                      <Icon size={13} color={c.color} /> {c.label}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>RM {fmt(c.total)} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 3, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      <GlassCard style={{ padding: '16px 20px', borderLeft: '3px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Lightbulb size={15} color="#f59e0b" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Insight</span>
        </div>
        {generateInsight.isPending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner size={14} /> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating insight...</span></div>
        ) : detail.insight ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{detail.insight}</p>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 0' }} onClick={() => generateInsight.mutate()}>Refresh insight</button>
          </>
        ) : (
          <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => generateInsight.mutate()}>Generate Insight</button>
        )}
      </GlassCard>

      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Income</p>
        {incomeEntries.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No income entries.</p>
        ) : (
          <GlassCard style={{ padding: '8px' }}>
            {incomeEntries.map((e, i) => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                borderBottom: i < incomeEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.label}</p>
                  {e.entry_date && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.entry_date.slice(0, 10)}</p>}
                  {e.original_amount != null && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>SGD {fmt(e.original_amount)} @ {e.exchange_rate?.toFixed(4)}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--accent-green)' }}>+RM {fmt(e.amount)}</span>
                  <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEntry(e)}><Pencil size={13} /></button>
                  <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => { if (confirm(`Delete "${e.label}"?`)) deleteEntry.mutate(e.id) }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Expenses</p>
        {expenseEntries.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No expense entries.</p>
        ) : (
          <GlassCard style={{ padding: '8px' }}>
            {expenseEntries.map((e, i) => {
              const Icon = getCategoryIcon(e.category_icon ?? 'ellipsis-horizontal-circle-outline')
              return (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                  borderBottom: i < expenseEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${e.category_color ?? '#95A5A6'}22`,
                    }}>
                      <Icon size={13} color={e.category_color ?? '#95A5A6'} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {e.category_label}{e.entry_date ? ` · ${e.entry_date.slice(0, 10)}` : ''}
                      </p>
                      {e.original_amount != null && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>SGD {fmt(e.original_amount)} @ {e.exchange_rate?.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: '#ef4444' }}>-RM {fmt(e.amount)}</span>
                    <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEntry(e)}><Pencil size={13} /></button>
                    <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => { if (confirm(`Delete "${e.label}"?`)) deleteEntry.mutate(e.id) }}><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
          </GlassCard>
        )}
      </div>

      <button
        className="btn-primary"
        style={{
          position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
        onClick={() => openEntry(undefined)}
      >
        <Plus size={20} />
      </button>

      {showEntryForm && <EntryFormModal year={year} month={month} entry={editingEntry} onClose={() => setShowEntryForm(false)} />}

      {showMoveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowMoveModal(false)}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14,
            padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Move all entries to</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              <button className="btn-ghost" onClick={() => shiftMoveMonth(-1)}>‹</button>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 15 }}>{MONTH_NAMES[moveMonthNum - 1]} {moveYear}</span>
              <button className="btn-ghost" onClick={() => shiftMoveMonth(1)}>›</button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowMoveModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={moveYear === year && moveMonthNum === month || moveMonth.isPending}
                onClick={confirmMove}
              >
                {moveMonth.isPending ? 'Moving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/expenses/MonthDetailPage.tsx
git commit -m "Add Month Detail page with notes, category bars, entries, and AI insight"
```

---

### Task 8: PDF Import page

**Files:**
- Create: `src/modules/expenses/ImportPage.tsx`

**Interfaces:**
- Consumes: `useImportPreview()`, `useImportConfirm()`, `useExpenseCategories()` (Task 2); `getCategoryIcon` (not required — this page uses a plain `<select>` for category, no icons needed); `GlassCard`, `Spinner`.
- Produces: default-exported `ImportPage` (no props), rendered at `/expenses/import`.

- [ ] **Step 1: Create `src/modules/expenses/ImportPage.tsx`**

```tsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useImportPreview, useImportConfirm, useExpenseCategories } from '../../hooks/useExpenses'
import type { DraftTransaction } from '../../types/expenses'

type Stage = 'idle' | 'uploading' | 'reviewing' | 'confirming' | 'done' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  NO_FILE: 'No file uploaded',
  WRONG_PASSWORD: 'Incorrect PDF password. Please check and try again.',
  ENCRYPTED_PDF: 'This PDF is password-protected. Enter the password and try again.',
  EXTRACT_FAILED: 'Failed to extract text from PDF',
  SCAN_PDF: 'This PDF appears to be image-scanned. Please use a text-based statement export.',
  CLAUDE_FAILED: 'AI parsing failed. Please try again.',
  PARSE_FAILED: 'Could not parse AI output as JSON',
  NO_TRANSACTIONS: 'No transactions were found in this statement',
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: categories = [] } = useExpenseCategories()
  const preview = useImportPreview()
  const confirmImport = useImportConfirm()

  const [stage, setStage] = useState<Stage>('idle')
  const [password, setPassword] = useState('')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<DraftTransaction[]>([])
  const [meta, setMeta] = useState<{ total_parsed: number; text_truncated: boolean; skipped_rows: number } | null>(null)
  const [overrideYear, setOverrideYear] = useState<number | null>(null)
  const [overrideMonth, setOverrideMonth] = useState<number | null>(null)
  const [result, setResult] = useState<{ inserted: number; skipped: number; months_touched: string[] } | null>(null)

  async function handleFileSelected(file: File) {
    setStage('uploading')
    setErrorCode(null)
    try {
      const res = await preview.mutateAsync({ file, password: password || undefined })
      setTransactions(res.transactions)
      setMeta({ total_parsed: res.total_parsed, text_truncated: res.text_truncated, skipped_rows: res.skipped_rows })
      if (res.statement_month) {
        const [y, m] = res.statement_month.split('-').map(Number)
        setOverrideYear(y)
        setOverrideMonth(m)
      }
      setStage('reviewing')
    } catch (err: any) {
      const code = err?.response?.data?.error ?? 'EXTRACT_FAILED'
      setErrorCode(code)
      setStage('error')
    }
  }

  function updateTransaction(id: string, patch: Partial<DraftTransaction>) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  async function handleConfirm() {
    setStage('confirming')
    try {
      const res = await confirmImport.mutateAsync({
        transactions,
        overrideYear: overrideYear ?? undefined,
        overrideMonth: overrideMonth ?? undefined,
      })
      setResult(res)
      setStage('done')
    } catch (err: any) {
      const code = err?.response?.data?.error ?? 'EXTRACT_FAILED'
      setErrorCode(code)
      setStage('error')
    }
  }

  function reset() {
    setStage('idle')
    setTransactions([])
    setMeta(null)
    setResult(null)
    setErrorCode(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => navigate('/expenses')}>
          <ChevronLeft size={16} />
        </button>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Import Statement</h1>
      </div>

      {(stage === 'idle' || stage === 'error') && (
        <GlassCard style={{ padding: '24px' }}>
          {stage === 'error' && errorCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', marginBottom: 16 }}>
              <AlertTriangle size={15} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#ef4444' }}>{ERROR_MESSAGES[errorCode] ?? 'Import failed'}</span>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Upload a PDF credit card statement. AI will extract and categorize transactions for review before import.
          </p>
          {(errorCode === 'ENCRYPTED_PDF' || errorCode === 'WRONG_PASSWORD') && (
            <input
              type="password"
              placeholder="PDF password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', width: '100%', marginBottom: 12,
              }}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f) }}
          />
        </GlassCard>
      )}

      {stage === 'uploading' && (
        <GlassCard style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spinner size={24} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Parsing statement...</span>
        </GlassCard>
      )}

      {stage === 'reviewing' && meta && (
        <>
          <GlassCard style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {meta.total_parsed} transactions parsed{meta.skipped_rows > 0 ? `, ${meta.skipped_rows} rows skipped` : ''}
              {meta.text_truncated ? ' — statement was long, only part of it was parsed' : ''}
            </p>
          </GlassCard>

          <GlassCard style={{ padding: '14px 18px' }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Import all into month</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn-ghost" onClick={() => {
                let m = (overrideMonth ?? new Date().getMonth() + 1) - 1
                let y = overrideYear ?? new Date().getFullYear()
                if (m < 1) { m = 12; y -= 1 }
                setOverrideMonth(m); setOverrideYear(y)
              }}>‹</button>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14 }}>
                {MONTH_NAMES[(overrideMonth ?? new Date().getMonth() + 1) - 1]} {overrideYear ?? new Date().getFullYear()}
              </span>
              <button className="btn-ghost" onClick={() => {
                let m = (overrideMonth ?? new Date().getMonth() + 1) + 1
                let y = overrideYear ?? new Date().getFullYear()
                if (m > 12) { m = 1; y += 1 }
                setOverrideMonth(m); setOverrideYear(y)
              }}>›</button>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['', 'Date', 'Label', 'Amount', 'Currency', 'Category', ''].map(h => (
                    <th key={h} style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: t.excluded ? 0.4 : 1 }}>
                    <td style={{ padding: '6px 8px' }}>
                      <input type="checkbox" checked={!t.excluded} onChange={e => updateTransaction(t.id, { excluded: !e.target.checked })} />
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{t.entry_date ?? '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        value={t.label}
                        onChange={e => updateTransaction(t.id, { label: e.target.value })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'IBM Plex Mono' }}>{fmt(t.amount)}</td>
                    <td style={{ padding: '6px 8px' }}>{t.currency}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        value={t.category_slug}
                        onChange={e => {
                          const cat = categories.find(c => c.slug === e.target.value)
                          updateTransaction(t.id, {
                            category_slug: e.target.value,
                            category_id: cat?.id ?? null,
                            category_label: cat?.label ?? t.category_label,
                            category_color: cat?.color ?? t.category_color,
                          })
                        }}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '3px 6px' }}
                      >
                        {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {t.parse_confidence === 'low' && (
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>low confidence</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={reset}>Cancel</button>
            <button className="btn-primary" onClick={handleConfirm} disabled={transactions.every(t => t.excluded)}>
              Import {transactions.filter(t => !t.excluded).length} Transactions
            </button>
          </div>
        </>
      )}

      {stage === 'confirming' && (
        <GlassCard style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spinner size={24} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Importing transactions...</span>
        </GlassCard>
      )}

      {stage === 'done' && result && (
        <GlassCard style={{ padding: '24px' }}>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>
            {result.inserted} entries added{result.skipped > 0 ? `, ${result.skipped} duplicates skipped` : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {result.months_touched.map(ym => {
              const [y, m] = ym.split('-').map(Number)
              return (
                <button key={ym} className="btn-ghost" style={{ textAlign: 'left', fontSize: 12 }} onClick={() => navigate(`/expenses/${y}/${m}`)}>
                  View {MONTH_NAMES[m - 1]} {y}
                </button>
              )
            })}
          </div>
          <button className="btn-primary" onClick={() => navigate('/expenses')}>Back to Expenses</button>
        </GlassCard>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/expenses/ImportPage.tsx
git commit -m "Add PDF statement import wizard"
```

---

### Task 9: Routing, nav wiring, and manual verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `ExpensesHubPage` (Task 6), `MonthDetailPage` (Task 7), `CategoriesPage` (Task 4), `ImportPage` (Task 8).

- [ ] **Step 1: Add imports and routes to `src/App.tsx`**

Add the imports near the other module imports (after the `NetWorthPage` import):
```tsx
import ExpensesHubPage from './modules/expenses/ExpensesHubPage'
import MonthDetailPage from './modules/expenses/MonthDetailPage'
import CategoriesPage from './modules/expenses/CategoriesPage'
import ImportPage from './modules/expenses/ImportPage'
```

Add the routes inside the `<Routes>` block, after `/net-worth`:
```tsx
        <Route path="/expenses" element={<ExpensesHubPage />} />
        <Route path="/expenses/categories" element={<CategoriesPage />} />
        <Route path="/expenses/import" element={<ImportPage />} />
        <Route path="/expenses/:year/:month" element={<MonthDetailPage />} />
```

Note: React Router v6 ranks static path segments over dynamic ones (`:year`/`:month`) regardless of declaration order, so `/expenses/categories` and `/expenses/import` will always match correctly even though `/expenses/:year/:month` is also present. Listing the static routes first (as above) simply matches the existing convention in this file (e.g. `/quant/signals` declared alongside `/quant`).

- [ ] **Step 2: Add the nav entry to `src/components/Layout.tsx`**

Add `Receipt` to the `lucide-react` import (current import line is `import { CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut, SplitSquareVertical, BarChart2, Wrench, Wallet } from 'lucide-react'`):
```tsx
import { CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut, SplitSquareVertical, BarChart2, Wrench, Wallet, Receipt } from 'lucide-react'
```

Add the entry to the `NAV` array, after Net Worth:
```tsx
  { to: '/expenses',   label: 'Expenses', icon: Receipt },
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "Wire Expenses module into routing and navigation"
```

- [ ] **Step 5: Manual verification — full flow**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`, open the app, log in, click the new Expenses nav icon.

Expected:
- **Hub**: current-month hero renders (net savings, income/expenses, savings rate), donut chart appears if the current month has expense entries (or is absent if none), month history list shows past months with entries and navigates to Month Detail on click.
- **Add entry**: click + Add Entry, create a test expense (e.g. label "Test Lunch", category "Food & Dining", amount 25, MYR) — confirm it appears; create a test income entry (e.g. "Test Salary", amount 1000); create a test SGD expense and confirm the rate-conversion hint appears and the stored amount reflects the MYR conversion.
- **Month Detail**: navigate to the current month, confirm summary strip, category bars, and both entry lists render; edit the notes field and confirm it persists on reload; click "Generate Insight" and confirm text appears (may take up to a minute — Claude CLI call); edit and delete the test entries created above via the entry modal.
- **Move to month**: on a month with entries, click "Move to month", pick a different month, confirm, verify entries moved and the page navigates back to the hub.
- **Categories**: navigate to Categories via the gear icon, add a test category (custom label/icon/color), confirm it appears in both the manager list and the Entry Form's category picker; reorder it via the up/down chevrons; edit it; delete it (soft-delete, confirm it disappears from the list).
- **PDF Import**: navigate to Import, upload a real PDF bank/credit-card statement, confirm the review table populates with parsed transactions; edit one row's category and label, exclude another row; confirm import and verify the summary shows correct inserted/skipped counts and the entries appear in the target month; re-upload the same file and confirm duplicates are skipped on the second run.
- Reload the page — nav icon and all four routes persist correctly.

Stop the dev server once confirmed.

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — routes/nav (Task 9), data model + API client (Task 1), hooks (Task 2), icon mapping (Task 3), Categories page + modal (Task 4), Entry form modal (Task 5), Hub page (Task 6), Month Detail page (Task 7), PDF Import (Task 8). The "no Savings Goal cross-link" and "client-side parseFloat only" constraints are honored by omission (no such UI exists in any task) and by the `parseEntry` helper in Task 1, respectively.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `ExpenseCategory`, `ExpenseMonthSummary`, `ExpenseMonthDetail`, `ExpenseEntry`/`ExpenseEntryRaw`, `DraftTransaction` are defined once in Task 1 and imported with identical field names everywhere they're consumed (Tasks 3-9). Hook names (`useExpenseMonthDetail`, `useExpenseEntries`, etc.) match between Task 2's definitions and every later task's imports. `PRESET_ICONS`/`PRESET_COLORS`/`getCategoryIcon` from Task 3 are used identically in Tasks 4, 5, and 7.
