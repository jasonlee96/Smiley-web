# Dev Tools Hub + Base64 ↔ Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Dev Tools" hub to Smiley Web (`/tools`) with a Base64 ↔ Image converter (`/tools/base64-image`) — decode base64/data URIs to an image preview with copy/download, and encode an uploaded image to base64/data URI with copy.

**Architecture:** New `src/modules/tools/` module: a registry-driven hub page (`ToolsHubPage`) rendering `GlassCard`s from a `TOOLS` array, and a `Base64ImagePage` with two side-by-side `GlassCard` panels (`DecodePanel`, `EncodePanel`). A new shared `CopyButton` component (mirroring the existing copy-to-clipboard pattern in `TourDetailPage.tsx`) is used by both panels. A "Tools" nav entry (Wrench icon) is added to `Layout.tsx`, and two routes are added to `App.tsx`. Everything is client-side — `FileReader`, `<img>` `onload`/`onerror`, and base64 magic-byte sniffing. No backend/API changes.

**Tech Stack:** React 18 + TypeScript + Vite, react-router-dom v6, lucide-react icons, existing `GlassCard` / CSS custom-property design system (`src/index.css`).

**Project notes for this plan:**
- `smiley-web` is **not a git repository** (verified: `git rev-parse --is-inside-work-tree` fails). There are no commit steps — each task ends with a verification step instead.
- No test framework exists (`package.json` has only `dev`/`build`/`preview`). Per the approved spec, verification is: `npx tsc --noEmit` after each code task (baseline confirmed clean, exits with no output), and a full manual browser pass in the final task.
- Spec: `docs/superpowers/specs/2026-06-11-dev-tools-base64-image-design.md`

---

### Task 1: Image format utilities

**Files:**
- Create: `src/modules/tools/base64Image/imageFormat.ts`

- [ ] **Step 1: Create `imageFormat.ts`**

```ts
// Base64 magic-byte signatures for common image formats (no data URI prefix)
const SIGNATURES: { prefix: string; mime: string }[] = [
  { prefix: 'iVBORw0KG', mime: 'image/png' },
  { prefix: '/9j/', mime: 'image/jpeg' },
  { prefix: 'R0lGOD', mime: 'image/gif' },
  { prefix: 'UklGR', mime: 'image/webp' },
  { prefix: 'Qk', mime: 'image/bmp' },
]

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
}

export interface DetectedFormat {
  mime: string
}

/** Strip whitespace/newlines from a pasted base64 string. */
export function cleanBase64(input: string): string {
  return input.replace(/\s+/g, '')
}

/** Parse a `data:image/...;base64,...` URI into its MIME type and base64 payload. */
export function parseDataUri(input: string): { mime: string; base64: string } | null {
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s)
  if (!match) return null
  return { mime: match[1], base64: cleanBase64(match[2]) }
}

/** Sniff an image format from the start of a raw (no data URI prefix) base64 string. */
export function detectFormatFromBase64(base64: string): DetectedFormat | null {
  for (const sig of SIGNATURES) {
    if (base64.startsWith(sig.prefix)) return { mime: sig.mime }
  }
  return null
}

/** True if the string is well-formed base64 (charset + padding + length % 4 == 0). */
export function isValidBase64(base64: string): boolean {
  if (base64.length === 0 || base64.length % 4 !== 0) return false
  return /^[A-Za-z0-9+/]+={0,2}$/.test(base64)
}

/** Decoded byte length of a base64 string, accounting for padding. */
export function base64ByteLength(base64: string): number {
  const len = base64.length
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((len * 3) / 4) - padding
}

/** Format a byte count as B / KB / MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** File extension (no dot) for a MIME type, falling back to 'bin'. */
export function extFromMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin'
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output (clean — matches the pre-change baseline)

---

### Task 2: Shared CopyButton component

**Files:**
- Create: `src/components/CopyButton.tsx`

This mirrors the existing `CopyButton`/`fallbackCopy` pattern in `src/modules/splitwise/TourDetailPage.tsx:46-71`, generalized as a shared component with a `label` prop and styled with the existing `.btn-ghost` class.

- [ ] **Step 1: Create `CopyButton.tsx`**

```tsx
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

function fallbackCopy(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export default function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button className="btn-ghost" onClick={copy} disabled={!text} type="button">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : label}
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

---

### Task 3: Tools registry + Hub page

