# Gmail Digest Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/mail` page to Smiley Web showing Gmail connection status and the latest AI-categorized email digest, reusing the existing `/gmail/*` backend endpoints.

**Architecture:** Frontend-only addition following the existing `weather` module pattern: a typed API client (`src/api/gmail.ts`), React Query hooks (`src/hooks/useGmail.ts`), and a page component (`src/modules/mail/MailPage.tsx`), wired into `App.tsx` routes and `Layout.tsx` nav. No backend changes.

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, axios, lucide-react, date-fns. No automated test framework — verification is manual via `npm run dev` plus `tsc --noEmit` for type safety.

---

**Note:** `/opt/smileyapp/smiley-web` is not a git repository, so there are no commit steps in this plan. Each task ends with a type-check verification instead.

---

### Task 1: Gmail API client

**Files:**
- Create: `/opt/smileyapp/smiley-web/src/api/gmail.ts`

- [ ] **Step 1: Write the API client file**

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

export const GMAIL_AUTH_URL = 'https://ip-172-31-2-167.tail9203bc.ts.net/api/gmail/auth'

export const gmailApi = {
  getDigest: () =>
    client.get<{ digest: GmailDigest | null }>('/gmail/digest').then(r => r.data.digest),
  getStatus: () =>
    client.get<{ connected: boolean }>('/gmail/status').then(r => r.data),
  refresh: () =>
    client.post<{ digest: GmailDigest | null }>('/gmail/refresh').then(r => r.data.digest),
  disconnect: () =>
    client.delete('/gmail/connection').then(r => r.data),
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors related to `src/api/gmail.ts`

---

### Task 2: Gmail React Query hooks

**Files:**
- Create: `/opt/smileyapp/smiley-web/src/hooks/useGmail.ts`

- [ ] **Step 1: Write the hooks file**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gmailApi } from '../api/gmail'

export function useGmailDigest() {
  return useQuery({
    queryKey: ['gmail', 'digest'],
    queryFn: gmailApi.getDigest,
    staleTime: 15 * 60 * 1000,
  })
}

export function useGmailStatus() {
  return useQuery({
    queryKey: ['gmail', 'status'],
    queryFn: gmailApi.getStatus,
    staleTime: 5 * 60 * 1000,
  })
}

export function useGmailRefresh() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gmailApi.refresh,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmail', 'digest'] }),
  })
}

export function useGmailDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: gmailApi.disconnect,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gmail', 'status'] }),
  })
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors related to `src/hooks/useGmail.ts`

---

### Task 3: Mail page component

**Files:**
- Create: `/opt/smileyapp/smiley-web/src/modules/mail/MailPage.tsx`

- [ ] **Step 1: Write the page component**

