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
