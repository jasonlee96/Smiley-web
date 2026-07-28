# Tour Splitter Day 0 (Pre-Tour Costs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Day 0" bucket to the Tour Splitter module so pre-tour costs (flights, visas, insurance — often paid on different real dates before the trip) are captured, visible, and correctly aggregated everywhere Day N already appears.

**Architecture:** Pure frontend, display/grouping-only change across two existing files in `smiley-web/src/modules/splitwise/`: `ParticipantPage.tsx` (Add Expense form + participant dashboard chart) and `TourDetailPage.tsx` (admin expenses list + admin dashboard chart). No backend or schema changes — `expense_date` is already a free `DATE` column and the API already accepts any date. Bucketing rule applied everywhere: any expense whose day (`expense_date` falling back to `created_at`) is before the tour's `start_date` is grouped as Day 0 / Pre-Tour instead of getting its own day slot.

**Tech Stack:** React 18, TypeScript, `@tanstack/react-query`, `recharts` (existing `BarChart`/`Bar`/`Cell` usage, unchanged), no test framework in this project (confirmed absent — verification is `npx tsc --noEmit` plus manual dev-server checks, matching prior plans in this repo).

## Global Constraints

- No backend/API/schema changes — `expense_date` already accepts any date, no new column or endpoint.
- No changes for tours without `start_date` — day pills and Day 0 don't apply there; free-form date input stays exactly as today.
- Post-tour costs (dated after `end_date`) are out of scope — existing fallback behavior is unchanged.
- Day 0 is a *display-time bucket*, not a stored flag — determined purely by comparing an expense's day string to `start_date` (`day < start_date`). No new DB column.
- Multiple distinct real pre-tour dates must all collapse into one Day 0 bucket/bar/group, not one bucket per date.

---

## File Structure

```
src/modules/splitwise/ParticipantPage.tsx   # MODIFY: Add Expense form gets a Day 0 pill + inline date field (Task 1); participant Dashboard chart buckets pre-tour spend into a D0 bar and switches its grouping key from created_at to expense_date (Task 2)
src/modules/splitwise/TourDetailPage.tsx    # MODIFY: admin Expenses tab groups pre-tour expenses into one "Day 0 · Pre-Tour" section, each row showing its own date (Task 3); admin Dashboard chart prepends a D0 bar and fixes its legend to not crash on the D0 pseudo-date (Task 4)
```

**Interfaces produced:** None — both files are leaf page/component modules, not consumed by other files beyond their existing route wiring in `App.tsx` (which does not change).

---

### Task 1: Add Expense form — Day 0 pill

**Files:**
- Modify: `src/modules/splitwise/ParticipantPage.tsx:36-37` (add `addDays` helper)
- Modify: `src/modules/splitwise/ParticipantPage.tsx:67-72` (date state)
- Modify: `src/modules/splitwise/ParticipantPage.tsx:126-167` (date JSX)

**Interfaces:**
- Consumes: existing `buildDayPills(startDate, endDate)` (unchanged), existing `todayStr()` (unchanged).
- Produces: nothing consumed by other tasks — this is a self-contained UI region inside `AddExpenseForm`.

- [ ] **Step 1: Add an `addDays` helper next to `todayStr`**

Find this in `src/modules/splitwise/ParticipantPage.tsx`:

```tsx
function todayStr() { return new Date().toISOString().slice(0, 10) }
```

Replace with:

```tsx
function todayStr() { return new Date().toISOString().slice(0, 10) }
function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}
```

- [ ] **Step 2: Add Day 0 state to `AddExpenseForm`**

Find this block inside `AddExpenseForm` (right after the existing `useState` calls for `description`/`amount`/`currency`/`category`/`splitWith`):

```tsx
  // Date: pills if tour has dates, otherwise manual input
  const dayPills = buildDayPills(startDate, endDate)
  const today = todayStr()
  const defaultDate = dayPills.find(p => p.date === today)?.date
    ?? (dayPills.length > 0 ? dayPills[dayPills.length - 1].date : today)
  const [selectedDate, setSelectedDate] = useState(defaultDate)
```

Replace with:

```tsx
  // Date: pills if tour has dates, otherwise manual input. A "Day 0" pill
  // covers pre-tour costs (flights, visas, insurance) paid on any real date
  // before startDate — it opens a free date field instead of a fixed pill date.
  const dayPills = buildDayPills(startDate, endDate)
  const today = todayStr()
  const dayBeforeStart = startDate ? addDays(startDate, -1) : null
  const isPreTour = !!startDate && today < startDate
  const defaultIsDayZero = dayPills.length > 0 && isPreTour
  const defaultDate = defaultIsDayZero
    ? today
    : dayPills.find(p => p.date === today)?.date
      ?? (dayPills.length > 0 ? dayPills[dayPills.length - 1].date : today)
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [dayZeroSelected, setDayZeroSelected] = useState(defaultIsDayZero)
```

