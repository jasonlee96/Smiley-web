# Rate Transfer Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a "ready to transfer" banner on smiley-web's `/rates` page and a matching nav badge, driven by the existing `smiley-api` FX decision engine (`GET /rates/recommendation`).

**Architecture:** Frontend-only addition to `smiley-web` (React + TypeScript + Vite + TanStack Query). A shared `TransferPrefsProvider` context (amount/urgency, persisted to `localStorage`) feeds a single `useFxRecommendation()` React Query hook. Both the Rates page banner and the Layout nav badge call that same hook — React Query dedupes to one network request. No backend changes; the endpoint and its response shape already exist and are used today by the mobile app.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query (`@tanstack/react-query`), axios, `lucide-react` icons, inline styles + CSS custom properties (existing project convention — no CSS-in-JS library, no Tailwind in this project).

## Global Constraints

- No backend changes — consume `GET /rates/recommendation?amount=&urgency=` as-is (`smiley-mobile/api/src/routes/rates.ts`, unchanged).
- No test framework exists in `smiley-web` (verified: no `vitest`/`jest`/`@testing-library` in `package.json`, no `*.test.*` files). Do not add one as part of this work — that's a separate decision. Verification is manual via `npm run dev`.
- `smiley-web` is not a git repository — there is no `git commit` step in this plan. Each task ends with a manual verification step instead.
- Match existing code style exactly: inline `style={{...}}` objects, CSS vars from `src/index.css` (e.g. `var(--accent-green)`, `var(--text-muted)`), `GlassCard`/`Spinner` components, `Syne` for headings and `IBM Plex Mono` for numeric/mono text — all as seen in `RatesPage.tsx`.
- Defaults: `amount = 5000`, `urgency = 'medium'` (matches the mobile app's default in `smiley-mobile/mobile/app/(tabs)/index.tsx`).
- Known `reasons[]` codes (from `smiley-mobile/api/src/lib/fx-decision.ts`, exhaustive): `ABOVE_TARGET_NET`, `BELOW_TARGET_NET`, `TOP_25_PERCENTILE_30D`, `ABOVE_MEDIAN_30D`, `BOTTOM_35_PERCENTILE_30D`, `ABOVE_MEDIAN_90D`, `POSITIVE_MOMENTUM`, `NEGATIVE_MOMENTUM`, `MIXED_SIGNALS_SPLIT`. Unknown codes render nothing, never the raw code string.

---

## File Structure

```
smiley-web/src/
  types/rates.ts                      # MODIFY: add FxRecommendationResponse + related types
  api/rates.ts                        # MODIFY: add getRecommendation()
  context/TransferPrefs.tsx           # CREATE: amount/urgency context, localStorage-backed
  hooks/useRates.ts                   # MODIFY: add useFxRecommendation()
  modules/rates/reasonLabels.ts       # CREATE: reason code -> human label lookup
  modules/rates/TransferAlertBanner.tsx  # CREATE: controls row + banner/status, self-contained
  modules/rates/RatesPage.tsx         # MODIFY: render <TransferAlertBanner /> at top
  components/Layout.tsx               # MODIFY: nav badge dot on the Rates icon
  index.css                           # MODIFY: add pulse-dot keyframe
  App.tsx                             # MODIFY: wrap routes in TransferPrefsProvider
```

**Interfaces produced/consumed across tasks:**
- `Urgency` type (`'low' | 'medium' | 'high'`) — defined in `context/TransferPrefs.tsx`, imported by `hooks/useRates.ts`, `api/rates.ts`, `modules/rates/TransferAlertBanner.tsx`.
- `useTransferPrefs(): { amount: number; urgency: Urgency; setAmount: (n: number) => void; setUrgency: (u: Urgency) => void }` — defined in `context/TransferPrefs.tsx`.
- `useFxRecommendation(): UseQueryResult<FxRecommendationResponse>` — defined in `hooks/useRates.ts`, consumed by `TransferAlertBanner.tsx` and `Layout.tsx`.
- `reasonLabel(code: string): string | null` — defined in `modules/rates/reasonLabels.ts`, consumed by `TransferAlertBanner.tsx`.
- `FxRecommendationResponse` type — defined in `types/rates.ts`, consumed by `api/rates.ts` and `hooks/useRates.ts`.

---

### Task 1: Types + API client for the recommendation endpoint

**Files:**
- Modify: `smiley-web/src/types/rates.ts`
- Modify: `smiley-web/src/api/rates.ts`

**Interfaces:**
- Produces: `FxRecommendationResponse`, `FxRecommendation`, `FxProfile`, `FxTier` types (exported from `types/rates.ts`); `ratesApi.getRecommendation(params: { amount: number; urgency: 'low' | 'medium' | 'high' })` (exported from `api/rates.ts`).

- [ ] **Step 1: Add the recommendation types to `types/rates.ts`**

Current file content is:
```ts
export interface RateLatest {
  id: string
  rate_date: string
  buy_rate: number
  sell_rate: number
  source: string
  created_at: string
}

export interface RateDaily {
  rate_date: string
  buy_rate: string
  sell_rate: string
  count: string
}
```

Append (do not remove the existing content):
```ts

export interface FxTier {
  min?: number
  max?: number
  fee_fixed?: number
  fee_percent?: number
}

export interface FxProfile {
  id: number
  name: string
  enabled: boolean
  target_rate: number | null
  fee_fixed: number
  fee_percent: number
  tier_json: FxTier[]
  created_at: string
  updated_at: string
}

export interface FxRecommendation {
  id: number
  amount_sgd: number
  urgency: 'low' | 'medium' | 'high'
  decision: 'exchange_now' | 'wait' | 'split'
  confidence: number
  raw_rate: number
  effective_rate: number
  target_rate: number | null
  features: {
    percentile_7d: number | null
    percentile_30d: number | null
    percentile_90d: number | null
    ma_gap_7d: number | null
    ma_gap_30d: number | null
    vol_zscore: number | null
  }
  reasons: string[]
  fee: {
    fixed: number
    percent: number
    total_myr: number
  }
  generated_at: string
}

export interface FxRecommendationResponse {
  amount_sgd: number
  urgency: 'low' | 'medium' | 'high'
  profile: FxProfile
  latest_rate: {
    id: number
    rate: number
    date: string
  }
  recommendation: FxRecommendation
}
```

- [ ] **Step 2: Add `getRecommendation` to `api/rates.ts`**

Current file content is:
```ts
import client from './client'
import type { RateLatest, RateDaily } from '../types/rates'

export const ratesApi = {
  getLatest: () => client.get<RateLatest>('/rates/latest').then(r => r.data),
  getDaily: (days = 30) =>
    client.get<RateDaily[]>('/rates/daily').then(r => r.data.slice(-days)),
}
```

Replace with:
```ts
import client from './client'
import type { RateLatest, RateDaily, FxRecommendationResponse } from '../types/rates'

export const ratesApi = {
  getLatest: () => client.get<RateLatest>('/rates/latest').then(r => r.data),
  getDaily: (days = 30) =>
    client.get<RateDaily[]>('/rates/daily').then(r => r.data.slice(-days)),
  getRecommendation: (params: { amount: number; urgency: 'low' | 'medium' | 'high' }) =>
    client.get<FxRecommendationResponse>('/rates/recommendation', { params }).then(r => r.data),
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors referencing `types/rates.ts` or `api/rates.ts`. (Pre-existing unrelated errors elsewhere, if any, are not in scope — only confirm no *new* errors from these two files.)

---

### Task 2: TransferPrefs context

**Files:**
- Create: `smiley-web/src/context/TransferPrefs.tsx`
- Modify: `smiley-web/src/App.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Urgency` type, `TransferPrefsProvider` component, `useTransferPrefs()` hook — all exported from `context/TransferPrefs.tsx`.

- [ ] **Step 1: Create `context/TransferPrefs.tsx`**

```tsx
import { createContext, useContext, useState, ReactNode } from 'react'

export type Urgency = 'low' | 'medium' | 'high'

interface TransferPrefsValue {
  amount: number
  urgency: Urgency
  setAmount: (n: number) => void
  setUrgency: (u: Urgency) => void
}

const TransferPrefsContext = createContext<TransferPrefsValue | null>(null)

const AMOUNT_KEY = 'transferPrefs.amount'
const URGENCY_KEY = 'transferPrefs.urgency'
const DEFAULT_AMOUNT = 5000
const DEFAULT_URGENCY: Urgency = 'medium'

function readAmount(): number {
  const raw = localStorage.getItem(AMOUNT_KEY)
  const n = raw ? Number(raw) : NaN
  return isFinite(n) && n > 0 ? n : DEFAULT_AMOUNT
}

function readUrgency(): Urgency {
  const raw = localStorage.getItem(URGENCY_KEY)
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : DEFAULT_URGENCY
}

export function TransferPrefsProvider({ children }: { children: ReactNode }) {
  const [amount, setAmountState] = useState<number>(readAmount)
  const [urgency, setUrgencyState] = useState<Urgency>(readUrgency)

  function setAmount(n: number) {
    setAmountState(n)
    localStorage.setItem(AMOUNT_KEY, String(n))
  }

  function setUrgency(u: Urgency) {
    setUrgencyState(u)
    localStorage.setItem(URGENCY_KEY, u)
  }

  return (
    <TransferPrefsContext.Provider value={{ amount, urgency, setAmount, setUrgency }}>
      {children}
    </TransferPrefsContext.Provider>
  )
}

export function useTransferPrefs(): TransferPrefsValue {
  const ctx = useContext(TransferPrefsContext)
  if (!ctx) throw new Error('useTransferPrefs must be used within TransferPrefsProvider')
  return ctx
}
```

- [ ] **Step 2: Wrap the app in `App.tsx`**

Current relevant section of `App.tsx`:
```tsx
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

Replace with:
```tsx
export default function App() {
  return (
    <TransferPrefsProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TransferPrefsProvider>
  )
}
```

And add the import near the top of `App.tsx`, alongside the other component imports:
```tsx
import { TransferPrefsProvider } from './context/TransferPrefs'
```

- [ ] **Step 3: Verify it compiles and persists**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

Then run: `npm run dev`, open the app in a browser, open DevTools console, and run:
```js
localStorage.getItem('transferPrefs.amount')
```
Expected: `null` (nothing has called `setAmount` yet — this just confirms the app still boots and the key namespace is as expected). Stop the dev server after confirming (no code depends on it running yet).

---

### Task 3: `useFxRecommendation` hook

**Files:**
- Modify: `smiley-web/src/hooks/useRates.ts`

**Interfaces:**
- Consumes: `useTransferPrefs()` from `context/TransferPrefs.tsx` (Task 2); `ratesApi.getRecommendation` from `api/rates.ts` (Task 1).
- Produces: `useFxRecommendation()` hook, returning a TanStack Query `UseQueryResult<FxRecommendationResponse>`.

- [ ] **Step 1: Add the hook**

Current file content is:
```ts
import { useQuery } from '@tanstack/react-query'
import { ratesApi } from '../api/rates'

export function useRates() {
  const latestQuery = useQuery({
    queryKey: ['rates', 'latest'],
    queryFn: ratesApi.getLatest,
    refetchInterval: 300_000,
  })

  const dailyQuery = useQuery({
    queryKey: ['rates', 'daily'],
    queryFn: () => ratesApi.getDaily(30),
    refetchInterval: 300_000,
  })

  return { latestQuery, dailyQuery }
}
```

Replace with:
```ts
import { useQuery } from '@tanstack/react-query'
import { ratesApi } from '../api/rates'
import { useTransferPrefs } from '../context/TransferPrefs'

export function useRates() {
  const latestQuery = useQuery({
    queryKey: ['rates', 'latest'],
    queryFn: ratesApi.getLatest,
    refetchInterval: 300_000,
  })

  const dailyQuery = useQuery({
    queryKey: ['rates', 'daily'],
    queryFn: () => ratesApi.getDaily(30),
    refetchInterval: 300_000,
  })

  return { latestQuery, dailyQuery }
}

export function useFxRecommendation() {
  const { amount, urgency } = useTransferPrefs()
  return useQuery({
    queryKey: ['rates', 'recommendation', amount, urgency],
    queryFn: () => ratesApi.getRecommendation({ amount, urgency }),
    refetchInterval: 300_000,
  })
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors. `useFxRecommendation` must be called from inside a `TransferPrefsProvider` subtree (satisfied by Task 2's App.tsx change) — this is a runtime constraint that Tasks 4 and 5 rely on, not something `tsc` checks.

---

### Task 4: Reason label lookup

**Files:**
- Create: `smiley-web/src/modules/rates/reasonLabels.ts`

**Interfaces:**
- Produces: `reasonLabel(code: string): string | null`.

- [ ] **Step 1: Create the lookup**

```ts
const REASON_LABELS: Record<string, string> = {
  ABOVE_TARGET_NET: 'Above your target rate',
  BELOW_TARGET_NET: 'Below your target rate',
  TOP_25_PERCENTILE_30D: 'Top 25% of last 30 days',
  ABOVE_MEDIAN_30D: 'Above 30-day median',
  BOTTOM_35_PERCENTILE_30D: 'Bottom third of last 30 days',
  ABOVE_MEDIAN_90D: 'Above 90-day median',
  POSITIVE_MOMENTUM: 'Rate trending up',
  NEGATIVE_MOMENTUM: 'Rate trending down',
  MIXED_SIGNALS_SPLIT: 'Mixed signals',
}

export function reasonLabel(code: string | undefined): string | null {
  if (!code) return null
  return REASON_LABELS[code] ?? null
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

---

### Task 5: TransferAlertBanner component

**Files:**
- Create: `smiley-web/src/modules/rates/TransferAlertBanner.tsx`

**Interfaces:**
- Consumes: `useTransferPrefs()` (Task 2), `useFxRecommendation()` (Task 3), `reasonLabel()` (Task 4), `GlassCard` (`components/GlassCard.tsx`), `Spinner` (`components/Spinner.tsx`), `X` icon from `lucide-react`.
- Produces: default-exported `TransferAlertBanner` component, consumed by `RatesPage.tsx` (Task 6).

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useTransferPrefs, type Urgency } from '../../context/TransferPrefs'
import { useFxRecommendation } from '../../hooks/useRates'
import { reasonLabel } from './reasonLabels'

const DISMISS_KEY = 'transferAlert.dismissed'
const URGENCIES: Urgency[] = ['low', 'medium', 'high']

export default function TransferAlertBanner() {
  const { amount, urgency, setAmount, setUrgency } = useTransferPrefs()
  const [amountInput, setAmountInput] = useState(String(amount))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    setAmountInput(String(amount))
  }, [amount])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleAmountChange(value: string) {
    setAmountInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const n = Number(value)
      if (isFinite(n) && n > 0) setAmount(n)
    }, 400)
  }

  const query = useFxRecommendation()
  const rec = query.data?.recommendation

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <GlassCard style={{ padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Amount (SGD)
          <input
            type="number"
            min={1}
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            style={{
              width: 100, padding: '6px 8px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg-surface)',
              color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          {URGENCIES.map((u) => (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, textTransform: 'capitalize',
                border: `1px solid ${urgency === u ? 'var(--border-active)' : 'var(--border)'}`,
                background: urgency === u ? 'var(--accent-cyan-dim)' : 'transparent',
                color: urgency === u ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {u}
            </button>
          ))}
        </div>
        {query.isFetching && <Spinner size={14} />}
      </GlassCard>

      {rec?.decision === 'exchange_now' && !dismissed && (
        <GlassCard style={{
          padding: '18px 20px',
          border: '1px solid rgba(16,185,129,0.4)',
          background: 'rgba(16,185,129,0.08)',
          position: 'relative',
        }}>
          <button
            onClick={() => { setDismissed(true); sessionStorage.setItem(DISMISS_KEY, '1') }}
            style={{
              position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
          <p style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--accent-green)', marginBottom: 6 }}>
            Good time to transfer
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>
            Effective rate {rec.effective_rate.toFixed(4)}
            {rec.target_rate != null ? ` · target ${rec.target_rate.toFixed(4)}` : ''}
            {' · '}{rec.confidence}% confidence
          </p>
          {rec.reasons?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {rec.reasons.slice(0, 2).map((code) => {
                const label = reasonLabel(code)
                if (!label) return null
                return (
                  <span key={code} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)',
                  }}>
                    {label}
                  </span>
                )
              })}
            </div>
          )}
        </GlassCard>
      )}

      {rec && (rec.decision === 'wait' || rec.decision === 'split') && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 4px' }}>
          {rec.decision === 'wait'
            ? `Hold${reasonLabel(rec.reasons?.[0]) ? ` — ${reasonLabel(rec.reasons[0])!.toLowerCase()}` : ''}`
            : 'Mixed signal — consider splitting the transfer'}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

---

### Task 6: Wire the banner into RatesPage

**Files:**
- Modify: `smiley-web/src/modules/rates/RatesPage.tsx`

**Interfaces:**
- Consumes: `TransferAlertBanner` default export (Task 5).

- [ ] **Step 1: Add the import and render it at the top of the page**

In `RatesPage.tsx`, add the import alongside the existing ones (near the top of the file, after the `date-fns` import):
```tsx
import TransferAlertBanner from './TransferAlertBanner'
```

Then find the outermost return wrapper:
```tsx
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
```

Insert `<TransferAlertBanner />` as the first child, immediately after the opening `<div className="animate-fade-in" ...>` tag and before the existing header `<div>`:
```tsx
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TransferAlertBanner />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
```

Do not change anything else in this file — the rest of the page (current rate card, trend, stats, chart, table) stays exactly as-is.

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification — page renders**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`, open the printed local URL, log in with the PIN, navigate to Rates.
Expected: the amount/urgency controls row appears above the "Current Rate" card. Below it, either the green "Good time to transfer" banner, the muted hold/split line, or nothing (if the recommendation query is still loading or errors) — depending on the live decision from `smiley-api`. Typing a new amount and waiting ~0.5s should trigger a refetch (visible via the small spinner next to the urgency buttons). Reload the page — the amount/urgency you set should still be there (confirms `localStorage` persistence from Task 2).
Stop the dev server once confirmed.

---

### Task 7: Nav badge on the Rates icon

**Files:**
- Modify: `smiley-web/src/components/Layout.tsx`
- Modify: `smiley-web/src/index.css`

**Interfaces:**
- Consumes: `useFxRecommendation()` (Task 3).

- [ ] **Step 1: Add the pulse keyframe to `index.css`**

Find the existing keyframes block:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

Add immediately after it:
```css

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}
```

- [ ] **Step 2: Add the badge to `Layout.tsx`**

Add the hook import alongside the existing imports:
```tsx
import { useFxRecommendation } from '../hooks/useRates'
```

Inside the component, after the existing `currentModule` line:
```tsx
  const location = useLocation()
  const currentModule = NAV.find(n => location.pathname.startsWith(n.to))
```

add:
```tsx
  const fxQuery = useFxRecommendation()
  const showTransferDot = fxQuery.data?.recommendation.decision === 'exchange_now'
```

Then update the nav rendering. Current code:
```tsx
        <nav style={{ display: 'flex', gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'all 0.15s',
                background: isActive ? 'var(--accent-cyan-dim)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              })}
            >
              <Icon size={15} />
            </NavLink>
          ))}
        </nav>
