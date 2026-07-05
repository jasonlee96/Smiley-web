# Header Nav Overflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `smiley-web`'s crowded 12-icon header nav into a 4-icon always-visible primary bar plus a "More" dropdown grid holding the remaining 8 modules, fixing crowding without touching any page route or layout.

**Architecture:** Single-file change to `src/components/Layout.tsx`. The existing `NAV` array splits into `PRIMARY_NAV` (4 items, rendered exactly as today) and `OVERFLOW_NAV` (8 items, rendered inside a new dropdown panel triggered by a "More" button). No new files, no new dependencies, no route changes.

**Tech Stack:** React 18, TypeScript, `react-router-dom` v6 (`NavLink`, `Link`, `useLocation`), `lucide-react` (adds `LayoutGrid`), existing `.glass-card`/`.hover-lift` CSS classes from `src/index.css` (no new CSS).

## Global Constraints

- No changes to any route, page component, or `<main>` layout — this is header-only.
- No new shared/reusable component extracted — the click-outside/Escape-close logic is a small `useEffect` local to `Layout.tsx`, consistent with this codebase's convention of not extracting abstractions prematurely (confirmed: no existing dropdown component exists anywhere in `smiley-web` to reuse or follow).
- No test framework exists in `smiley-web` (confirmed absent across all prior work in this project) — verification is `npx tsc --noEmit` plus manual dev-server checks.
- The existing Rates nav badge dot (`showTransferDot`, shown when `fxQuery.data?.recommendation.decision === 'exchange_now'`) must keep working unchanged — Rates stays in `PRIMARY_NAV`.
- The existing `/ {label}` breadcrumb text next to the logo (computed via `.find()` over the full nav list) must keep showing the correct label for both primary AND overflow routes.
- Primary set (exact): Todos, Rates, Net Worth, Expenses. Overflow set (exact): EC2, Jobs, Weather, Mail, Trips, Splitter, Quant, Tools.

---

## File Structure

```
src/components/Layout.tsx   # MODIFY: split NAV into PRIMARY_NAV/OVERFLOW_NAV, add More button + dropdown
```

**Interfaces produced:** None consumed by other files — `Layout.tsx` is the app's outermost shell component (wraps `<Routes>` in `App.tsx`), so this change is self-contained.

---

### Task 1: Split nav into primary bar + More dropdown

**Files:**
- Modify: `src/components/Layout.tsx` (full-file replacement shown below — the file is 119 lines, small enough to replace wholesale rather than patch piecemeal)

**Interfaces:**
- Consumes: existing `useFxRecommendation` hook from `../hooks/useRates` (unchanged usage).
- Produces: nothing consumed elsewhere — this is the leaf-level nav UI.

- [ ] **Step 1: Verify `LayoutGrid` exists in the installed `lucide-react` version**

Run: `cd /opt/smileyapp/smiley-web && node -e "console.log(typeof require('lucide-react').LayoutGrid)"`
Expected: `function` (confirms the icon import will resolve; already verified during planning — this step is a fast sanity check before editing).

- [ ] **Step 2: Replace the full contents of `src/components/Layout.tsx`**