- [ ] **Step 3: Replace the date picker JSX**

Find this block (the `{/* Date — pills if tour has dates, else manual picker */}` section):

```tsx
        {/* Date — pills if tour has dates, else manual picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
          {dayPills.length > 0 ? (
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
              scrollbarWidth: 'none', msOverflowStyle: 'none',
            }}>
              {dayPills.map((p, i) => {
                const dateLabel = new Date(p.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
                const isSelected = selectedDate === p.date
                const isToday = p.date === today
                return (
                  <button
                    key={p.date}
                    ref={isToday || (p.date === selectedDate && !dayPills.some(x => x.date === today)) ? todayPillRef : undefined}
                    type="button"
                    onClick={() => setSelectedDate(p.date)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-cyan-dim)' : 'transparent',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Day {i + 1}</span>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>{dateLabel}</span>
                    {isToday && <span style={{ fontSize: 8, color: 'var(--accent-cyan)', fontWeight: 700, marginTop: 1 }}>TODAY</span>}
                  </button>
                )
              })}
            </div>
          ) : (
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          )}
        </div>
```

Replace with:

```tsx
        {/* Date — pills if tour has dates, else manual picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
          {dayPills.length > 0 ? (
            <>
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                scrollbarWidth: 'none', msOverflowStyle: 'none',
              }}>
                <button
                  key="day-0"
                  type="button"
                  onClick={() => {
                    setDayZeroSelected(true)
                    if (!(startDate && selectedDate < startDate)) {
                      setSelectedDate(dayBeforeStart ?? today)
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${dayZeroSelected ? 'var(--accent-cyan)' : 'var(--border)'}`,
                    background: dayZeroSelected ? 'var(--accent-cyan-dim)' : 'transparent',
                    color: dayZeroSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Day 0</span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>Pre-Tour</span>
                </button>
                {dayPills.map((p, i) => {
                  const dateLabel = new Date(p.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
                  const isSelected = !dayZeroSelected && selectedDate === p.date
                  const isToday = p.date === today
                  return (
                    <button
                      key={p.date}
                      ref={isToday || (p.date === selectedDate && !dayZeroSelected && !dayPills.some(x => x.date === today)) ? todayPillRef : undefined}
                      type="button"
                      onClick={() => { setDayZeroSelected(false); setSelectedDate(p.date) }}
                      style={{
                        flexShrink: 0,
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--accent-cyan-dim)' : 'transparent',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700 }}>Day {i + 1}</span>
                      <span style={{ fontSize: 10, opacity: 0.8 }}>{dateLabel}</span>
                      {isToday && <span style={{ fontSize: 8, color: 'var(--accent-cyan)', fontWeight: 700, marginTop: 1 }}>TODAY</span>}
                    </button>
                  )
                })}
              </div>
              {dayZeroSelected && (
                <input
                  className="input"
                  type="date"
                  value={selectedDate}
                  max={dayBeforeStart ?? undefined}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              )}
            </>
          ) : (
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          )}
        </div>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/splitwise/ParticipantPage.tsx
git commit -m "Add Day 0 pill to Tour Splitter Add Expense form"
```

---

### Task 2: Participant Dashboard chart — Day 0 bucketing

**Files:**
- Modify: `src/modules/splitwise/ParticipantPage.tsx` — the "Day-by-day chart" block inside the Dashboard tab (search for `Your Spend by Day`).

**Interfaces:**
- Consumes: `participant.start_date` (already present on `ParticipantContext`, `src/api/splitwise.ts:133`), `expense.expense_date` (already present on `SplitExpense`, `src/api/splitwise.ts:38`).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Fix the grouping key and add Day 0 bucketing**

Find this block:

```tsx
            {/* Day-by-day chart */}
            {expenses.length > 0 && (() => {
              const byDate: Record<string, number> = {}
              for (const e of expenses) {
                const d = e.created_at.slice(0, 10)
                byDate[d] = (byDate[d] ?? 0) + parseFloat(e.amount as string)
              }
              const dayData = Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, total], i) => ({
                  label: `D${i + 1}`,
                  total: parseFloat(total.toFixed(2)),
                  date,
                }))
              if (dayData.length < 2) return null
