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
