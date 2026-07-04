# Trips Module — Smiley Web Design Spec

**Date:** 2026-05-31
**Status:** Approved

## Overview

Migrate the Trips module from Smiley Mobile to Smiley Web. The web version adds a PDF export feature (itinerary + AI brief + packing list). All trip data comes from the existing `smiley-api` backend at port 3100 — no new API endpoints are required beyond what the mobile app already uses.

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/trips` | `TripsPage` | Trip list grouped by status |
| `/trips/:id` | `TripDetailPage` | Trip detail with 5 tabs |

Both routes added to `src/App.tsx`. A "Trips" nav entry (plane icon) added to `src/components/Layout.tsx`.

---

## Module Structure

```
src/
  modules/trips/
    TripsPage.tsx            # list page
    TripDetailPage.tsx       # detail shell (header + tab bar)
    tabs/
      ItineraryTab.tsx       # day strip + timeline + activity CRUD
      BudgetTab.tsx          # summary + expense list + quick-add
      PackingTab.tsx         # items by category + check/add/delete + AI suggest
      BriefTab.tsx           # AI brief display + regenerate
      ChatTab.tsx            # chat history + input box
    TripFormModal.tsx        # create / edit trip
    ActivityFormModal.tsx    # create / edit activity within a day
    TripPdfDocument.tsx      # @react-pdf/renderer document definition
  hooks/
    useTrips.ts              # React Query hooks for all trip endpoints
  types/
    trips.ts                 # shared TypeScript interfaces
```

---

## Trips List Page (`/trips`)

### Layout
- Page header: "Trips" (Syne 800) + today's date + **"+ New Trip"** button (opens `TripFormModal`)
- Trips grouped by status in order: active → upcoming → planning → completed → cancelled
- Each group has a coloured dot + label + count badge
- Empty state: centred airplane icon + "No trips yet · Tap + to plan your first adventure"

### Trip Card
Each card is a horizontal row inside a `GlassCard`:

| Element | Detail |
|---------|--------|
| Emoji bubble | `cover_emoji` on a tinted background matching status colour |
| Trip name | Bold, truncated to 1 line |
| Destination | `destination_city, destination_country` |
| Date range | `1 Jun – 8 Jun 2026 · 8D · 7N` |
| Budget bar | Thin progress bar: spend % of budget, green <70% / amber 70–90% / red >90% |
| Status badge | Coloured pill (top-right of card) |
| Countdown | `"3d away"` / `"2d left"` / `"Last day"` / `"Departs today!"` |

Click card → navigate to `/trips/:id`.

### Status Colours
| Status | Colour |
|--------|--------|
| active | `#10b981` (green) |
| upcoming | `#06b6d4` (cyan) |
| planning | `#f59e0b` (amber) |
| completed | var(--text-muted) |
| cancelled | `#ef4444` (red) |

---

## Trip Detail Page (`/trips/:id`)

### Header (above tabs)
- Back link: `← Trips`
- Large emoji + trip name (Syne 800, 28px) + destination + date range + duration
- Status badge (dropdown to change status via `PATCH /trips/:id/status`)
- **"Export PDF"** button (top-right, triggers PDF modal)

### Tab Bar
Five tabs in order: **Itinerary · Budget · Packing · Brief · Chat**

Tab bar is a horizontal pill-style switcher (same style as the month/week toggle in `WeekCalendar`).

---

### Itinerary Tab

**Day strip** — horizontal scrollable row of day chips:
- Each chip: `D1` label + date (`1 Jun`)
- Active chip highlighted with `var(--accent-cyan)` border + background tint

**Day timeline** — for the selected day:
- Day header: "Day 1 — Mon, 1 Jun" + optional day title
- Activities sorted by `start_time` (null times last)
- Each activity row: time column (IBM Plex Mono) + dot + vertical line + card
  - Card: type icon + title + optional notes + optional duration
  - Hover: shows edit pencil + trash icons
  - Click pencil → opens `ActivityFormModal` (pre-filled)
  - Click trash → confirm delete → `DELETE /trips/:id/days/:dayId/activities/:actId`
- "+ Add activity" button at bottom of the day's list → opens `ActivityFormModal` (empty)