```

Replace with:

```tsx
            {/* Day-by-day chart */}
            {expenses.length > 0 && (() => {
              const startDate = participant.start_date
              const byDate: Record<string, number> = {}
              let preTourTotal = 0
              for (const e of expenses) {
                const d = e.expense_date ? e.expense_date.slice(0, 10) : e.created_at.slice(0, 10)
                const amt = parseFloat(e.amount as string)
                if (startDate && d < startDate) {
                  preTourTotal += amt
                } else {
                  byDate[d] = (byDate[d] ?? 0) + amt
                }
              }
              const dayData = Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, total], i) => ({
                  label: `D${i + 1}`,
                  total: parseFloat(total.toFixed(2)),
                  date,
                }))
              if (preTourTotal > 0) {
                dayData.unshift({ label: 'D0', total: parseFloat(preTourTotal.toFixed(2)), date: 'Pre-Tour' })
              }
              if (dayData.length < 2) return null
```

The rest of the block (the `BarChart`/`Tooltip`/`Bar` JSX that follows, reading from `dayData`) is unchanged — its `labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}` already renders whatever string is in `date` as-is, so it will correctly show "Pre-Tour" for the D0 bar without further changes.

- [ ] **Step 2: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/splitwise/ParticipantPage.tsx
git commit -m "Bucket pre-tour spend into a D0 bar on participant dashboard chart"
```

---

### Task 3: Admin Expenses tab — Day 0 group

**Files:**
- Modify: `src/modules/splitwise/TourDetailPage.tsx` — `ExpenseRow` function (search for `function ExpenseRow({ e, baseCurrency }`).
- Modify: `src/modules/splitwise/TourDetailPage.tsx` — `ExpensesGrouped` function (search for `function ExpensesGrouped`).

**Interfaces:**
- Consumes: existing `expenseDay(e)` helper (unchanged, `TourDetailPage.tsx:501-503`).
- Produces: `ExpenseRow` gains an optional `showDate?: boolean` prop (default `false`) — used only within this task's own `ExpensesGrouped` call site, no other caller needs updating since the prop is optional.

- [ ] **Step 1: Add an optional `showDate` prop to `ExpenseRow`**

Find:

```tsx
function ExpenseRow({ e, baseCurrency }: { e: SplitExpense; baseCurrency: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)',
    }}>
      {e.category && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: catColor(e.category),
        }} />
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>{e.description}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>by {e.participant_name}</span>
        {e.category && (
```

Replace with:

```tsx
function ExpenseRow({ e, baseCurrency, showDate = false }: { e: SplitExpense; baseCurrency: string; showDate?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)',
    }}>
      {e.category && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: catColor(e.category),
        }} />
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>{e.description}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>by {e.participant_name}</span>
        {showDate && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
            {new Date(expenseDay(e)).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        {e.category && (
```

(Only the function signature line and the new `showDate` block are new; the rest of `ExpenseRow` below `{e.category && (` — the category badge, amount column, etc. — is unchanged.)

- [ ] **Step 2: Bucket pre-tour expenses into one "Day 0" group in `ExpensesGrouped`**

Find:

```tsx
  // Group expenses by expense_date (fallback to created_at)
  const grouped = new Map<string, SplitExpense[]>()
  for (const e of expenses) {
    const day = expenseDay(e)
    if (!grouped.has(day)) grouped.set(day, [])
    grouped.get(day)!.push(e)
  }
  const sortedDates = [...grouped.keys()].sort((a, b) => a.localeCompare(b))
```

Replace with:

```tsx
  // Group expenses by expense_date (fallback to created_at); any date before
  // startDate collapses into one "Day 0" bucket regardless of its real date
  const DAY_ZERO_KEY = '__day_zero__'
  const grouped = new Map<string, SplitExpense[]>()
  for (const e of expenses) {
    const day = expenseDay(e)
    const key = startDate && day < startDate ? DAY_ZERO_KEY : day
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(e)
  }
  const sortedDates = [...grouped.keys()].sort((a, b) => {
    if (a === DAY_ZERO_KEY) return -1
    if (b === DAY_ZERO_KEY) return 1
    return a.localeCompare(b)
  })
```

- [ ] **Step 3: Render the Day 0 group with its own label and per-row dates**

Find:

