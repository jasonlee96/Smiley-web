# Tour Splitter: Day 0 (Pre-Tour Costs)

## Problem

The Tour Splitter's day-based UI (pills, bar charts, expense groupings) only covers the range `start_date`..`end_date`. Real trips have costs incurred before the tour starts — flights, visas, travel insurance — often paid on different dates, weeks apart. Today these expenses have nowhere consistent to go:

- The Add Expense day-pill picker only offers Day 1..N; there's no way to pick a pre-trip date from the pills.
- The admin Dashboard "Spend by Day" chart (`buildDayData` in `TourDetailPage.tsx`) only walks `start_date`..`end_date`, so any expense dated before `start_date` is silently excluded from the chart entirely.
- The admin Expenses tab groups by day number derived from `start_date`; an expense dated before `start_date` gets no day number and falls back to a bare date label, with no "Day 0" concept.
- The participant Dashboard chart (`ParticipantPage.tsx` "Your Spend by Day") groups by `created_at` instead of `expense_date`, which is already inconsistent with the rest of the app and would also misrepresent pre-tour spend.

## Goals

- Let participants log pre-tour expenses against their real payment date (not one forced date).
- Make pre-tour expenses visible and correctly aggregated everywhere Day N already appears: Add Expense form, admin Dashboard chart, admin Expenses tab, participant Dashboard chart.
- No backend or schema changes — `expense_date` is already a free `DATE` column and the API already accepts any date.

## Non-Goals

- Tours without a `start_date` (day pills already don't apply there; free-form date input stays as-is).
- Post-tour costs (dated after `end_date`) — out of scope, existing fallback behavior (bare date label, excluded from chart) is unchanged.
- No new "pre-tour" flag/column — bucketing is derived purely from `expense_date < start_date` at display time.

## Design

### 1. Add Expense form (`ParticipantPage.tsx`)

- `buildDayPills` (or its caller) prepends a **"Day 0"** pill before "Day 1", shown only when the tour has a `start_date`.
- Clicking the Day 0 pill reveals an inline `<input type="date">` (`max` = `start_date` minus 1 day) so the pax records the actual date they paid. This differs from Day 1..N pills, which each represent one fixed date.
- Default-day selection logic gains one more case, evaluated in this order:
  1. If today < `start_date` → default to Day 0, prefilled with today's date.
  2. Else if today falls within an existing day pill → default to that pill (unchanged).
  3. Else → default to the last day pill (unchanged).

### 2. Shared bucketing rule

Any expense where `expenseDay(e) < start_date` (using the existing `expenseDay()` helper — `expense_date` falling back to `created_at`) is treated as **Day 0 / Pre-Tour** for display and grouping purposes, across all three surfaces below. Multiple distinct real dates all collapse into this one bucket.

### 3. Admin Expenses tab (`TourDetailPage.tsx`, ~L828-865)

- Insert a "Day 0 · Pre-Tour" group first, above "Day 1", aggregating all expenses whose day is before `start_date`.
- Because this group can mix several real dates, each `ExpenseRow` inside it additionally renders its own date (other groups keep relying on their header date only — no change there).

### 4. Admin Dashboard chart (`buildDayData` in `TourDetailPage.tsx`)

- Prepend a `"D0"` bar summing all expenses with day before `start_date`, before the `D1` bar. Existing zero-fill/range-walk logic for `start_date`..`end_date` is unchanged past that.

### 5. Participant Dashboard chart (`ParticipantPage.tsx`, "Your Spend by Day")

- Switch the grouping key from `created_at` to `expense_date` (falling back to `created_at` when null), matching `expenseDay()` elsewhere in the app. This is a latent inconsistency independent of Day 0, but must be fixed here or Day 0 bucketing on this chart would be wrong.
- Apply the same bucketing rule: dates before `start_date` collapse into one `"D0"` bar instead of each getting its own bar.

## Testing

- Manual verification in the browser (dev server), per project convention — no automated test suite exists for this module currently.
- Cases to check:
  - Tour with `start_date` set, add an expense via the Day 0 pill with a date well before `start_date` → appears correctly in participant Expenses list, admin Expenses tab (Day 0 group, own date shown), both Dashboard charts (D0 bar).
  - Two Day 0 expenses on different real dates → both aggregate into the same D0 bar/group.
  - Tour without `start_date` → no Day 0 pill, free-form date input unchanged.
  - Existing Day 1..N flows unaffected (regression check).