**Files:**
- Create: `src/modules/tools/toolsRegistry.ts`
- Create: `src/modules/tools/ToolsHubPage.tsx`

- [ ] **Step 1: Create `toolsRegistry.ts`**

```ts
import { Image, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'

export type ToolIcon = ComponentType<LucideProps>

export interface ToolEntry {
  id: string
  label: string
  description: string
  icon: ToolIcon
  path: string
}

export const TOOLS: ToolEntry[] = [
  {
    id: 'base64-image',
    label: 'Base64 ↔ Image',
    description: 'Decode base64/data URIs to an image preview, or encode an image to base64.',
    icon: Image,
    path: '/tools/base64-image',
  },
]
```

- [ ] **Step 2: Create `ToolsHubPage.tsx`**

```tsx
import { Link } from 'react-router-dom'
import GlassCard from '../../components/GlassCard'
import { TOOLS } from './toolsRegistry'

export default function ToolsHubPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Dev Tools</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Small utilities for everyday dev tasks</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {TOOLS.map(tool => {
          const Icon = tool.icon
          return (
            <Link key={tool.id} to={tool.path} style={{ textDecoration: 'none' }}>
              <GlassCard style={{ padding: 20, cursor: 'pointer', height: '100%' }}>
                <Icon size={20} color="var(--accent-cyan)" />
                <p style={{ fontWeight: 600, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{tool.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tool.description}</p>
              </GlassCard>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

---

### Task 4: Decode panel (Base64/data URI → Image)

**Files:**
- Create: `src/modules/tools/base64Image/DecodePanel.tsx`

- [ ] **Step 1: Create `DecodePanel.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Download } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import CopyButton from '../../../components/CopyButton'
import {
  base64ByteLength,
  cleanBase64,
  detectFormatFromBase64,
  extFromMime,
  formatBytes,
  isValidBase64,
  parseDataUri,
} from './imageFormat'

interface DecodedImage {
  dataUri: string
  mime: string
  ext: string
  byteSize: number
}

interface DecodeResult {
  image?: DecodedImage
  error?: string
}

function decode(raw: string): DecodeResult {
  const trimmed = raw.trim()
  if (!trimmed) return {}

  let mime: string
  let base64: string

  const dataUri = parseDataUri(trimmed)
  if (dataUri) {
    mime = dataUri.mime
    base64 = dataUri.base64
  } else {
    base64 = cleanBase64(trimmed)
    const detected = detectFormatFromBase64(base64)
    if (!detected) {
      return { error: "Couldn't detect image format — try pasting a full data URI" }
    }
    mime = detected.mime
  }

  if (!isValidBase64(base64)) {
    return { error: 'Invalid base64 string' }
  }

  return {
    image: {
      dataUri: `data:${mime};base64,${base64}`,
      mime,
      ext: extFromMime(mime),
      byteSize: base64ByteLength(base64),
    },
  }
}