```

Replace with:
```tsx
        <nav style={{ display: 'flex', gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              style={({ isActive }) => ({
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'all 0.15s',
                background: isActive ? 'var(--accent-cyan-dim)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              })}
            >
              <Icon size={15} />
              {to === '/rates' && showTransferDot && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent-green)',
                  boxShadow: '0 0 0 2px var(--bg-base)',
                  animation: 'pulse-dot 1.6s ease-in-out infinite',
                }} />
              )}
            </NavLink>
          ))}
        </nav>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification — badge behavior**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`, open the app, log in.
Expected: if the current recommendation is `exchange_now`, a small pulsing green dot appears on the Rates nav icon, visible from every page (check by navigating to Todos, EC2, etc.). Dismissing the banner on the Rates page (Task 5/6) must NOT remove the dot — confirm by dismissing the banner, then checking the dot is still present. If the decision is `wait` or `split`, no dot should appear.
Stop the dev server once confirmed.

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — data source/types (Task 1), shared prefs (Task 2), hook (Task 3), reason translation (Task 4), banner + controls (Task 5/6), nav badge (Task 7). Error handling (fail-quiet on loading/error) is inherent in the `rec?.decision === ...` guards used throughout Task 5/7 — no separate task needed since there's no explicit error UI to build.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `Urgency` is defined once in `context/TransferPrefs.tsx` and imported everywhere else (`hooks/useRates.ts` via `useTransferPrefs`, `TransferAlertBanner.tsx` via `type Urgency`) — no duplicate/divergent definitions. `FxRecommendationResponse`/`FxRecommendation` fields (`decision`, `effective_rate`, `target_rate`, `confidence`, `reasons`) are used with identical names across Tasks 1, 3, 5, 7.
