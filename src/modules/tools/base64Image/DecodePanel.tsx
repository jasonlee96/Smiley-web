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
  const [dims, setDims] = useState<{ uri: string; w: number; h: number } | null>(null)
  const [errorUri, setErrorUri] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300)
    return () => clearTimeout(t)
  }, [input])

  const result = useMemo(() => decode(debounced), [debounced])

  const dimensions = result.image && dims?.uri === result.image.dataUri ? dims : null
  const renderError = !!(result.image && errorUri === result.image.dataUri)

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
              onLoad={e => setDims({ uri: result.image!.dataUri, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setErrorUri(result.image!.dataUri)}
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