**Activity types and icons:**
| Type | Icon (lucide) |
|------|--------------|
| accommodation | `BedDouble` |
| transport | `Car` |
| meal | `UtensilsCrossed` |
| attraction | `Camera` |
| other | `Circle` |

---

### Budget Tab

**Summary row** (4 stat cards):
- Budget (MYR) · Spent (MYR) · Remaining (MYR) · Spend %

**Progress bar** — full width, colour-coded same as trip card.

**Expense list** — grouped by category, each row: description + amount (MYR) + original currency if SGD + delete icon on hover.

**Quick-add form** — always visible inline:
- Fields: description (text), amount (number), currency (MYR/SGD toggle), category (select)
- "Add Expense" button → `POST /trips/:id/expenses`

SGD amounts display as `MYR X.XX (SGD Y.YY)` using the latest rate from `ralysis.rates`.

---

### Packing Tab

**Progress bar** — "X of Y items packed"

**Items by category** — each category is a collapsible section:
- Each item: checkbox + label + delete icon on hover
- Check → `PATCH /trips/:id/packing/:itemId`
- Delete → `DELETE /trips/:id/packing/:itemId`

**Inline add** — text input + category select + "Add" button at bottom.

**Action buttons** (top-right of section):
- "AI Suggest" → `POST /trips/:id/ai-packing` → appends suggested items
- "Clear all" → confirmation → `DELETE /trips/:id/packing`

---

### Brief Tab

- Displays the AI-generated brief as formatted text (preserve line breaks)
- "Regenerate Brief" button → `POST /trips/:id/ai-brief` → replaces content
- Loading spinner while regenerating
- Empty state: "No brief yet · Click Regenerate to generate one"

---

### Chat Tab

- Message list (scrollable, newest at bottom):
  - User messages: right-aligned, cyan tint
  - AI messages: left-aligned, elevated card background
- Auto-scrolls to bottom on new message
- Input: text area (multi-line, Enter to send, Shift+Enter for newline) + Send button
- Send → `POST /trips/:id/chat` with `{ message }`
- "Clear chat" button (top-right) → confirmation → `DELETE /trips/:id/chat`
- AI responses that trigger actions (add activity, add packing item) show a subtle action tag below the message

---

## Forms

### TripFormModal

Centred modal with glass overlay. Used for both create and edit.

| Field | Type | Notes |
|-------|------|-------|
| Name | text input | required |
| Cover emoji | emoji picker (grid of ~20 travel emojis) | default ✈️ |
| Destination city | text input | required |
| Destination country | text input | optional |
| Start date | date input | required |
| End date | date input | required, ≥ start date |
| Budget (MYR) | number input | optional |
| Status | select | planning / upcoming / active / completed / cancelled |

Create → `POST /trips` → navigate to `/trips/:id`
Edit → `PUT /trips/:id` → refetch trip

### ActivityFormModal

Centred modal. Used for both create and edit.

| Field | Type | Notes |
|-------|------|-------|
| Title | text input | required |
| Type | select | accommodation / transport / meal / attraction / other |
| Start time | time input | optional (HH:MM) |
| End time | time input | optional |
| Notes | textarea | optional |
| Cost amount | number input | optional |
| Cost currency | MYR / SGD toggle | default MYR |

Create → `POST /trips/:id/days/:dayId/activities`
Edit → `PUT /trips/:id/activities/:actId`

---

## PDF Export (`TripPdfDocument.tsx`)

**Library:** `@react-pdf/renderer` (client-side, no server changes)

**Trigger:** "Export PDF" button in trip detail header → opens a small modal with trip name + "Download PDF" button.

**Document structure:**

```
Page 1 — Cover
  ┌─────────────────────────────┐
  │  [emoji]  Trip Name         │
  │           Destination       │
  │           Date range · Dur  │
  │           [Status badge]    │
  └─────────────────────────────┘

Section — AI Brief (if available)
  Heading: "Travel Brief"
  Brief text (wrapped, readable font size)

Section — Itinerary
  For each day:
    Day N header — Weekday, DD Mon YYYY  [day title if set]
    Activity rows:
      HH:MM  [type label]  Activity title
             Notes (indented, muted)

Section — Packing List
  For each category:
    Category heading
    ☐ Item name   ☐ Item name   ☐ Item name  (2-column layout)
    (checked items shown with ☑)

Footer (all pages): "Generated by Smiley Web · [date]" + page number
```