```tsx
      {sortedDates.map(date => {
        const dayExpenses = grouped.get(date)!
        const dayTotal = dayExpenses.reduce((s, e) => s + (e.amount_base ? parseFloat(e.amount_base) : 0), 0)
        const dayNum = dayMap.get(date)
        const label = dayNum
          ? `Day ${dayNum} — ${new Date(date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}`
          : new Date(date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        const isCollapsed = collapsed.has(date)
```

Replace with:

```tsx
      {sortedDates.map(date => {
        const dayExpenses = grouped.get(date)!
        const dayTotal = dayExpenses.reduce((s, e) => s + (e.amount_base ? parseFloat(e.amount_base) : 0), 0)
        const isDayZero = date === DAY_ZERO_KEY
        const dayNum = isDayZero ? null : dayMap.get(date)
        const label = isDayZero
          ? 'Day 0 · Pre-Tour'
          : dayNum
          ? `Day ${dayNum} — ${new Date(date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}`
          : new Date(date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        const isCollapsed = collapsed.has(date)
```

Then find, a few lines below in the same `.map`:

```tsx
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
                {dayExpenses.map(e => <ExpenseRow key={e.id} e={e} baseCurrency={baseCurrency} />)}
              </div>
            )}
```

Replace with:

```tsx
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
                {dayExpenses.map(e => <ExpenseRow key={e.id} e={e} baseCurrency={baseCurrency} showDate={isDayZero} />)}
              </div>
            )}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/splitwise/TourDetailPage.tsx
git commit -m "Group pre-tour expenses into a Day 0 section in admin Expenses tab"
```

---

### Task 4: Admin Dashboard chart — Day 0 bar

**Files:**
- Modify: `src/modules/splitwise/TourDetailPage.tsx` — `buildDayData` function.
- Modify: `src/modules/splitwise/TourDetailPage.tsx` — the "Day-by-day bar chart" legend JSX inside `DashboardPanel` (search for `Day legend`).

**Interfaces:**
- Consumes: existing `expenseDay(e)` helper (unchanged).
- Produces: `buildDayData` can now return a leading `{ label: 'D0', total, date: 'Pre-Tour' }` entry — consumed only by the chart JSX in the same file, updated in Step 2 below.

- [ ] **Step 1: Bucket pre-tour expenses into a leading D0 entry in `buildDayData`**

Find:

```tsx
function buildDayData(expenses: SplitExpense[], startDate: string | null, endDate: string | null) {
  const byDate: Record<string, number> = {}
  for (const e of expenses) {
    const d = expenseDay(e)
    byDate[d] = (byDate[d] ?? 0) + (e.amount_base ? parseFloat(e.amount_base) : 0)
  }

  if (startDate) {
    // Generate full day range even for zero-spend days
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(Math.max(...Object.keys(byDate).map(d => new Date(d).getTime()), start.getTime()))
    const days: { label: string; total: number; date: string }[] = []
    let d = new Date(start), day = 1
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ label: `D${day}`, total: parseFloat((byDate[dateStr] ?? 0).toFixed(2)), date: dateStr })
      d.setDate(d.getDate() + 1)
      day++
      if (day > 60) break
    }
    return days
  }
```

Replace with:

```tsx
function buildDayData(expenses: SplitExpense[], startDate: string | null, endDate: string | null) {
  const byDate: Record<string, number> = {}
  let preTourTotal = 0
  for (const e of expenses) {
    const d = expenseDay(e)
    const amt = e.amount_base ? parseFloat(e.amount_base) : 0
    if (startDate && d < startDate) {
      preTourTotal += amt
    } else {
      byDate[d] = (byDate[d] ?? 0) + amt
    }
  }

  if (startDate) {
    // Generate full day range even for zero-spend days
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(Math.max(...Object.keys(byDate).map(d => new Date(d).getTime()), start.getTime()))
    const days: { label: string; total: number; date: string }[] = []
    if (preTourTotal > 0) {
      days.push({ label: 'D0', total: parseFloat(preTourTotal.toFixed(2)), date: 'Pre-Tour' })
    }
    let d = new Date(start), day = 1
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ label: `D${day}`, total: parseFloat((byDate[dateStr] ?? 0).toFixed(2)), date: dateStr })
      d.setDate(d.getDate() + 1)
      day++
      if (day > 60) break
    }
    return days
  }
```

- [ ] **Step 2: Fix the day legend so it doesn't crash on the D0 pseudo-date**

Find:

```tsx
            {/* Day legend */}
            {dayData.length <= 14 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
                {dayData.map(d => (
                  <span key={d.date} style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {d.label}: {new Date(d.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            )}
```

Replace with:

```tsx
            {/* Day legend */}
            {dayData.length <= 14 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
                {dayData.map(d => (
                  <span key={d.date} style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {d.label}: {d.date === 'Pre-Tour' ? 'Pre-Tour' : new Date(d.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            )}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/splitwise/TourDetailPage.tsx
git commit -m "Add D0 bar to admin Tour Splitter dashboard chart"
```

---

### Task 5: Full manual verification

**Files:** none — verification only.

- [ ] **Step 1: Start the dev server**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`, open the app, log in, and navigate to Tour Splitter (`/splitwise`).

- [ ] **Step 2: Set up a test tour**

Create (or reuse) a tour with `start_date` set to a date a few days in the future and `end_date` a few days after that, so "today" is before `start_date`. Add at least one participant and open their public link (`/split/:token`).

- [ ] **Step 3: Verify the Add Expense form**

Expected on the participant page's Expenses tab → "Add Expense":
- A "Day 0 / Pre-Tour" pill appears first, before "Day 1".
- Since today is before `start_date`, Day 0 is selected by default and an inline date field appears, pre-filled with today's date.
- The date field's max date is one day before `start_date` — picking `start_date` itself or later is not allowed via this field.
- Clicking a "Day 1" (or later) pill deselects Day 0, hides the date field, and selects that fixed date as before.
- Clicking "Day 0" again re-selects it and restores the date field.
- Add two expenses on Day 0 with two different real dates (e.g. today and 5 days ago via the date field), and add one expense on Day 1.

- [ ] **Step 4: Verify the participant Dashboard chart**

Switch to the Dashboard tab:
- "Your Spend by Day" shows a "D0" bar whose value is the sum of the two Day 0 expenses (not two separate bars), followed by a "D1" bar for the Day 1 expense.
- Hovering the D0 bar shows "Pre-Tour" as the tooltip label (not "Invalid Date").

- [ ] **Step 5: Verify the admin Expenses tab**

Log in as admin, open the tour, go to the Expenses tab:
- A "Day 0 · Pre-Tour" group appears first, above "Day 1", containing both Day 0 expenses.
- Each expense row inside that group shows its own date next to the participant name (since they're on different real dates).
- Rows inside the "Day 1" group do NOT show a per-row date (unchanged behavior).
- The Day 0 group's total matches the sum of its two expenses.

- [ ] **Step 6: Verify the admin Dashboard chart**

Go to the Dashboard tab:
- "Spend by Day" shows a "D0" bar (sum of both Day 0 expenses) before "D1", "D2", etc.
- The day legend below the chart shows "D0: Pre-Tour" instead of a broken/invalid date string.

- [ ] **Step 7: Regression check — tour without `start_date`**

Create (or use) a tour with no `start_date` set, open its participant link:
- Add Expense shows the plain manual date picker (no pills, no Day 0) — unchanged from before this change.

- [ ] **Step 8: Regression check — existing Day 1..N flows**

On the original test tour, confirm Day 1..N pills, the participant/admin charts' non-D0 bars, and the admin Expenses tab's non-Day-0 groups all look and behave exactly as they did before (correct day numbers, correct totals, today's pill still auto-scrolls into view when applicable).

Stop the dev server once confirmed.

---

## Self-Review Notes

- **Spec coverage:** Section 1 (Add Expense form) → Task 1. Section 2 (shared bucketing rule) → applied identically in Tasks 2, 3, 4 via the `day < start_date` comparison. Section 3 (admin Expenses tab) → Task 3. Section 4 (admin Dashboard chart) → Task 4. Section 5 (participant Dashboard chart, including the `created_at`→`expense_date` fix) → Task 2. Testing section's four cases → all covered in Task 5's manual checklist (Steps 3-4 cover the multi-date Day 0 add + aggregation case, Step 7 covers no-`start_date` tours, Step 8 covers the Day 1..N regression case).
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code or a fully specified manual check.
- **Type consistency:** `ExpenseRow`'s new `showDate?: boolean` prop (Task 3) is optional with a default, so its one other implicit caller path (none — `ExpensesGrouped` is its only call site in this file) needs no changes. `startDate`/`dayBeforeStart`/`dayZeroSelected` naming in Task 1 is local to `AddExpenseForm` and doesn't collide with the `startDate` prop already passed into that component. `buildDayData`'s return shape (`{ label, total, date }[]`) is unchanged by Task 4 — the D0 entry is just another element of the same shape, so the consuming `BarChart`/legend JSX needed only the one Step 2 fix for the non-parseable `'Pre-Tour'` date string.
