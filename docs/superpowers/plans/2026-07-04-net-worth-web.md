# Net Worth (Assets + Loans) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the mobile app's Net Worth tracker (dashboard, asset CRUD, loan CRUD with payoff simulator and amortization schedule) to `smiley-web`, full feature parity, backend unchanged.

**Architecture:** Frontend-only addition to `smiley-web` (React + TypeScript + Vite + TanStack Query). One route `/net-worth` renders `NetWorthPage`, a tab shell (Dashboard | Assets | Loans) that mirrors `TripDetailPage.tsx`'s exact pattern. Each tab is its own component under `modules/networth/tabs/`, backed by a shared `hooks/useNetworth.ts` and `api/networth.ts` that call the existing `smiley-mobile/api` `assets`/`loans` routes.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, axios, `lucide-react`, Recharts, inline `style={{...}}` objects + CSS custom properties (no CSS-in-JS library, no Tailwind — existing project convention).

## Global Constraints

- No backend changes — consume `smiley-mobile/api`'s existing `/assets/*` and `/loans/*` routes as-is.
- No test framework exists in `smiley-web` (confirmed absent) — verification is `npx tsc --noEmit` plus manual dev-server checks. Do not add a test framework as part of this work.
- Delete confirmations use plain `window.confirm(...)` — this codebase has no modal-based confirm component (verified across `TripsPage`, `TourDetailPage`, `ChatTab`, `AccommodationTab`, `ItineraryTab`, `PackingTab`, `MailPage`, `ParticipantPage`).
- Currency options for assets are exactly: `['MYR', 'SGD', 'USD', 'GBP', 'EUR', 'JPY', 'AUD']` (matches mobile's `asset-form.tsx` `CURRENCIES` constant), default `MYR`.
- Asset types are exactly: `property`, `vehicle`, `cash`, `investment`, `epf`, `fd`, `crypto`, `other`.
- Loan types are exactly: `home`, `car`, `personal`, `other`.
- Depreciation types are exactly: `manual`, `straight_line`, `declining_balance`.
- Single nav entry `/net-worth` with internal tabs — do not add three separate top-level nav icons.
- Out of scope: expense-logging quick actions, Savings Goals, Financial Advisor, nav "More" overflow restructure — all separate sub-projects.

---

## File Structure

```
src/
  types/networth.ts              # CREATE: Asset, Loan, NetWorthSummary, NetWorthHistoryPoint, PayoffResult, AmortizationRow
  api/networth.ts                # CREATE: networthApi client functions
  hooks/useNetworth.ts           # CREATE: React Query hooks
  modules/networth/
    NetWorthPage.tsx              # CREATE: tab shell
    AssetFormModal.tsx            # CREATE: asset create/edit modal
    LoanFormModal.tsx             # CREATE: loan create/edit modal
    tabs/
      DashboardTab.tsx            # CREATE: summary + chart + breakdown + insight
      AssetsTab.tsx                # CREATE: asset table + inline value edit
      LoansTab.tsx                 # CREATE: loan table + payoff + amortization + payment log
  App.tsx                         # MODIFY: add /net-worth route
  components/Layout.tsx           # MODIFY: add Net Worth nav entry
```

**Interfaces produced/consumed across tasks:**
- `Asset`, `Loan`, `NetWorthSummary`, `NetWorthHistoryPoint`, `PayoffResult`, `AmortizationRow`, `AssetType`, `LoanType`, `DepreciationType` — defined in `types/networth.ts` (Task 1), used everywhere.
- `networthApi.{getAssets,getAssetsSummary,getNetworthHistory,createAsset,updateAsset,updateAssetValue,deleteAsset,getLoans,createLoan,updateLoan,deleteLoan,logLoanPayment,getLoanPayoff,getLoanAmortization}` — defined in `api/networth.ts` (Task 1).
- `useAssets()`, `useAssetsSummary()`, `useNetworthHistory(days)`, `useCreateAsset()`, `useUpdateAsset()`, `useUpdateAssetValue()`, `useDeleteAsset()`, `useLoans()`, `useCreateLoan()`, `useUpdateLoan()`, `useDeleteLoan()`, `useLogLoanPayment()`, `useLoanPayoff(id, extraMonthly)`, `useLoanAmortization(id, enabled)` — defined in `hooks/useNetworth.ts` (Task 2).
- `AssetFormModal({ asset?: Asset; onClose: () => void })` (Task 4), `LoanFormModal({ loan?: Loan; onClose: () => void })` (Task 6) — default exports, consumed by their respective tabs.

---

### Task 1: Types + API client

**Files:**
- Create: `src/types/networth.ts`
- Create: `src/api/networth.ts`

**Interfaces:**
- Produces: all types listed above, `networthApi` object with all 14 functions.

- [ ] **Step 1: Create `src/types/networth.ts`**

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

- [ ] **Step 2: Create `src/api/networth.ts`**

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

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors from `types/networth.ts` or `api/networth.ts`.

---

### Task 2: React Query hooks

**Files:**
- Create: `src/hooks/useNetworth.ts`

**Interfaces:**
- Consumes: `networthApi` (Task 1), all types (Task 1).
- Produces: all 13 hooks listed in the file-structure interfaces section.

- [ ] **Step 1: Create `src/hooks/useNetworth.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { networthApi } from '../api/networth'
import type { Asset, Loan } from '../types/networth'

export function useAssets() {
  return useQuery({ queryKey: ['assets'], queryFn: networthApi.getAssets })
}

export function useAssetsSummary() {
  return useQuery({ queryKey: ['assets', 'summary'], queryFn: networthApi.getAssetsSummary, refetchInterval: 300_000 })
}

export function useNetworthHistory(days: number) {
  return useQuery({
    queryKey: ['assets', 'networth-history', days],
    queryFn: () => networthApi.getNetworthHistory(days),
    refetchInterval: 300_000,
  })
}

function invalidateAssetQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['assets'] })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Asset>) => networthApi.createAsset(data),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) => networthApi.updateAsset(id, data),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useUpdateAssetValue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) => networthApi.updateAssetValue(id, value),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => networthApi.deleteAsset(id),
    onSuccess: () => invalidateAssetQueries(qc),
  })
}

export function useLoans() {
  return useQuery({ queryKey: ['loans'], queryFn: networthApi.getLoans })
}

function invalidateLoanQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['loans'] })
  qc.invalidateQueries({ queryKey: ['assets', 'summary'] })
}

export function useCreateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Loan>) => networthApi.createLoan(data),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useUpdateLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Loan> }) => networthApi.updateLoan(id, data),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useDeleteLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => networthApi.deleteLoan(id),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useLogLoanPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) => networthApi.logLoanPayment(id, amount),
    onSuccess: () => invalidateLoanQueries(qc),
  })
}

export function useLoanPayoff(id: number, extraMonthly: number) {
  return useQuery({
    queryKey: ['loans', id, 'payoff', extraMonthly],
    queryFn: () => networthApi.getLoanPayoff(id, extraMonthly),
    enabled: !!id,
  })
}

export function useLoanAmortization(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['loans', id, 'amortization'],
    queryFn: () => networthApi.getLoanAmortization(id),
    enabled: enabled && !!id,
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

---

### Task 3: Dashboard tab

**Files:**
- Create: `src/modules/networth/tabs/DashboardTab.tsx`

**Interfaces:**
- Consumes: `useAssetsSummary()`, `useNetworthHistory(days)` (Task 2); `GlassCard` (`components/GlassCard.tsx`); `Spinner` (`components/Spinner.tsx`); Recharts (`AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer` — already a project dependency, used identically in `modules/rates/RatesPage.tsx`).
- Produces: default-exported `DashboardTab` component (no props), rendered by `NetWorthPage.tsx` (Task 8).

- [ ] **Step 1: Create `src/modules/networth/tabs/DashboardTab.tsx`**

```tsx
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useAssetsSummary, useNetworthHistory } from '../../../hooks/useNetworth'

