# Trip Activities — Mandarin Name Field

**Date:** 2026-06-13
**Status:** Approved
**Scope:** `smiley-mobile/api` (shared backend) + `smiley-web` — Trip Planner module

---

## Problem

When traveling somewhere where signage and guides are written in Mandarin Chinese (e.g. Taiwan, China), the user can't recognize Chinese characters and has no way to match physical signage to itinerary entries. Trip activities currently only store an English `title`.

---

## Design

### Data Model

Add `smileyapp.trip_activities.name_zh TEXT` (nullable) in `smiley-mobile/api/src/db/migrations.ts`. Applies to all `activity_type` values (meals, transport, attractions, etc.) — not restricted to attractions.

### AI Chat — Populating `name_zh`

Both smiley-mobile and smiley-web's Chat tabs call the same backend chat endpoint, so this section is backend-only and applies to both apps automatically.

- `create_activity` and `update_activity` tool actions (in `executeTool`, `smiley-mobile/api/src/routes/trips.ts`) gain an optional `name_zh` field, persisted on insert/update.
- The `<actions>` JSON schema examples in the chat prompt are updated to include `"name_zh": "台北101"`.
- New prompt instruction: if a Mandarin/Chinese name for the place is known, include it as `name_zh`; omit or use `null` if the place has no established Chinese name.
- The itinerary snapshot sent to Claude each turn includes `name_zh` where set, e.g. `Taipei 101 (台北101) (attraction, ...)`, so the AI has continuity across turns.

### Manual Entry

- `smiley-web/src/modules/trips/ActivityFormModal.tsx`: new optional text input "Chinese name (optional)" rendered directly below the Title input (after line 98), using the existing `inputStyle`. New state `nameZh`, initialized from `activity?.name_zh ?? ''`, included in the submitted `CreateActivityInput` as `name_zh: nameZh.trim() || null`.
- `smiley-web/src/types/trips.ts`: add `name_zh: string | null` to `Activity`, and `name_zh?: string | null` to `CreateActivityInput`.
- `smiley-web/src/api/trips.ts` / `useCreateActivity` / `useUpdateActivity`: no special handling needed — `name_zh` flows through the existing `CreateActivityInput` passthrough, same as `notes`.
- Backend CRUD routes (`POST /trips/:id/days/:dayId/activities`, `PUT /trips/:id/activities/:actId` in `smiley-mobile/api/src/routes/trips.ts`) accept and persist `name_zh` (nullable passthrough, same pattern as `notes`).

### Display

- `smiley-web/src/modules/trips/tabs/ItineraryTab.tsx`: when `act.name_zh` is set, render it next to the title as a muted secondary span (~line 109, inside the existing title row):
  ```
  📷 Taipei 101  台北101
  📍 Xinyi District
  ```
  Style: `{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }`, rendered only if `act.name_zh` is truthy.

### Backfill — "Enrich Activities" (existing trips)

- New endpoint `POST /trips/:id/ai-enrich` in `smiley-mobile/api/src/routes/trips.ts` — returns `202` immediately, then runs in the background (same fire-and-forget pattern as `ai-packing` / `ai-brief`).
- Background job (this spec's portion):
  1. Fetch all activities for the trip where `name_zh IS NULL`.
  2. Send one batch prompt to Claude with `[{id, title, location}, ...]`, asking for `name_zh` where a commonly-known Mandarin name exists (many major international landmarks/cities/stations have established Chinese names, e.g. 埃菲尔铁塔, 卢塞恩).
  3. Update each matched row's `name_zh`. Rows with no sensible Chinese name are left `null`.
- **Note:** the Attraction Images spec (`2026-06-13-trip-attraction-images-design.md`) extends this same `ai-enrich` endpoint to also populate `image_url`/`image_attribution` in the same background pass — both enrichments run together under one button.
- `smiley-web/src/modules/trips/TripDetailPage.tsx`: new "Enrich Activities" button in the header actions row (next to "Edit" / "Export PDF", ~line 76-83), `btn-ghost` style with `Sparkles` icon (and `Spinner` while pending), calling `useAiEnrich().mutate(tripId)`.
- `smiley-web/src/hooks/useTrips.ts`: new `useAiEnrich()` mutation — `tripsApi.aiEnrich(tripId)`, on success `setTimeout(() => qc.invalidateQueries({ queryKey: ['trips', tripId] }), 3000)` (same pattern as `useAiPacking`).
- `smiley-web/src/api/trips.ts`: `aiEnrich: (id: number) => client.post(\`/trips/${id}/ai-enrich\`, {}, { timeout: 0 })`.

---

## Files Touched

- `smiley-mobile/api/src/db/migrations.ts` — add `name_zh` column
- `smiley-mobile/api/src/routes/trips.ts` — `executeTool` (create/update_activity), chat prompt schema + instructions, itinerary snapshot, manual activity CRUD routes, new `POST /trips/:id/ai-enrich` endpoint + background function (name_zh portion)
- `smiley-web/src/types/trips.ts` — `Activity.name_zh`, `CreateActivityInput.name_zh`
- `smiley-web/src/api/trips.ts` — `aiEnrich` API call
- `smiley-web/src/hooks/useTrips.ts` — pass `name_zh` through create/update activity mutations, new `useAiEnrich` mutation hook
- `smiley-web/src/modules/trips/ActivityFormModal.tsx` — new "Chinese name" field
- `smiley-web/src/modules/trips/tabs/ItineraryTab.tsx` — display `name_zh` in itinerary cards
- `smiley-web/src/modules/trips/TripDetailPage.tsx` — "Enrich Activities" button

---

## Testing

- Migration applies cleanly (nullable column, no data backfill at migration time).
- Chat: ask the AI to suggest a Taipei attraction → `name_zh` populates in the response actions, persists, and displays on the Itinerary tab.
- Manual form: add/edit a Chinese name on an activity → persists and displays.
- Backfill: click "Enrich Activities" on an existing Europe trip → activities with known Chinese names get `name_zh` populated; itinerary reflects the update ~3s later after refetch; activities with no Chinese name remain `null`.

---

## Constraints

- `name_zh` is optional everywhere — no validation, no required-field changes.
- Backfill only fills `NULL` fields; never overwrites existing manual or AI-set values.
- No new dependencies.
