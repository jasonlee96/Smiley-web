# Rate Transfer Alert — Smiley Web Design Spec

**Date:** 2026-07-04
**Status:** Approved

## Overview

Surface a "ready to transfer" prompt in Smiley Web's Rates page, driven by the FX decision engine that already exists on `smiley-api` (`GET /rates/recommendation?amount=&urgency=`, used today by the mobile app's dashboard). No backend changes — this is a frontend-only addition to `smiley-web`.

When the engine's decision is `exchange_now`, show a prominent banner on the `/rates` page and a small badge dot on the `Rates` nav icon (visible from any page). When the decision is `wait` or `split`, show a quieter inline status instead of an empty section.

---

## Data Source

`GET /rates/recommendation?amount=<number>&urgency=low|medium|high` (existing endpoint, `smiley-mobile/api/src/routes/rates.ts`). Response shape (existing, from `fx-decision.ts`):

```ts
{
  profile: FxProfile,
  latestRate: { id, rate, date },
  recommendation: {
    decision: 'exchange_now' | 'wait' | 'split',
    confidence: number,        // 35-95
    raw_rate: number,
    effective_rate: number,    // net of fees
    target_rate: number | null,
    features: { percentile_7d, percentile_30d, percentile_90d, ma_gap_7d, ma_gap_30d, vol_zscore },
    reasons: string[],         // e.g. "TOP_25_PERCENTILE_30D"
    fee: { fixed, percent, total_myr },
    generated_at: string,
  }
}
```

`reasons` are enum-like codes, not prose — the frontend maps a fixed set of known codes to short human strings (unknown codes render blank, not the raw code).

---

## Shared Amount/Urgency Prefs

New context so the Rates page banner and the nav badge agree on what they're evaluating, and so the amount/urgency the user last used is remembered across visits.

**`src/context/TransferPrefs.tsx`** (new)

```tsx
interface TransferPrefs {
  amount: number
  urgency: 'low' | 'medium' | 'high'
  setAmount: (n: number) => void
  setUrgency: (u: 'low' | 'medium' | 'high') => void
}
```

- Backed by `localStorage` keys `transferPrefs.amount` / `transferPrefs.urgency`.
- Defaults: `amount = 5000`, `urgency = 'medium'` (matches mobile app default).
- Provider mounted once in `src/App.tsx`, above `AppRoutes`, so both `RatesPage` and `Layout` can consume it.
- Invalid/missing localStorage values fall back to defaults silently (no error state — this is a convenience default, not user data).

---

## Hook

**`src/hooks/useRates.ts`** — add:

```ts
export function useFxRecommendation() {
  const { amount, urgency } = useTransferPrefs()
  return useQuery({
    queryKey: ['rates', 'recommendation', amount, urgency],
    queryFn: () => ratesApi.getRecommendation({ amount, urgency }),
    refetchInterval: 300_000, // matches existing rate polling cadence
  })
}
```

Because the query key includes `amount`/`urgency` and both the banner and nav badge call this same hook, React Query dedupes automatically — one network fetch regardless of how many components mount it.

---

## API Client

**`src/api/rates.ts`** — add:

```ts
getRecommendation: (params: { amount: number; urgency: 'low' | 'medium' | 'high' }) =>
  client.get<FxRecommendationResponse>('/rates/recommendation', { params }).then(r => r.data),
```

**`src/types/rates.ts`** — add `FxRecommendationResponse` mirroring the shape above.

---

## Rates Page Changes (`src/modules/rates/RatesPage.tsx`)

**New controls row** (above the existing current-rate/trend cards):
- Amount input (numeric, SGD)
- Urgency segmented control (Low / Medium / High)
- Changes write through `useTransferPrefs().setAmount/setUrgency` — debounced 400ms before triggering a refetch (avoid a request per keystroke)

**New banner**, placed at the very top of the page, above the controls row:

- `decision === 'exchange_now'`:
  - Green `GlassCard` accent, prominent
  - Headline: "Good time to transfer"
  - Subline: effective rate, target rate (if set), confidence %
  - Up to 2 reason chips translated from `reasons[]` (e.g. `TOP_25_PERCENTILE_30D` → "Top 25% of last 30 days", `POSITIVE_MOMENTUM` → "Rate trending up")
  - Dismiss (×) button — hides the banner for the session (`sessionStorage`, not `localStorage` — reappears next visit/day since the underlying rate may have changed by then)
- `decision === 'wait'` or `'split'`:
  - Muted single-line status, no dismiss needed: e.g. "Hold — rate in bottom third of 30-day range" (wait) or "Mixed signal — consider splitting the transfer" (split)
- Loading / no data (recommendation query pending or erroring): section renders nothing (fail quiet — the rest of the page still works)

Existing sections (current rate, 7-day trend, stats, 30-day chart, daily table) are unchanged.

---

## Nav Badge (`src/components/Layout.tsx`)

- Call `useFxRecommendation()` once in `Layout`.
- When `decision === 'exchange_now'`, render a small dot (8px, `var(--accent-green)`, subtle pulse animation matching existing CSS conventions) absolutely positioned top-right on the `/rates` `NavLink` icon.
- The nav dot is independent of the banner's session dismissal — dismissing the banner on the Rates page does not hide the nav dot, so the signal isn't lost if the user is on another page.
- No dot when decision is `wait`/`split`/loading/error.

---

## Error Handling

- Recommendation fetch failing (e.g. no rate data yet, 404/500) → treated the same as "no signal": no banner, no dot. No error toast — this is a supplementary feature, not core page functionality.

---

## Testing

- No existing test framework detected in `smiley-web` (no `*.test.*`/`vitest`/`jest` found in a quick pass). Verification will be manual: run `npm run dev`, confirm banner/dot/muted-status render correctly for each decision value (can temporarily mock the API response or adjust `target_rate` in the DB to force a decision), confirm amount/urgency persist across a page reload, confirm dismiss behavior.
- If a test framework should be added as part of this work, that's a separate decision — out of scope here since none exists today.

---

## Out of Scope

- No changes to `smiley-mobile`/API — purely additive frontend consumption of an existing endpoint.
- No push notifications / server-side alerting (that's the existing `/rates/alert` threshold config + mobile push, tracked separately in the smiley-mobile roadmap).
- No projected MYR payout display in the banner (kept to decision + confidence + reasons, matching what the mobile dashboard already shows).