```tsx
import { useState } from 'react'
import { useGmailDigest, useGmailStatus, useGmailRefresh, useGmailDisconnect } from '../../hooks/useGmail'
import { GMAIL_AUTH_URL, type GmailEmail } from '../../api/gmail'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { RefreshCw, Mail, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const CATEGORY_CONFIG: Record<GmailEmail['category'], { label: string; color: string }> = {
  urgent:    { label: 'Urgent',    color: '#DC2626' },
  important: { label: 'Important', color: '#D97706' },
  routine:   { label: 'Routine',   color: '#6B7280' },
}

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</)
  return match ? match[1].trim() : from.replace(/<.*>/, '').trim() || from
}

function CategoryBadge({ category }: { category: GmailEmail['category'] }) {
  const cfg = CATEGORY_CONFIG[category]
  return (
    <span style={{
      fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700,
      color: cfg.color, background: `${cfg.color}1a`,
      border: `1px solid ${cfg.color}44`, borderRadius: 6,
      padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function EmailRow({ email }: { email: GmailEmail }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 3 }}>
          {senderName(email.from)}
        </span>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{email.subject}</p>
        {email.reason && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>{email.reason}</p>
        )}
      </div>
      <CategoryBadge category={email.category} />
    </div>
  )
}

function Section({ title, color, emails }: { title: string; color: string; emails: GmailEmail[] }) {
  if (emails.length === 0) return null
  return (
    <GlassCard style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color }}>{title}</span>
        <span style={{
          fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700, color,
          background: `${color}1a`, borderRadius: 10, padding: '1px 8px',
        }}>{emails.length}</span>
      </div>
      <div>
        {emails.map(e => <EmailRow key={e.index} email={e} />)}
      </div>
    </GlassCard>
  )
}

export default function MailPage() {
  const digestQuery = useGmailDigest()
  const statusQuery = useGmailStatus()
  const refreshMutation = useGmailRefresh()
  const disconnectMutation = useGmailDisconnect()
  const [refreshing, setRefreshing] = useState(false)

  const digest = digestQuery.data
  const connected = statusQuery.data?.connected ?? false

  async function handleRefresh() {
    setRefreshing(true)
    try { await refreshMutation.mutateAsync() } finally { setRefreshing(false) }
  }

  function handleDisconnect() {
    if (!window.confirm('Disconnect Gmail? This removes the stored connection.')) return
    disconnectMutation.mutate()
  }

  const urgent    = digest?.emails.filter(e => e.category === 'urgent')    ?? []
  const important = digest?.emails.filter(e => e.category === 'important') ?? []
  const routine   = digest?.emails.filter(e => e.category === 'routine')   ?? []

  const loading = digestQuery.isLoading || statusQuery.isLoading
  const errored = digestQuery.isError || statusQuery.isError

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Mail</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {digest
              ? `${digest.email_count} emails · ${format(parseISO(digest.digest_date), 'MMM d, yyyy')}`
              : 'No digest yet'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {digestQuery.isFetching && <Spinner size={16} />}
          <button className="btn-ghost" onClick={() => digestQuery.refetch()} style={{ padding: '6px 10px' }} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button
            className="btn-primary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {refreshing ? <Spinner size={13} /> : <RefreshCw size={13} />}
            Fetch Now
          </button>
        </div>
      </div>

      {refreshMutation.isError && (
        <GlassCard style={{ padding: '10px 16px', color: 'var(--accent-red)', fontSize: 12 }}>
          Failed to refresh Gmail digest.
        </GlassCard>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, color: 'var(--text-muted)' }}>
          <Spinner /> Loading mail…
        </div>
      ) : errored ? (
        <GlassCard style={{ padding: '20px 22px', color: 'var(--accent-red)', fontSize: 13 }}>
          Failed to load Gmail data.
        </GlassCard>
      ) : (
        <>
          {/* Connection status card */}
          <GlassCard style={{
            padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
            borderLeft: `3px solid ${connected ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          }}>
            {connected
              ? <CheckCircle size={22} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: 2 }} />
              : <XCircle size={22} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: 2 }} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {connected ? 'Gmail connected' : 'Gmail not connected'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                {connected ? 'Daily digest fetches your inbox at 9 AM MYT' : 'Connect to enable the AI email digest'}
              </p>
              {connected ? (
                <div style={{ marginTop: 10 }}>
                  <button className="btn-danger" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                    {disconnectMutation.isPending ? <Spinner size={13} /> : null}
                    Disconnect
                  </button>
                  {disconnectMutation.isError && (
                    <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 6 }}>Failed to disconnect. Try again.</p>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={GMAIL_AUTH_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ExternalLink size={13} />
                    Connect Google Account
                  </a>
                  <button className="btn-ghost" onClick={() => statusQuery.refetch()} style={{ padding: '7px 16px' }}>
                    Refresh status
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Approve access in the new tab, then click Refresh status.
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Digest body */}
          {!digest ? (
            <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Mail size={48} color="var(--text-muted)" style={{ margin: '0 auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12 }}>
                No digest yet. Click "Fetch Now" to run the digest.
              </p>
            </GlassCard>
          ) : digest.email_count === 0 ? (
            <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
              <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12 }}>
                Inbox clear — no new emails in the last 24 hours.
              </p>
            </GlassCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {digest.summary && (
                <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    background: 'rgba(6,182,212,0.05)', borderLeft: '3px solid var(--accent-cyan)',
                    padding: '14px 18px',
                  }}>
                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      AI Summary
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '6px 0 0' }}>{digest.summary}</p>
                  </div>
                </GlassCard>
              )}
              <Section title="Urgent"    color="#DC2626" emails={urgent} />
              <Section title="Important" color="#D97706" emails={important} />
              <Section title="Routine"   color="#6B7280" emails={routine} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors related to `src/modules/mail/MailPage.tsx`

---

### Task 4: Wire up route and navigation

**Files:**
- Modify: `/opt/smileyapp/smiley-web/src/App.tsx`
- Modify: `/opt/smileyapp/smiley-web/src/components/Layout.tsx`

- [ ] **Step 1: Add the import and route in `App.tsx`**

In `/opt/smileyapp/smiley-web/src/App.tsx`, add the import alongside the other module imports (after the `WeatherPage` import):

```tsx
import WeatherPage from './modules/weather/WeatherPage'
import MailPage from './modules/mail/MailPage'
```

Then add the route alongside the other routes (after the `/weather` route):

```tsx
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/mail" element={<MailPage />} />
```

- [ ] **Step 2: Add the nav entry in `Layout.tsx`**

In `/opt/smileyapp/smiley-web/src/components/Layout.tsx`, add `Mail` to the lucide-react import:

```tsx
import { CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut, SplitSquareVertical, BarChart2, Wrench } from 'lucide-react'
```

Then add the nav entry to the `NAV` array, after the Weather entry:

```ts
const NAV = [
  { to: '/todos',      label: 'Todos',    icon: CheckSquare },
  { to: '/rates',      label: 'Rates',    icon: TrendingUp },
  { to: '/ec2',        label: 'EC2',      icon: Server },
  { to: '/jobs',       label: 'Jobs',     icon: Activity },
  { to: '/weather',    label: 'Weather',  icon: Cloud },
  { to: '/mail',       label: 'Mail',     icon: Mail },
  { to: '/trips',      label: 'Trips',    icon: Plane },
  { to: '/splitwise',  label: 'Splitter', icon: SplitSquareVertical },
  { to: '/quant',      label: 'Quant',    icon: BarChart2 },
  { to: '/tools',      label: 'Tools',    icon: Wrench },
]
```

- [ ] **Step 3: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors

---

### Task 5: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd /opt/smileyapp/smiley-web && npm run dev -- --host`
Expected: Vite prints a local URL (e.g. `http://localhost:5173` or `http://0.0.0.0:5173`)

- [ ] **Step 2: Confirm the backend is reachable**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://ip-172-31-2-167.tail9203bc.ts.net/api/health`
Expected: `200` (smiley-api must be running — `docker compose -f /opt/smileyapp/smiley-mobile/dc-smiley-mobile.yml up -d` if not)

- [ ] **Step 3: Browser walkthrough**

Open the Vite dev URL in a browser, log in with the existing PIN, then navigate to `/mail`:
- Confirm "Mail" appears in the top nav with the mail icon, and the breadcrumb shows "/ Mail" when active
- Confirm the connection status card renders (green if Gmail is already connected via mobile, red otherwise)
- If not connected: click "Connect Google Account" — verify it opens `https://ip-172-31-2-167.tail9203bc.ts.net/api/gmail/auth` in a new tab. Complete the OAuth flow if desired, then click "Refresh status" back in the original tab and confirm the card flips to green
- Click "Fetch Now" — verify the spinner shows, then the digest body populates with the AI summary and Urgent/Important/Routine sections (or an empty state if 0 emails)
- If connected, click "Disconnect" — confirm the `window.confirm` dialog appears, and on confirming, the status card flips back to red

- [ ] **Step 4: Stop dev server**

Stop the `npm run dev` process (Ctrl+C or kill the background process) once verification is complete.

---

## Self-Review Notes

- **Spec coverage:** Routes/nav (Task 4), API client (Task 1), hooks (Task 2), page layout incl. header/status card/digest body/error states (Task 3), manual testing checklist (Task 5) — all spec sections covered.
- **Type consistency:** `GmailEmail`, `GmailDigest`, `gmailApi`, `GMAIL_AUTH_URL` defined in Task 1 and consumed identically in Tasks 2–3. Hook names (`useGmailDigest`, `useGmailStatus`, `useGmailRefresh`, `useGmailDisconnect`) match between Task 2 definitions and Task 3 usage.
- **No backend changes** — confirmed no task touches `smiley-mobile/api`.
