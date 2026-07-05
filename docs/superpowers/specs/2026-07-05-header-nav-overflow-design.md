# Header Nav — Primary Bar + "More" Overflow — Design Spec

**Date:** 2026-07-05
**Status:** Approved

## Overview

`src/components/Layout.tsx`'s header nav has grown to 12 icon-only buttons (Todos, Rates, Net Worth, EC2, Jobs, Weather, Mail, Trips, Splitter, Quant, Tools, Expenses) packed into a 54px-tall sticky header. This is the "nav 'More' overflow restructure" flagged as future work in the Net Worth spec, now made pressing by Expenses becoming the 12th icon. The bar is crowded regardless of individual icon size — the fix is reducing how many icons are visible at once, not resizing them.

**Goal:** Split the nav into a small always-visible primary set and a "More" dropdown containing the rest, styled as a modern icon-tile grid rather than a plain list.

## Primary vs Overflow Split

```
PRIMARY_NAV (always visible, unchanged icon-button style):
  Todos, Rates, Net Worth, Expenses

OVERFLOW_NAV (behind "More"):
  EC2, Jobs, Weather, Mail, Trips, Splitter, Quant, Tools
```

This split lives as two arrays in `Layout.tsx` (currently one `NAV` array) — no route changes, no changes to any page. Existing per-item shape (`{ to, label, icon }`) is unchanged; only the array is split and a `LayoutGrid` icon (from `lucide-react`) is added for the More button itself.

## More Button

- Rendered as the last item in the icon row, same 36×36 size/style as primary buttons, icon `LayoutGrid`.
- **Active-state cue:** if `location.pathname` matches any `OVERFLOW_NAV` entry's `to` (via the same `startsWith` check already used for `currentModule`), the More button gets the same active styling (cyan background/border/icon color) that primary buttons get when active — so navigating into a hidden module doesn't visually "lose" the nav. The existing `/ {label}` breadcrumb text next to the logo (already computed from the full nav list) continues to show the current module name regardless.
- Clicking toggles a dropdown panel open/closed (local `useState<boolean>`).

## Dropdown Panel

- A `glass-card`-styled panel (reusing the existing `.glass-card` CSS class — blur, border, radius, hover glow already defined in `index.css`), positioned `position: absolute` below the More button, right-aligned to it, `z-index` above page content (matching the header's own `z-index: 50` context).
- Contents: a `grid-template-columns: repeat(3, 1fr)` grid of tiles, one per `OVERFLOW_NAV` entry. Each tile: icon in a 32px circular colored background (reusing the same "icon in tinted circle" treatment used for expense categories — `background: ${accent}22` style, though here using a flat cyan tint since overflow modules don't have per-item colors), label text below (11px, `text-secondary`), whole tile clickable (`Link` via `react-router-dom`), `.hover-lift` class for the hover treatment.
- Active tile (current route) gets a cyan border/background tint, consistent with primary nav's active state.
- Width: fixed at a comfortable size for 3 columns (e.g. `280px`) — 8 items → 3 rows of 3 (last row has 2).

## Interaction

- **Open/close:** click More toggles it. Click anywhere outside the panel closes it (a `useEffect` attaching/removing a `mousedown` listener on `document`, checking a ref around the button+panel, is the simplest correct pattern here — no existing dropdown precedent in this codebase to follow, so this is a new small inline pattern local to `Layout.tsx`, not a new shared component, consistent with this codebase's per-file convention of not extracting shared abstractions prematurely).
- **Escape key:** closes the panel (same `useEffect`, a `keydown` listener checking `e.key === 'Escape'`).
- **Navigation:** clicking a tile closes the panel (in addition to the route change closing it implicitly via unmount-remount of Layout's children — but Layout itself doesn't unmount, so explicit close-on-click is needed).

## Error Handling

None — this is a static UI structure with no data fetching, no new API calls, no async state beyond the open/closed boolean.

## Testing

No test framework exists in `smiley-web` (confirmed absent throughout this project). Verification is `npx tsc --noEmit` plus manual dev-server checks: primary 4 icons render and navigate correctly; More button opens the grid showing all 8 overflow modules with correct icons/labels; clicking a tile navigates and closes the panel; navigating directly to an overflow route (e.g. typing `/trips` in the URL) shows the More button in its active state and the breadcrumb text still shows "Trips"; clicking outside the open panel closes it; Escape closes it; nav badge dot on the Rates icon (existing `exchange_now` indicator) still works unchanged since Rates stays in the primary bar.

## Out of Scope

- No grouping/categorization within the overflow grid (flat list of 8, not sub-grouped by theme) — the "Grouped dropdowns" approach (option A considered during brainstorming) is a possible future iteration if the overflow list itself grows unwieldy, not needed at today's count of 8.
- No sidebar restructure (option C considered during brainstorming) — this stays a header-based nav.
- No changes to any page's routes, layout, or content padding — `Layout.tsx`'s `<main>` element is untouched.