**Styling:** white background, dark text. IBM Plex Mono for times. Section headings use a cyan left-border rule. Consistent 40pt page margins.

**File name:** `[trip-name]-[start-date].pdf` (slugified)

---

## React Query Hooks (`useTrips.ts`)

| Hook | Method | Endpoint |
|------|--------|----------|
| `useTrips()` | GET | `/trips` |
| `useTrip(id)` | GET | `/trips/:id` |
| `useTripBudget(id)` | GET | `/trips/:id/budget` |
| `useTripExpenses(id)` | GET | `/trips/:id/expenses` |
| `useTripPacking(id)` | GET | `/trips/:id/packing` |
| `useTripChat(id)` | GET | `/trips/:id/chat` |
| `useCreateTrip()` | POST | `/trips` |
| `useUpdateTrip(id)` | PUT | `/trips/:id` |
| `useDeleteTrip()` | DELETE | `/trips/:id` |
| `usePatchTripStatus(id)` | PATCH | `/trips/:id/status` |
| `useCreateActivity()` | POST | `/trips/:id/days/:dayId/activities` |
| `useUpdateActivity()` | PUT | `/trips/:id/activities/:actId` |
| `useDeleteActivity()` | DELETE | `/trips/:id/activities/:actId` |
| `useCreateExpense()` | POST | `/trips/:id/expenses` |
| `useDeleteExpense()` | DELETE | `/trips/:id/expenses/:expId` |
| `useTogglePackingItem()` | PATCH | `/trips/:id/packing/:itemId/toggle` |
| `useCreatePackingItem()` | POST | `/trips/:id/packing` |
| `useDeletePackingItem()` | DELETE | `/trips/:id/packing/:itemId` |
| `useClearPacking()` | DELETE | `/trips/:id/packing` |
| `useAiBrief()` | POST | `/trips/:id/ai-brief` |
| `useAiPacking()` | POST | `/trips/:id/ai-packing` |
| `useSendChatMessage(id)` | POST | `/trips/:id/chat` |
| `useClearChat(id)` | DELETE | `/trips/:id/chat` |

All mutations invalidate relevant query keys on success.

---

## TypeScript Types (`types/trips.ts`)

Key interfaces mirroring the API response shapes:

```typescript
interface Trip {
  id: number
  name: string
  cover_emoji: string
  destination_city: string
  destination_country: string | null
  start_date: string       // YYYY-MM-DD
  end_date: string         // YYYY-MM-DD
  status: TripStatus
  budget_myr: number | null
  actual_spend_myr: number | null
  days: TripDay[]
  created_at: string
}

type TripStatus = 'planning' | 'upcoming' | 'active' | 'completed' | 'cancelled'

interface TripDay {
  id: number
  day_number: number
  day_date: string
  title: string | null
  activities: Activity[]
}

interface Activity {
  id: number
  title: string
  type: ActivityType
  start_time: string | null   // HH:MM:SS
  end_time: string | null
  notes: string | null
  cost_amount: number | null
  cost_currency: string | null
}

type ActivityType = 'accommodation' | 'transport' | 'meal' | 'attraction' | 'other'

interface Expense {
  id: number
  description: string
  amount_myr: number
  amount_original: number | null
  currency: string
  category: string
  created_at: string
}

interface PackingItem {
  id: number
  item_name: string
  category: string
  is_packed: boolean
}

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface BudgetSummary {
  budget_myr: number | null
  actual_spend_myr: number
  remaining_myr: number | null
  by_category: Record<string, number>
}
```

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `@react-pdf/renderer` | Client-side PDF generation |

No new backend dependencies. No API changes required.

---

## Out of Scope

- **Live Trip Mode** (GPS + OSRM) — mobile-only feature, not migrated
- **Pre-trip todo generation** — not included in this spec
- **Departure reminder** — push notifications are mobile-only
