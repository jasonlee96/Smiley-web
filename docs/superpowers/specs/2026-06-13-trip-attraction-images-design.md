# Trip Activities — Attraction Images

**Date:** 2026-06-13
**Status:** Approved
**Scope:** `smiley-mobile/api` (shared backend) + `smiley-web` — Trip Planner module

---

## Problem

When browsing the itinerary, "attraction" activities are just a title and a pin — the user can't visually recognize the place ahead of time. Adding a small reference photo to each attraction card makes the itinerary easier to scan and more useful while planning.

---

## Design

### Data Model

Add two nullable columns to `smileyapp.trip_activities` in `smiley-mobile/api/src/db/migrations.ts`:

- `image_url TEXT` — direct URL to a Wikimedia-hosted image (thumbnail/original size).
- `image_attribution TEXT` — human-readable source label, e.g. `"via Wikipedia: Taipei 101"`.

### Image Lookup (server-side, Wikipedia/Wikimedia)

A new helper in `smiley-mobile/api/src/routes/trips.ts` (or a small `lib/wikimedia.ts`), `lookupAttractionImage(title: string, location?: string)`:

1. Search: `GET https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=<title> <location>&format=json&origin=*` → take the top result's page title.
2. Summary: `GET https://en.wikipedia.org/api/rest_v1/page/summary/<pageTitle>` → read `thumbnail.source` (fallback `originalimage.source`).
3. Return `{ image_url, image_attribution: "via Wikipedia: <pageTitle>" }`, or `null` if no search result or no thumbnail exists.
4. No API key required. Failures (network error, no match) are caught and treated as "no image" — never block activity creation.

Free, no billing — chosen over Google Places Photos (paid, requires a billed GCP project).

### Trigger Points

1. **AI chat** — in `executeTool`, when `create_activity` or `update_activity` sets `activity_type: 'attraction'` (and no `image_url` is already set on update), call `lookupAttractionImage(title, location)` and persist the result alongside the activity write. Runs synchronously as part of the existing tool-call handling (one extra HTTP round-trip, acceptable latency for a chat action).
2. **Backfill** — extends the `POST /trips/:id/ai-enrich` endpoint introduced in `2026-06-13-trip-activity-mandarin-names-design.md`. In the same background pass:
   - For activities where `activity_type = 'attraction' AND image_url IS NULL`, call `lookupAttractionImage(title, location)` and update `image_url` / `image_attribution`.
   - This runs alongside (not instead of) the `name_zh` enrichment — one button, one background pass, two enrichments.
3. **Manual entry** — no manual image field. Images are always looked up automatically; this keeps the form simple (per the original "1 image, automatic" decision).

### Display

- `smiley-web/src/modules/trips/tabs/ItineraryTab.tsx`: for activities where `activity_type === 'attraction' && act.image_url`, render a 56×56px rounded thumbnail (`borderRadius: 8`, `objectFit: 'cover'`) to the left of the card body (~line 106, inside the existing flex row at line 104-105 — change `alignItems: 'flex-start'` row to include the image as a sibling of the text column).
- If `image_url` is null (no match found, or non-attraction type), the card renders exactly as today — no placeholder box, no broken-image icon.
- `image_attribution` is not shown in the UI (kept for PDF export captioning — see the PDF enrichment spec); a `title` attribute on the `<img>` tag is sufficient for web.

---

## Files Touched

- `smiley-mobile/api/src/db/migrations.ts` — add `image_url`, `image_attribution` columns
- `smiley-mobile/api/src/routes/trips.ts` — new `lookupAttractionImage()` helper, `executeTool` (create/update_activity for attractions), `ai-enrich` background job (image portion)
- `smiley-web/src/types/trips.ts` — `Activity.image_url`, `Activity.image_attribution`
- `smiley-web/src/modules/trips/tabs/ItineraryTab.tsx` — thumbnail rendering

---

## Testing

- Chat: ask the AI to add a well-known attraction (e.g. "Eiffel Tower") → `image_url` populates and the thumbnail appears on the Itinerary tab.
- Chat: ask the AI to add an obscure/fictional place → `image_url` stays `null`, card renders unchanged (no broken image).
- Backfill: click "Enrich Activities" on an existing trip with attraction activities lacking images → `image_url`/`image_attribution` populate for matched attractions after ~3s refetch; `name_zh` enrichment (Spec 1) runs in the same pass.
- Non-attraction activities (meal, transport, etc.) never get an `image_url` and never show a thumbnail.

---

## Constraints

- `image_url` / `image_attribution` are optional everywhere — no validation, no required-field changes.
- Image lookup failures are silent (logged, not surfaced to the user) — activity creation/update never fails because of a missing image.
- Backfill only fills `NULL` `image_url` fields; never overwrites existing values.
- No new dependencies (uses built-in `fetch`, already used elsewhere in `smiley-mobile/api`).
- Restricted to `activity_type === 'attraction'` — other types never get image lookups.
