# Itinerary PDF Export — Mandarin Names + Attraction Images

**Date:** 2026-06-13
**Status:** Approved
**Scope:** `smiley-web` — Trip Planner PDF export

---

## Problem

The existing itinerary PDF export (`TripPdfDocument.tsx`) renders each activity as time / type / title / location / notes. Once `name_zh` (Mandarin name spec) and `image_url` (attraction images spec) exist on activities, the PDF should surface them too — so the printed itinerary is as useful as the in-app view while traveling.

---

## Design

This extends the existing `actRow` rendering in `smiley-web/src/modules/trips/TripPdfDocument.tsx` (lines 182-198). No new sections, no new page — same itinerary table, two additions per activity row.

### Mandarin Name

- New style `actNameZh: { fontSize: 8, color: '#999', marginTop: 1, lineHeight: 1.4 }`.
- Rendered directly under `actTitle` (before `actLocation`/`actNotes`) when `act.name_zh` is set:
  ```tsx
  <Text style={S.actTitle}>{act.title}</Text>
  {act.name_zh ? <Text style={S.actNameZh}>{act.name_zh}</Text> : null}
  ```

### Attraction Image

- New styles:
  - `actImageCol: { width: 44, marginRight: 8, flexShrink: 0, alignItems: 'center' }`
  - `actImage: { width: 44, height: 44, borderRadius: 4, objectFit: 'cover' }`
  - `actImageCaption: { fontSize: 5.5, color: '#bbb', marginTop: 2, textAlign: 'center' }`
- `actRow` gains a new first child `<View style={S.actImageCol}>`, placed before `actTime`, **always reserved at 44pt width** (for row alignment across the whole table) but only populated when `act.image_url` is set:
  ```tsx
  <View style={S.actImageCol}>
    {act.image_url ? (
      <>
        <Image style={S.actImage} src={act.image_url} />
        {act.image_attribution ? <Text style={S.actImageCaption}>{act.image_attribution}</Text> : null}
      </>
    ) : null}
  </View>
  ```
- Import `Image` from `@react-pdf/renderer` (already a dependency, just add to the existing import on line 1-3).

### CORS Contingency (not built unless needed)

`<Image src="https://upload.wikimedia.org/...">` fetches the URL during PDF generation in-browser. Wikimedia Commons file URLs send permissive CORS headers, so this is expected to work directly. If testing shows otherwise (image fails to load / PDF generation errors):

- Add `GET /trips/image-proxy?url=<encoded wikimedia url>` to `smiley-mobile/api/src/routes/trips.ts`, validating the host is `upload.wikimedia.org` before streaming the image through with appropriate headers.
- `TripPdfDocument.tsx` would then point `<Image src>` at the proxy URL instead of the raw `image_url`.

This is a fallback path — only implement if the direct-URL approach fails during testing.

---

## Files Touched

- `smiley-web/src/modules/trips/TripPdfDocument.tsx` — `Image` import, new styles (`actNameZh`, `actImageCol`, `actImage`, `actImageCaption`), updated `actRow` rendering
- *(contingency only)* `smiley-mobile/api/src/routes/trips.ts` — `GET /trips/image-proxy` route

---

## Testing

- Export a PDF for a trip with attractions that have both `name_zh` and `image_url` set → Mandarin name appears under the title, thumbnail + attribution caption appear in the reserved left column.
- Export a PDF for activities without `name_zh`/`image_url` → row renders as before, image column is blank (44pt gap), no layout shift in `actTime`/`actType`/`actBody` columns.
- Export a PDF for a trip with no enriched activities at all (pre-existing trips) → output identical to current behavior aside from the new blank 44pt column.
- Verify a multi-page itinerary (many days) doesn't break pagination with the added column — `wrap={false}` on the day `View` is unchanged.

---

## Constraints

- No new dependencies — `Image` is part of `@react-pdf/renderer`, already installed.
- One additional fixed-width column added to every itinerary row; total row width budget (A4, 44pt margins) must still fit — 44pt image column + existing 34pt time + 72pt type + flexible body comfortably fits within ~506pt content width.
- If direct Wikimedia image URLs fail in PDF rendering, fall back to the proxy route (see CORS Contingency) rather than dropping images silently.
