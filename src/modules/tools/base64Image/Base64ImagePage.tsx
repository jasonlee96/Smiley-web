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
