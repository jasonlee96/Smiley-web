# Gmail Digest — Smiley Web Design Spec

**Date:** 2026-06-12
**Status:** Approved

## Overview

Port the existing mobile "Gmail Digest" feature to Smiley Web. The backend (`/gmail/*` routes on `smiley-api`) already exists and is unchanged — this is a frontend-only addition: a new `/mail` page showing Gmail connection status, the latest AI-categorized digest, and manual connect/disconnect/refresh controls.

---

## Routes & Navigation

| Route | Component | Description |
|-------|-----------|-------------|
| `/mail` | `MailPage` | Gmail connection status + latest digest |

- Added to `src/App.tsx` route table.
- New nav entry in `src/components/Layout.tsx`'s `NAV` array, placed after Weather:
  ```ts
  { to: '/mail', label: 'Mail', icon: Mail },
  ```
  (`Mail` icon from `lucide-react`). The existing `currentModule` breadcrumb lookup needs no changes — `/mail` matches directly.

---

## Module Structure

```
src/
  api/
    gmail.ts            # typed client functions for /gmail/*
  hooks/
    useGmail.ts         # React Query hooks
  modules/mail/
    MailPage.tsx         # page shell: status card + digest sections
```

No backend changes. No new env vars. Auth uses the existing `smiley_token` Bearer JWT (same `client` instance as every other module).

---

## API Client (`src/api/gmail.ts`)

```ts
import client from './client'

export interface GmailEmail {
  index: number
  from: string
  subject: string
  category: 'urgent' | 'important' | 'routine'
  reason: string
}

export interface GmailDigest {
  id: number
  digest_date: string
  email_count: number
  emails: GmailEmail[]
  summary: string | null
  created_at: string
  updated_at: string
}

export const gmailApi = {
  getDigest: () => client.get<{ digest: GmailDigest | null }>('/gmail/digest').then(r => r.data.digest),
  getStatus: () => client.get<{ connected: boolean }>('/gmail/status').then(r => r.data),
  refresh: () => client.post<{ digest: GmailDigest | null }>('/gmail/refresh').then(r => r.data.digest),
  disconnect: () => client.delete('/gmail/connection').then(r => r.data),
}

export const GMAIL_AUTH_URL = 'https://ip-172-31-2-167.tail9203bc.ts.net/api/gmail/auth'
```

---

## Hooks (`src/hooks/useGmail.ts`)

```ts
export function useGmailDigest() {
  // useQuery(['gmail','digest'], gmailApi.getDigest, { staleTime: 15*60*1000 })
}

export function useGmailStatus() {
  // useQuery(['gmail','status'], gmailApi.getStatus, { staleTime: 5*60*1000 })
}

export function useGmailRefresh() {
  // useMutation(gmailApi.refresh, { onSuccess: invalidate ['gmail','digest'] })
}

export function useGmailDisconnect() {
  // useMutation(gmailApi.disconnect, { onSuccess: invalidate ['gmail','status'] })
}
```

Mirrors the structure of `useWeather.ts`.

---

## Page Layout (`MailPage.tsx`)

### Header
- Title "Mail" (Syne 800, 28px, matches other module headers)
- Subtitle: `${digest.email_count} emails · ${formatted digest_date}` if a digest exists, else "Loading…" / "No digest yet"
- Right side: refresh icon button (`latestQuery.refetch()`), spinner while fetching, and a primary "Fetch Now" button that runs `useGmailRefresh()` (same disabled/spinner pattern as Weather's "Fetch Now")

### Connection Status Card (`GlassCard`)
- Left border colored green (`var(--accent-green)`) if `connected`, red (`var(--accent-red)`) if not — same visual language as mobile's `statusCard`
- Icon (checkmark-circle / x-circle via `lucide-react`), title "Gmail connected" / "Gmail not connected", description:
  - Connected: "Daily digest fetches your inbox at 9 AM MYT"
  - Not connected: "Connect to enable the AI email digest"
- Action area:
  - **Connected**: "Disconnect" button (`btn-ghost`, red text). On click, `window.confirm('Disconnect Gmail? This removes the stored connection.')` — if confirmed, call `useGmailDisconnect()`.
  - **Not connected**: "Connect Google Account" primary button — `window.open(GMAIL_AUTH_URL, '_blank')`. Below it, a small ghost "Refresh status" button that calls `statusQuery.refetch()`, with helper text "Approve access in the new tab, then click Refresh status."

### Digest Body
Three states based on `digestQuery.data`:

1. **No digest (`null`)** — empty-state `GlassCard` (centered, like Weather's empty state): mail icon, "No digest yet", "Click Fetch Now to run the digest."
2. **Digest with `email_count === 0`** — empty-state `GlassCard`: checkmark icon, "Inbox clear", "No new emails in the last 24 hours."
3. **Digest with emails**:
   - AI summary block styled like Weather's `AiBox` (cyan left-border, `summary` text)
   - Three `Section` blocks for Urgent / Important / Routine (only rendered if non-empty), each a `GlassCard` containing:
     - Section header: icon + label + count badge (colors: Urgent `#DC2626`, Important `#D97706`, Routine `#6B7280` — matches mobile `CATEGORY_CONFIG`)
     - One row per email: sender name (parsed via a `senderName(from)` helper ported from mobile — extracts display name from `"Name" <email>` format), subject, and `reason` in small muted italic text. Category badge repeated per-row (small colored chip) for scannability in the flat web layout.

### Loading / Error states
- While `digestQuery.isLoading` or `statusQuery.isLoading`: centered `Spinner` + "Loading mail…" (matches Weather's loading block)
- `digestQuery.isError` or `statusQuery.isError`: inline error `GlassCard`, red text, "Failed to load Gmail data."
- Mutation errors (`refreshMutation.isError`, `disconnectMutation.isError`): small inline red text below the relevant button (no toast system exists in smiley-web)

---

## Error Handling Summary

| Case | Behavior |
|------|----------|
| `/gmail/digest` or `/gmail/status` fails | Inline error `GlassCard`, red text |
| `/gmail/refresh` fails | Inline red text near "Fetch Now" button |
| `/gmail/connection` (disconnect) fails | Inline red text near "Disconnect" button |
| No digest row yet | Empty-state card prompting "Fetch Now" |
| Digest exists, 0 emails | "Inbox clear" empty state |

---

## Testing

No automated test framework in `smiley-web`. Manual verification via `npm run dev`:

- `/mail` loads; nav shows "Mail" icon; breadcrumb shows "/ Mail"
- If not connected: status card shows red/disconnected state; "Connect Google Account" opens the OAuth URL in a new tab; after approving and clicking "Refresh status", card flips to green/connected
- "Fetch Now" triggers `/gmail/refresh`, shows spinner, and populates the digest sections on success
- Digest with emails renders Urgent/Important/Routine sections with correct counts, sender names, subjects, and reasons
- Digest with `email_count === 0` shows "Inbox clear"
- No digest yet shows the "Fetch Now" prompt
- Disconnect prompts a confirm dialog; on confirm, status flips back to "not connected"
- Verify error `GlassCard` renders if `/gmail/status` or `/gmail/digest` is made to fail (e.g. temporarily stop `smiley-api`)