```tsx
import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut,
  SplitSquareVertical, BarChart2, Wrench, Wallet, Receipt, LayoutGrid,
} from 'lucide-react'
import { useFxRecommendation } from '../hooks/useRates'

const PRIMARY_NAV = [
  { to: '/todos',      label: 'Todos',     icon: CheckSquare },
  { to: '/rates',      label: 'Rates',     icon: TrendingUp },
  { to: '/net-worth',  label: 'Net Worth', icon: Wallet },
  { to: '/expenses',   label: 'Expenses',  icon: Receipt },
]

const OVERFLOW_NAV = [
  { to: '/ec2',        label: 'EC2',      icon: Server },
  { to: '/jobs',       label: 'Jobs',     icon: Activity },
  { to: '/weather',    label: 'Weather',  icon: Cloud },
  { to: '/mail',       label: 'Mail',     icon: Mail },
  { to: '/trips',      label: 'Trips',    icon: Plane },
  { to: '/splitwise',  label: 'Splitter', icon: SplitSquareVertical },
  { to: '/quant',      label: 'Quant',    icon: BarChart2 },
  { to: '/tools',      label: 'Tools',    icon: Wrench },
]

const ALL_NAV = [...PRIMARY_NAV, ...OVERFLOW_NAV]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const currentModule = ALL_NAV.find(n => location.pathname.startsWith(n.to))
  const fxQuery = useFxRecommendation()
  const showTransferDot = fxQuery.data?.recommendation.decision === 'exchange_now'

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const isOverflowActive = OVERFLOW_NAV.some(n => location.pathname.startsWith(n.to))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,11,18,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 54,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, flexShrink: 0,
            background: 'var(--accent-cyan-dim)',
            border: '1px solid var(--border-active)',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>⌘</div>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800, fontSize: 15,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}>
            Smiley<span style={{ color: 'var(--accent-cyan)' }}> Web</span>
          </span>
          {currentModule && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
              / {currentModule.label}
            </span>
          )}
        </div>

        {/* Icon-only nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
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

          {/* More overflow */}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              title="More"
              onClick={() => setMoreOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                borderRadius: 8,
                border: `1px solid ${(moreOpen || isOverflowActive) ? 'var(--border-active)' : 'transparent'}`,
                background: (moreOpen || isOverflowActive) ? 'var(--accent-cyan-dim)' : 'transparent',
                color: (moreOpen || isOverflowActive) ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={15} />
            </button>

            {moreOpen && (
              <div className="glass-card" style={{
                position: 'absolute', top: 44, right: 0, zIndex: 60,
                width: 280, padding: 10,
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              }}>
                {OVERFLOW_NAV.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname.startsWith(to)
                  return (
                    <Link
                      key={to}
                      to={to}
                      className="hover-lift"
                      onClick={() => setMoreOpen(false)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '10px 6px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        background: active ? 'var(--accent-cyan-dim)' : 'transparent',
                        border: `1px solid ${active ? 'var(--border-active)' : 'transparent'}`,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(6,182,212,0.13)',
                      }}>
                        <Icon size={15} color={active ? 'var(--accent-cyan)' : 'var(--text-secondary)'} />
                      </div>
                      <span style={{ fontSize: 11, color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                        {label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Sign out */}
        <button
          className="btn-ghost"
          style={{ padding: '6px 8px', flexShrink: 0 }}
          title="Sign out"
          onClick={() => {
            localStorage.removeItem('smiley_token')
            window.dispatchEvent(new Event('token-cleared'))
          }}
        >
          <LogOut size={14} />
        </button>
      </header>

      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "Split header nav into primary bar + More overflow dropdown"
```

- [ ] **Step 5: Manual verification — full flow**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`, open the app, log in.

Expected:
- Header shows exactly 5 icon buttons before Sign Out: Todos, Rates, Net Worth, Expenses, and a grid-icon "More" button.
- Clicking each of the 4 primary icons navigates correctly and shows the active (cyan) state, same as before this change.
- The Rates icon's green pulsing badge dot still appears when `showTransferDot` is true (check by whatever previously triggered it, e.g. an active exchange recommendation — if not currently active, this can be visually confirmed by temporarily checking the dot renders in dev tools, or skipped if no recommendation is currently active).
- Clicking "More" opens a dropdown grid below-right of the button showing 8 tiles: EC2, Jobs, Weather, Mail, Trips, Splitter, Quant, Tools, each with an icon and label, laid out 3-per-row.
- Clicking a tile (e.g. Trips) navigates to that route AND closes the dropdown.
- After navigating to an overflow route (e.g. `/trips`), the More button itself shows the active (cyan) state, and the breadcrumb text next to "Smiley Web" reads "/ Trips".
- Reopening More while on `/trips` shows the Trips tile highlighted (cyan) among the grid.
- Clicking anywhere outside the open dropdown (e.g. the page background) closes it.
- Opening the dropdown and pressing Escape closes it.
- Reload the page while on an overflow route (e.g. `/tools`) — nav state (active primary bar showing none active, More showing active, breadcrumb showing "Tools") is correct on fresh load.

Stop the dev server once confirmed.

---

## Self-Review Notes

- **Spec coverage:** Primary/overflow split (spec's "Primary vs Overflow Split" section) — done via `PRIMARY_NAV`/`OVERFLOW_NAV` arrays. More button + active-state cue (spec's "More Button" section) — done via `isOverflowActive` check applied to the button's style. Dropdown panel styling (spec's "Dropdown Panel" section) — done via `.glass-card` class, 3-column grid, tinted icon circles, active-tile highlighting. Interaction (spec's "Interaction" section) — done via the `useEffect` click-outside/Escape handlers and `onClick={() => setMoreOpen(false)}` on each tile. Testing (spec's "Testing" section) — covered in Step 5's manual checklist, including the explicit Rates-dot regression check and the overflow-route breadcrumb/active-state check called out in the spec.
- **Placeholder scan:** no TBD/TODO markers; the code block is a complete, runnable file.
- **Type consistency:** single file, single component — no cross-task interfaces to check for drift.