const PERIODS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
]

const ASSET_TYPE_LABELS: Record<string, string> = {
  property: 'Property',
  vehicle: 'Vehicle',
  cash: 'Cash',
  investment: 'Investment',
  epf: 'EPF / KWSP',
  fd: 'Fixed Deposit',
  crypto: 'Crypto',
  other: 'Other',
}

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function DashboardTab() {
  const [periodIdx, setPeriodIdx] = useState(1)
  const { days } = PERIODS[periodIdx]
  const summaryQuery = useAssetsSummary()
  const historyQuery = useNetworthHistory(days)

  const summary = summaryQuery.data
  const history = historyQuery.data ?? []

  const chartData = history.map(h => ({
    date: format(parseISO(h.snapshot_date), 'MMM d'),
    value: h.net_worth_myr,
  }))

  const deltaAbs = chartData.length >= 2 ? chartData[chartData.length - 1].value - chartData[0].value : null
  const deltaColor = deltaAbs == null ? 'var(--text-muted)' : deltaAbs >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'

  const breakdownEntries = Object.entries(summary?.assets_by_type ?? {}).sort(([, a], [, b]) => b - a)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Net Worth</p>
          {summaryQuery.isLoading ? <Spinner /> : (
            <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 28, color: 'var(--accent-green)' }}>
              RM {fmt(summary?.net_worth_myr ?? 0)}
            </p>
          )}
        </GlassCard>
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Total Assets</p>
          {summaryQuery.isLoading ? <Spinner /> : (
            <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 22, color: 'var(--text-primary)' }}>
              RM {fmt(summary?.total_assets_myr ?? 0)}
            </p>
          )}
        </GlassCard>
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Total Liabilities</p>
          {summaryQuery.isLoading ? <Spinner /> : (
            <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 22, color: 'var(--text-primary)' }}>
              RM {fmt(summary?.total_liabilities_myr ?? 0)}
            </p>
          )}
        </GlassCard>
      </div>

      <GlassCard style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Timeline</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map((p, i) => (
              <button key={p.label} onClick={() => setPeriodIdx(i)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${periodIdx === i ? 'var(--border-active)' : 'var(--border)'}`,
                background: periodIdx === i ? 'var(--accent-cyan-dim)' : 'transparent',
                color: periodIdx === i ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {deltaAbs !== null && (
          <p style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', color: deltaColor, marginBottom: 10 }}>
            {deltaAbs >= 0 ? '+' : ''}RM {fmt(Math.abs(deltaAbs))} vs {PERIODS[periodIdx].label} ago
          </p>
        )}
        {historyQuery.isLoading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} formatter={(v: number) => [`RM ${fmt(v)}`, 'Net Worth']} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#netWorthGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No history yet</span>
          </div>
        )}
      </GlassCard>

      {breakdownEntries.length > 0 && (
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Assets by Type</p>
          {breakdownEntries.map(([type, val]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ASSET_TYPE_LABELS[type] ?? type}</span>
              <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--text-primary)' }}>RM {fmt(val)}</span>
            </div>
          ))}
        </GlassCard>
      )}

      {summary?.insight && (
        <GlassCard style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>{summary.insight}</p>
        </GlassCard>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

---

### Task 4: Asset form modal

**Files:**
- Create: `src/modules/networth/AssetFormModal.tsx`

**Interfaces:**
- Consumes: `Asset`, `AssetType`, `DepreciationType` (Task 1); `useCreateAsset()`, `useUpdateAsset()` (Task 2).
- Produces: default-exported `AssetFormModal({ asset, onClose }: { asset?: Asset; onClose: () => void })`, consumed by `AssetsTab.tsx` (Task 5).

- [ ] **Step 1: Create `src/modules/networth/AssetFormModal.tsx`**

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateAsset, useUpdateAsset } from '../../hooks/useNetworth'
import type { Asset, AssetType, DepreciationType } from '../../types/networth'

const CURRENCIES = ['MYR', 'SGD', 'USD', 'GBP', 'EUR', 'JPY', 'AUD'] as const
const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'property', label: 'Property' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'epf', label: 'EPF / KWSP' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]
const DEPRECIATION_TYPES: { value: DepreciationType; label: string }[] = [
  { value: 'manual', label: 'Manual (I update value myself)' },
  { value: 'straight_line', label: 'Straight-line' },
  { value: 'declining_balance', label: 'Declining balance' },
]

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

export default function AssetFormModal({ asset, onClose }: { asset?: Asset; onClose: () => void }) {
  const create = useCreateAsset()
  const update = useUpdateAsset()
  const isEdit = !!asset

  const [name, setName] = useState(asset?.name ?? '')
  const [assetType, setAssetType] = useState<AssetType>(asset?.asset_type ?? 'cash')
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>((asset?.currency as any) ?? 'MYR')
  const [value, setValue] = useState(asset ? String(asset.value) : '')
  const [institution, setInstitution] = useState(asset?.institution ?? '')
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [purchasePrice, setPurchasePrice] = useState(asset?.purchase_price != null ? String(asset.purchase_price) : '')
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchase_date?.slice(0, 10) ?? '')
  const [depreciationType, setDepreciationType] = useState<DepreciationType>(asset?.depreciation_type ?? 'manual')

  const loading = create.isPending || update.isPending
  const valid = name.trim() && value !== '' && !isNaN(parseFloat(value))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: Partial<Asset> = {
      name: name.trim(),
      asset_type: assetType,
      currency,
      value: parseFloat(value),
      institution: institution.trim() || null,
      notes: notes.trim() || null,
      purchase_price: assetType === 'vehicle' && purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_date: assetType === 'vehicle' && purchaseDate ? purchaseDate : null,
      depreciation_type: assetType === 'vehicle' ? depreciationType : null,
    }
    if (isEdit && asset) {
      await update.mutateAsync({ id: asset.id, data })
    } else {
      await create.mutateAsync(data)
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
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Asset' : 'New Asset'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inputStyle} placeholder="Asset name *" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <div>
            <label style={labelStyle}>Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={assetType} onChange={e => setAssetType(e.target.value as AssetType)}>
              {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Currency</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={currency} onChange={e => setCurrency(e.target.value as any)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Value *</label>
              <input type="number" style={inputStyle} placeholder="0.00" value={value} onChange={e => setValue(e.target.value)} />
            </div>
          </div>

          <input style={inputStyle} placeholder="Institution" value={institution} onChange={e => setInstitution(e.target.value)} />

          {assetType === 'vehicle' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Purchase price</label>
                  <input type="number" style={inputStyle} placeholder="0.00" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Purchase date</label>
                  <input type="date" style={inputStyle} value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Depreciation</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={depreciationType} onChange={e => setDepreciationType(e.target.value as DepreciationType)}>
                  {DEPRECIATION_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </>
          )}

          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !valid}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Asset'}
            </button>
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

---

### Task 5: Assets tab

**Files:**
- Create: `src/modules/networth/tabs/AssetsTab.tsx`

**Interfaces:**
- Consumes: `useAssets()`, `useDeleteAsset()`, `useUpdateAssetValue()` (Task 2); `AssetFormModal` (Task 4); `GlassCard`, `Spinner`.
- Produces: default-exported `AssetsTab` component (no props), rendered by `NetWorthPage.tsx` (Task 8).

- [ ] **Step 1: Create `src/modules/networth/tabs/AssetsTab.tsx`**

```tsx
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useAssets, useDeleteAsset, useUpdateAssetValue } from '../../../hooks/useNetworth'
import AssetFormModal from '../AssetFormModal'
import type { Asset } from '../../../types/networth'

const ASSET_TYPE_LABELS: Record<string, string> = {
  property: 'Property', vehicle: 'Vehicle', cash: 'Cash', investment: 'Investment',
  epf: 'EPF / KWSP', fd: 'Fixed Deposit', crypto: 'Crypto', other: 'Other',
}

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AssetsTab() {
  const { data: assets = [], isLoading } = useAssets()
  const deleteAsset = useDeleteAsset()
  const updateValue = useUpdateAssetValue()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Asset | undefined>(undefined)
  const [editingValueId, setEditingValueId] = useState<number | null>(null)
  const [valueInput, setValueInput] = useState('')

  function openCreate() { setEditing(undefined); setShowForm(true) }
  function openEdit(a: Asset) { setEditing(a); setShowForm(true) }

  function startValueEdit(a: Asset) {
    setEditingValueId(a.id)
    setValueInput(String(a.value))
  }

  function saveValueEdit(id: number) {
    const n = parseFloat(valueInput)
    if (isFinite(n) && n >= 0) {
      updateValue.mutate({ id, value: n })
    }
    setEditingValueId(null)
  }

  function confirmDelete(a: Asset) {
    if (confirm(`Remove "${a.name}"?`)) deleteAsset.mutate(a.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={openCreate}>
          <Plus size={14} /> New Asset
        </button>
      </div>

      <GlassCard style={{ padding: '12px 8px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
        ) : assets.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No assets yet. Click + New Asset to add one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Name', 'Type', 'Value', 'Institution', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: h === 'Name' ? 'left' : h === 'Actions' ? 'center' : 'right',
                      fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{a.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>
                      {editingValueId === a.id ? (
                        <input
                          autoFocus
                          type="number"
                          value={valueInput}
                          onChange={e => setValueInput(e.target.value)}
                          onBlur={() => saveValueEdit(a.id)}
                          onKeyDown={e => { if (e.key === 'Enter') saveValueEdit(a.id) }}
                          style={{
                            width: 100, padding: '4px 6px', borderRadius: 6, textAlign: 'right',
                            border: '1px solid var(--border-active)', background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
                          }}
                        />
                      ) : (
                        <span style={{ cursor: 'pointer' }} title="Click to edit" onClick={() => startValueEdit(a)}>
                          {a.currency !== 'MYR' && `${a.currency} ${fmt(a.current_value_local)} · `}
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>RM {fmt(a.current_value_myr)}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{a.institution ?? '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '4px 6px', marginRight: 4 }} onClick={() => openEdit(a)}><Pencil size={13} /></button>
                      <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => confirmDelete(a)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {showForm && <AssetFormModal asset={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

---

### Task 6: Loan form modal

**Files:**
- Create: `src/modules/networth/LoanFormModal.tsx`

**Interfaces:**
- Consumes: `Loan`, `LoanType` (Task 1); `useCreateLoan()`, `useUpdateLoan()` (Task 2); `useAssets()` (Task 2, for the linked-asset select).
- Produces: default-exported `LoanFormModal({ loan, onClose }: { loan?: Loan; onClose: () => void })`, consumed by `LoansTab.tsx` (Task 7).

- [ ] **Step 1: Create `src/modules/networth/LoanFormModal.tsx`**

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateLoan, useUpdateLoan, useAssets } from '../../hooks/useNetworth'
import type { Loan, LoanType } from '../../types/networth'

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

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

export default function LoanFormModal({ loan, onClose }: { loan?: Loan; onClose: () => void }) {
  const create = useCreateLoan()
  const update = useUpdateLoan()
  const { data: assets = [] } = useAssets()
  const isEdit = !!loan

  const [name, setName] = useState(loan?.name ?? '')
  const [loanType, setLoanType] = useState<LoanType>(loan?.loan_type ?? 'other')
  const [principal, setPrincipal] = useState(loan ? String(loan.principal) : '')
  const [outstanding, setOutstanding] = useState(loan ? String(loan.outstanding) : '')
  const [interestRate, setInterestRate] = useState(loan ? String(loan.interest_rate) : '')
  const [monthlyPayment, setMonthlyPayment] = useState(loan ? String(loan.monthly_payment) : '')
  const [startDate, setStartDate] = useState(loan?.start_date?.slice(0, 10) ?? '')
  const [dueDay, setDueDay] = useState(loan ? String(loan.due_day) : '1')
  const [linkedAssetId, setLinkedAssetId] = useState(loan?.linked_asset_id != null ? String(loan.linked_asset_id) : '')

  const loading = create.isPending || update.isPending
  const valid = name.trim() && principal && outstanding && interestRate !== '' && monthlyPayment && startDate && dueDay

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: Partial<Loan> = {
      name: name.trim(),
      loan_type: loanType,
      principal: parseFloat(principal),
      outstanding: parseFloat(outstanding),
      interest_rate: parseFloat(interestRate),
      monthly_payment: parseFloat(monthlyPayment),
      start_date: startDate,
      due_day: parseInt(dueDay, 10),
      linked_asset_id: linkedAssetId ? parseInt(linkedAssetId, 10) : null,
    }
    if (isEdit && loan) {
      await update.mutateAsync({ id: loan.id, data })
    } else {
      await create.mutateAsync(data)
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
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Loan' : 'New Loan'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inputStyle} placeholder="Loan name *" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <div>
            <label style={labelStyle}>Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={loanType} onChange={e => setLoanType(e.target.value as LoanType)}>
              {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Principal *</label>
              <input type="number" style={inputStyle} value={principal} onChange={e => setPrincipal(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Outstanding *</label>
              <input type="number" style={inputStyle} value={outstanding} onChange={e => setOutstanding(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Interest rate (annual, e.g. 0.045) *</label>
              <input type="number" step="0.0001" style={inputStyle} value={interestRate} onChange={e => setInterestRate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Monthly payment *</label>
              <input type="number" style={inputStyle} value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Start date *</label>
              <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Due day (1-31) *</label>
              <input type="number" min={1} max={31} style={inputStyle} value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Linked asset (optional)</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={linkedAssetId} onChange={e => setLinkedAssetId(e.target.value)}>
              <option value="">None</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !valid}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Loan'}
            </button>
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

---

### Task 7: Loans tab

**Files:**
- Create: `src/modules/networth/tabs/LoansTab.tsx`

**Interfaces:**
- Consumes: `useLoans()`, `useDeleteLoan()`, `useLogLoanPayment()`, `useLoanPayoff(id, extraMonthly)`, `useLoanAmortization(id, enabled)` (Task 2); `LoanFormModal` (Task 6); `GlassCard`, `Spinner`.
- Produces: default-exported `LoansTab` component (no props), rendered by `NetWorthPage.tsx` (Task 8).

- [ ] **Step 1: Create `src/modules/networth/tabs/LoansTab.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useLoans, useDeleteLoan, useLogLoanPayment, useLoanPayoff, useLoanAmortization } from '../../../hooks/useNetworth'
import LoanFormModal from '../LoanFormModal'
import type { Loan } from '../../../types/networth'

const LOAN_TYPE_LABELS: Record<string, string> = { home: 'Home Loan', car: 'Car Loan', personal: 'Personal', other: 'Other' }

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LoanRow({ loan, onEdit, onDelete }: { loan: Loan; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [extraInput, setExtraInput] = useState('0')
  const [extraMonthly, setExtraMonthly] = useState(0)
  const [showSchedule, setShowSchedule] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logPayment = useLogLoanPayment()

  const payoffQuery = useLoanPayoff(loan.id, extraMonthly)
  const amortQuery = useLoanAmortization(loan.id, showSchedule)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleExtraChange(value: string) {
    setExtraInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const n = Number(value)
      setExtraMonthly(isFinite(n) && n >= 0 ? n : 0)
    }, 400)
  }

  function handleLogPayment() {
    const amountStr = prompt(`Log payment for "${loan.name}" (MYR):`, String(loan.monthly_payment))
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (isFinite(amount) && amount > 0) logPayment.mutate({ id: loan.id, amount })
  }

  const payoff = payoffQuery.data

  return (
    <GlassCard style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{loan.name}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 999,
              background: loan.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
              color: loan.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
            }}>
              {loan.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {LOAN_TYPE_LABELS[loan.loan_type] ?? loan.loan_type} · {(loan.interest_rate * 100).toFixed(2)}% p.a.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>RM {fmt(loan.outstanding)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>RM {fmt(loan.monthly_payment)}/mo</div>
          </div>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={handleLogPayment}>Log Payment</button>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onEdit}><Pencil size={13} /></button>
          <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={onDelete}><Trash2 size={13} /></button>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Extra monthly payment (MYR)</label>
            <input
              type="number" min={0} value={extraInput} onChange={e => handleExtraChange(e.target.value)}
              style={{
                width: 100, padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
              }}
            />
            {payoffQuery.isFetching && <Spinner size={13} />}
          </div>

          {payoff && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Months to payoff</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: 'var(--text-primary)' }}>
                  {payoff.with_extra_months} {payoff.months_saved > 0 && <span style={{ color: 'var(--accent-green)', fontSize: 12 }}>(-{payoff.months_saved})</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interest saved</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: 'var(--accent-green)' }}>RM {fmt(payoff.interest_saved)}</div>
              </div>
            </div>
          )}

          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowSchedule(v => !v)}>
            {showSchedule ? 'Hide' : 'View'} Amortization Schedule
          </button>

          {showSchedule && (
            amortQuery.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner size={16} /></div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 10, maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Month', 'Date', 'Payment', 'Principal', 'Interest', 'Balance'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Month' ? 'left' : 'right', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(amortQuery.data ?? []).map(row => (
                      <tr key={row.month_num} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '5px 10px', color: 'var(--text-secondary)' }}>{row.month_num}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)' }}>{row.payment_date}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>{fmt(row.payment)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--accent-green)' }}>{fmt(row.principal)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--accent-red)' }}>{fmt(row.interest)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </GlassCard>
  )
}

export default function LoansTab() {
  const { data: loans = [], isLoading } = useLoans()
  const deleteLoan = useDeleteLoan()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Loan | undefined>(undefined)

  function openCreate() { setEditing(undefined); setShowForm(true) }
  function openEdit(l: Loan) { setEditing(l); setShowForm(true) }
  function confirmDelete(l: Loan) {
    if (confirm(`Remove "${l.name}"?`)) deleteLoan.mutate(l.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={openCreate}>
          <Plus size={14} /> New Loan
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
      ) : loans.length === 0 ? (
        <GlassCard style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No loans yet. Click + New Loan to add one.</span>
        </GlassCard>
      ) : (
        loans.map(l => <LoanRow key={l.id} loan={l} onEdit={() => openEdit(l)} onDelete={() => confirmDelete(l)} />)
      )}

      {showForm && <LoanFormModal loan={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

---

### Task 8: Tab shell, route, and nav wiring

**Files:**
- Create: `src/modules/networth/NetWorthPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `DashboardTab` (Task 3), `AssetsTab` (Task 5), `LoansTab` (Task 7).

- [ ] **Step 1: Create `src/modules/networth/NetWorthPage.tsx`**

```tsx
import { useState } from 'react'
import DashboardTab from './tabs/DashboardTab'
import AssetsTab from './tabs/AssetsTab'
import LoansTab from './tabs/LoansTab'

type Tab = 'dashboard' | 'assets' | 'loans'
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'assets', label: 'Assets' },
  { id: 'loans', label: 'Loans' },
]

export default function NetWorthPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Net Worth</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Assets, loans, and your overall position</p>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 2, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'Inter',
            background: tab === t.id ? 'var(--accent-cyan-dim)' : 'transparent',
            color: tab === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'assets' && <AssetsTab />}
      {tab === 'loans' && <LoansTab />}
    </div>
  )
}
```

- [ ] **Step 2: Add the route to `src/App.tsx`**

Add the import near the other module imports:
```tsx
import NetWorthPage from './modules/networth/NetWorthPage'
```

Add the route inside the `<Routes>` block, after `/rates`:
```tsx
        <Route path="/net-worth" element={<NetWorthPage />} />
```

- [ ] **Step 3: Add the nav entry to `src/components/Layout.tsx`**

Add `Wallet` to the `lucide-react` import (current import line is `import { CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut, SplitSquareVertical, BarChart2, Wrench } from 'lucide-react'`):
```tsx
import { CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut, SplitSquareVertical, BarChart2, Wrench, Wallet } from 'lucide-react'
```

Add the entry to the `NAV` array, after Rates:
```tsx
  { to: '/net-worth',  label: 'Net Worth', icon: Wallet },
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification — full flow**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`, open the app, log in, click the new Net Worth nav icon.

Expected:
- Dashboard tab shows net worth/assets/liabilities figures (real data from `ralysis`/`smileyapp` DB), a working 30d/90d/1y toggle, and a timeline chart (or "No history yet" if no snapshots exist).
- Assets tab: click + New Asset, create a test asset (e.g. name "Test Cash", type Cash, value 100), confirm it appears in the table; click the value cell, change it inline, confirm it persists on reload; edit the asset via the pencil icon; delete it via the trash icon (confirm dialog appears).
- Loans tab: click + New Loan, create a test loan (fill all required fields), confirm it appears; expand it, adjust the extra-payment input, confirm the months-saved/interest-saved figures update after ~0.5s; click View Amortization Schedule, confirm a table of monthly rows loads; delete the test loan.
- Reload the page — nav icon and route persist correctly on `/net-worth`.

Stop the dev server once confirmed.

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — routes/nav (Task 8), data model (Task 1), API client (Task 1), hooks (Task 2), Dashboard tab (Task 3), Assets tab (Tasks 4-5), Loans tab (Tasks 6-7), error handling (inherent in `isLoading`/optional-chaining guards throughout, no separate task needed since there's no dedicated error UI to build per the spec), testing (covered in Task 8 Step 5, consistent with the spec's manual-verification approach).
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `Asset`, `Loan`, `NetWorthSummary`, `PayoffResult`, `AmortizationRow` are defined once in Task 1 and imported with identical field names everywhere they're consumed (Tasks 3-8). Currency list, asset types, loan types, and depreciation types match the spec's Global Constraints verbatim across Tasks 4 and 6.
