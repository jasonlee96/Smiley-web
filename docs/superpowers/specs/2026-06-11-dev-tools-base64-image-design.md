# Dev Tools Hub + Base64 ↔ Image — Smiley Web Design Spec

**Date:** 2026-06-11
**Status:** Approved

## Overview

Add a new "Dev Tools" section to Smiley Web: a hub page listing small developer utilities, starting with a Base64 ↔ Image converter. Everything is client-side (browser APIs only) — no backend/API changes, no new env vars. The hub is registry-driven so future tools can be added by appending an entry, without restructuring routes or nav.

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/tools` | `ToolsHubPage` | Grid of tool cards from the registry |
| `/tools/base64-image` | `Base64ImagePage` | Base64 ↔ Image converter |

Both routes added to `src/App.tsx`. A "Tools" nav entry (Wrench icon from `lucide-react`) added to `src/components/Layout.tsx`'s `NAV` array. The existing `currentModule` breadcrumb lookup (`location.pathname.startsWith(n.to)`) already handles the nested `/tools/base64-image` route, showing it as "/ Tools".

---

## Module Structure

```
src/
  modules/tools/
    toolsRegistry.ts          # array of { id, label, description, icon, path }
    ToolsHubPage.tsx           # grid of GlassCards from registry
    base64Image/
      Base64ImagePage.tsx      # page shell, side-by-side layout
      DecodePanel.tsx          # base64/data-URI -> image preview
      EncodePanel.tsx          # image file -> base64/data-URI
      imageFormat.ts           # magic-byte sniffing + helpers
```

`toolsRegistry.ts` exports:

```ts
export interface ToolEntry {
  id: string
  label: string
  description: string
  icon: LucideIcon
  path: string
}

export const TOOLS: ToolEntry[] = [
  {
    id: 'base64-image',
    label: 'Base64 ↔ Image',
    description: 'Decode base64/data URIs to an image preview, or encode an image to base64.',
    icon: ImageIcon,
    path: '/tools/base64-image',
  },
]
```

---

## Tools Hub Page (`/tools`)

- Page header: "Dev Tools" (Syne 800, matches other module headers)
- Responsive grid of `GlassCard`s, one per `TOOLS` entry
- Each card: icon, label, one-line description; clicking navigates to `path`
- No "coming soon" placeholders — new cards appear only when a tool ships

---

## Base64 ↔ Image Page (`/tools/base64-image`)

### Layout
Two `GlassCard` panels side-by-side (`display: flex`, `gap`, wraps to stacked column on narrow viewports, consistent with existing responsive patterns):

- **Left: Decode** (Base64 → Image)
- **Right: Encode** (Image → Base64)

### Decode Panel
- Textarea for pasting either:
  - A full data URI: `data:image/png;base64,iVBORw0KG...`
  - A raw base64 string with no prefix
- Input is processed on change (debounced ~300ms):
  1. If the string starts with `data:image/...;base64,`, extract the MIME type and base64 payload directly.
  2. Otherwise, attempt to sniff the format from base64 magic-byte signatures (see `imageFormat.ts` below). Supported: PNG, JPEG, GIF, WebP, BMP.
  3. If neither applies, or `atob()` throws on the payload, show an inline error and clear the preview.
- On successful decode:
  - Render `<img src="data:{mime};base64,{payload}">`
  - On `img.onload`, read `naturalWidth` / `naturalHeight` and display "WxH px"
  - Display detected format (e.g. "PNG") and decoded size (formatted KB/MB from payload byte length)
  - On `img.onerror`, show "Failed to render image — data may be corrupted" and hide the broken image
- Action buttons (enabled only when a valid preview is shown):
  - **Copy Data URI** — copies `data:{mime};base64,{payload}` to clipboard
  - **Download Image** — builds a `Blob` from the decoded bytes with the detected MIME type and triggers a download via an object URL, with a filename `image.{ext}` where `{ext}` matches the detected format (e.g. `image.png`, `image.jpg`, `image.gif`, `image.webp`, `image.bmp`)

### Encode Panel
- Drag-and-drop zone + click-to-browse `<input type="file" accept="image/*">`
- On file selection:
  - `FileReader.readAsDataURL(file)` produces the data URI
  - Split off the `data:{mime};base64,` prefix to get the raw base64 payload
- Display:
  - Image preview (from the data URI)
  - File name, MIME type, and size (formatted)
  - Two read-only `<textarea>` blocks: **Data URI** and **Base64 only**, each with its own **Copy** button

### `imageFormat.ts` — magic-byte signatures
Base64-prefix checks against the start of the raw payload (no decoding needed for detection):

| Format | Base64 prefix | MIME type |
|--------|--------------|-----------|
| PNG | `iVBORw0KG` | `image/png` |
| JPEG | `/9j/` | `image/jpeg` |
| GIF | `R0lGOD` | `image/gif` |
| WebP | `UklGR` | `image/webp` |
| BMP | `Qk` | `image/bmp` |

Also exports a `formatBytes(n: number): string` helper (B/KB/MB) shared by both panels.

---

## Error Handling

- Invalid base64 (`atob` throws) → "Invalid base64 string" inline in the Decode panel; preview cleared
- Unrecognized format with no data URI prefix → "Couldn't detect image format — try pasting a full data URI" inline in the Decode panel
- Corrupted image data (valid base64, but `<img>` fails to render) → "Failed to render image — data may be corrupted"
- Encode panel: non-image file selected → "Please select an image file" (also enforced via `accept="image/*"`)
- Errors are scoped to their own panel and don't affect the other side

---

## Testing

No automated test framework exists in `smiley-web`. Verification is manual via `npm run dev`:
- Paste a valid PNG data URI → preview renders, dimensions/size shown, copy/download work
- Paste raw base64 (no prefix) for PNG/JPEG/GIF/WebP/BMP → format auto-detected, preview renders
- Paste invalid base64 → error shown, no preview
- Paste valid base64 with unrecognized signature and no data URI → error shown
- Upload an image in the Encode panel → preview, data URI, and base64 output all populate correctly; copy buttons work
- Upload a non-image file → rejected with error
- Verify hub page at `/tools` shows the Base64 ↔ Image card and navigates correctly
- Verify "Tools" nav icon appears and breadcrumb shows "/ Tools" on both `/tools` and `/tools/base64-image`