export default function DecodePanel() {
  const [input, setInput] = useState('')
  const [debounced, setDebounced] = useState('')
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null)
  const [renderError, setRenderError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300)
    return () => clearTimeout(t)
  }, [input])

  const result = useMemo(() => decode(debounced), [debounced])

  useEffect(() => {
    setRenderError(false)
    setDimensions(null)
  }, [result.image?.dataUri])

  const handleDownload = () => {
    if (!result.image) return
    const a = document.createElement('a')
    a.href = result.image.dataUri
    a.download = `image.${result.image.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <GlassCard style={{ padding: 20, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Decode</h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paste a base64 string or data URI</p>

      <textarea
        className="input"
        rows={6}
        placeholder="data:image/png;base64,iVBORw0KG... or raw base64"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, resize: 'vertical' }}
      />

      {result.error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', fontSize: 13 }}>
          <AlertCircle size={14} />
          {result.error}
        </div>
      )}

      {result.image && !renderError && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
            <img
              src={result.image.dataUri}
              alt="Decoded preview"
              onLoad={e => setDimensions({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setRenderError(true)}
              style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span>Format: {result.image.mime}</span>
            {dimensions && <span>{dimensions.w} × {dimensions.h} px</span>}
            <span>{formatBytes(result.image.byteSize)}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <CopyButton text={result.image.dataUri} label="Copy Data URI" />
            <button className="btn-ghost" onClick={handleDownload} type="button">
              <Download size={13} /> Download Image
            </button>
          </div>
        </>
      )}

      {result.image && renderError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', fontSize: 13 }}>
          <AlertCircle size={14} />
          Failed to render image — data may be corrupted
        </div>
      )}
    </GlassCard>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

---

### Task 5: Encode panel (Image → Base64/data URI)

**Files:**
- Create: `src/modules/tools/base64Image/EncodePanel.tsx`

- [ ] **Step 1: Create `EncodePanel.tsx`**

```tsx
import { useRef, useState, type DragEvent } from 'react'
import { AlertCircle, UploadCloud } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import CopyButton from '../../../components/CopyButton'
import { formatBytes } from './imageFormat'

interface EncodedImage {
  dataUri: string
  base64: string
  mime: string
  fileName: string
  size: number
}

export default function EncodePanel() {
  const [image, setImage] = useState<EncodedImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      setImage(null)
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string
      const commaIdx = dataUri.indexOf(',')
      setImage({
        dataUri,
        base64: dataUri.slice(commaIdx + 1),
        mime: file.type,
        fileName: file.name,
        size: file.size,
      })
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <GlassCard style={{ padding: 20, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Encode</h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload an image to get its base64</p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        style={{
          border: `1px dashed ${dragActive ? 'var(--border-active)' : 'var(--border)'}`,
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: 13,
          background: dragActive ? 'var(--accent-cyan-dim)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <UploadCloud size={20} style={{ marginBottom: 8 }} />
        <div>Drag &amp; drop an image, or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', fontSize: 13 }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {image && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
            <img src={image.dataUri} alt="Selected" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span>{image.fileName}</span>
            <span>{image.mime}</span>
            <span>{formatBytes(image.size)}</span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data URI</span>
              <CopyButton text={image.dataUri} />
            </div>
            <textarea
              className="input"
              readOnly
              rows={3}
              value={image.dataUri}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, resize: 'vertical' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Base64</span>
              <CopyButton text={image.base64} />
            </div>
            <textarea
              className="input"
              readOnly
              rows={3}
              value={image.base64}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, resize: 'vertical' }}
            />
          </div>
        </>
      )}
    </GlassCard>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

---

### Task 6: Base64 ↔ Image page shell

**Files:**
- Create: `src/modules/tools/base64Image/Base64ImagePage.tsx`

- [ ] **Step 1: Create `Base64ImagePage.tsx`**

```tsx
import DecodePanel from './DecodePanel'
import EncodePanel from './EncodePanel'

export default function Base64ImagePage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Base64 ↔ Image</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Decode base64/data URIs to an image, or encode an image to base64
        </p>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <DecodePanel />
        <EncodePanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

---

### Task 7: Wire up routes and nav

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add imports to `src/App.tsx`**

Find this block near the top of the file:

```tsx
import QuantJobsPage from './modules/quant/JobsPage'
import SettingsPage from './modules/quant/SettingsPage'
```

Add two new imports immediately after it:

```tsx
import QuantJobsPage from './modules/quant/JobsPage'
import SettingsPage from './modules/quant/SettingsPage'
import ToolsHubPage from './modules/tools/ToolsHubPage'
import Base64ImagePage from './modules/tools/base64Image/Base64ImagePage'
```

- [ ] **Step 2: Add routes to `src/App.tsx`**

Find this block (the last two routes):

```tsx
        <Route path="/quant/jobs" element={<QuantJobsPage />} />
        <Route path="/quant/settings" element={<SettingsPage />} />
      </Routes>
```

Replace with:

```tsx
        <Route path="/quant/jobs" element={<QuantJobsPage />} />
        <Route path="/quant/settings" element={<SettingsPage />} />
        <Route path="/tools" element={<ToolsHubPage />} />
        <Route path="/tools/base64-image" element={<Base64ImagePage />} />
      </Routes>
```

- [ ] **Step 3: Add "Tools" nav entry to `src/components/Layout.tsx`**

Find this import line:

```tsx
import { CheckSquare, TrendingUp, Server, Activity, Cloud, Plane, LogOut, SplitSquareVertical, BarChart2 } from 'lucide-react'
```

Replace with:

```tsx
import { CheckSquare, TrendingUp, Server, Activity, Cloud, Plane, LogOut, SplitSquareVertical, BarChart2, Wrench } from 'lucide-react'
```

Find the `NAV` array:

```tsx
const NAV = [
  { to: '/todos',      label: 'Todos',    icon: CheckSquare },
  { to: '/rates',      label: 'Rates',    icon: TrendingUp },
  { to: '/ec2',        label: 'EC2',      icon: Server },
  { to: '/jobs',       label: 'Jobs',     icon: Activity },
  { to: '/weather',    label: 'Weather',  icon: Cloud },
  { to: '/trips',      label: 'Trips',    icon: Plane },
  { to: '/splitwise',  label: 'Splitter', icon: SplitSquareVertical },
  { to: '/quant',      label: 'Quant',    icon: BarChart2 },
]
```

Replace with:

```tsx
const NAV = [
  { to: '/todos',      label: 'Todos',    icon: CheckSquare },
  { to: '/rates',      label: 'Rates',    icon: TrendingUp },
  { to: '/ec2',        label: 'EC2',      icon: Server },
  { to: '/jobs',       label: 'Jobs',     icon: Activity },
  { to: '/weather',    label: 'Weather',  icon: Cloud },
  { to: '/trips',      label: 'Trips',    icon: Plane },
  { to: '/splitwise',  label: 'Splitter', icon: SplitSquareVertical },
  { to: '/quant',      label: 'Quant',    icon: BarChart2 },
  { to: '/tools',      label: 'Tools',    icon: Wrench },
]
```

- [ ] **Step 4: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

- [ ] **Step 5: Production build check**

Run: `cd /opt/smileyapp/smiley-web && npm run build`
Expected: build completes successfully (Vite outputs `dist/` with no errors)

---

### Task 8: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`
Expected: Vite prints a local URL (typically `http://localhost:5173`)

- [ ] **Step 2: Log in and navigate to the hub**

- Open the printed URL in a browser
- Enter PIN `112299` to unlock (per project memory; this hits the live `smiley-api` auth endpoint configured via `VITE_API_BASE_URL`)
- Confirm a new **wrench icon** ("Tools") appears in the top nav bar
- Click it → confirm `/tools` shows a "Dev Tools" header and a single card: "Base64 ↔ Image"
- Click the card → confirm navigation to `/tools/base64-image` and the breadcrumb reads "/ Tools"

- [ ] **Step 3: Test Decode — data URI**

In the Decode panel, paste this 1x1 red PNG data URI:
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==
```
Expected: a small red square preview appears, with "Format: image/png", "1 × 1 px", and a byte size shown. "Copy Data URI" and "Download Image" buttons are enabled.

- [ ] **Step 4: Test Decode — raw base64 (no prefix)**

Remove `data:image/png;base64,` from the start of the string above, leaving only the raw base64. Paste just the raw base64 into the Decode panel.
Expected: same red square preview and "Format: image/png" — confirms magic-byte detection works for PNG.

- [ ] **Step 5: Test Decode — error cases**

- Paste `not-valid-base64!!!` → expected: "Couldn't detect image format — try pasting a full data URI" (no recognized signature)
- Paste `aGVsbG8gd29ybGQ=` (valid base64 for "hello world", not an image) → expected: "Couldn't detect image format — try pasting a full data URI"
- Clear the textarea → expected: no preview, no error

- [ ] **Step 6: Test Decode — copy and download**

- With the PNG data URI from Step 3 still entered, click "Copy Data URI" → expected: button label briefly changes to "Copied"
- Click "Download Image" → expected: browser downloads a file named `image.png`

- [ ] **Step 7: Test Encode**

- In the Encode panel, click the drop zone and select any small image file (PNG or JPEG) from your machine
- Expected: image preview appears, with file name, MIME type, and size shown
- Expected: "Data URI" textarea contains `data:image/...;base64,...` and "Base64" textarea contains the same content without the prefix
- Click each "Copy" button → expected: each briefly shows "Copied"

- [ ] **Step 8: Test Encode — drag and drop**

- Drag an image file from your file manager onto the drop zone
- Expected: drop zone border highlights while dragging over it, and dropping behaves the same as Step 7

- [ ] **Step 9: Test Encode — non-image file**

- Select or drop a non-image file (e.g. a `.txt` file)
- Expected: "Please select an image file" error shown, no preview

- [ ] **Step 10: Responsive check**

- Resize the browser window to a narrow (mobile-width) viewport
- Expected: Decode and Encode panels stack vertically instead of side-by-side
