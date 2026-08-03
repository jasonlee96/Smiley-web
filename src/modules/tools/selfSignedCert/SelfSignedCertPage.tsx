import { useState } from 'react'
import { AlertCircle, Download } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import CopyButton from '../../../components/CopyButton'
import { generateSelfSignedCert, parseSans, type GeneratedCert } from './certGenerator'

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/x-pem-file' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function SelfSignedCertPage() {
  const [commonName, setCommonName] = useState('localhost')
  const [sans, setSans] = useState('localhost, 127.0.0.1')
  const [validityDays, setValidityDays] = useState('365')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedCert | null>(null)

  const sanWarning = parseSans(sans).dnsNames.length === 0 && parseSans(sans).ips.length === 0
    ? 'At least one SAN is recommended — most clients ignore Common Name alone'
    : null

  const handleGenerate = async () => {
    if (!commonName.trim()) {
      setError('Common Name is required')
      return
    }
    const days = Number(validityDays)
    if (!Number.isFinite(days) || days <= 0) {
      setError('Validity must be a positive number of days')
      return
    }

    setError(null)
    setGenerating(true)
    try {
      const cert = await generateSelfSignedCert({ commonName: commonName.trim(), sans, validityDays: days })
      setResult(cert)
    } catch (e) {
      setError(`Failed to generate certificate — check your inputs (${(e as Error).message})`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Self-Signed Certificate</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Generate an RSA-2048 self-signed cert/key pair for local HTTPS testing
        </p>
      </div>

      <GlassCard style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Common Name</label>
          <input
            className="input"
            value={commonName}
            onChange={e => setCommonName(e.target.value)}
            placeholder="localhost"
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Subject Alternative Names</label>
          <input
            className="input"
            value={sans}
            onChange={e => setSans(e.target.value)}
            placeholder="localhost, 127.0.0.1"
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Comma-separated DNS names and/or IP addresses. Most clients require SAN entries — not just Common Name — to trust the cert for a given host.
          </p>
          {sanWarning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber, #f59e0b)', fontSize: 12, marginTop: 4 }}>
              <AlertCircle size={12} />
              {sanWarning}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Validity (days)</label>
          <input
            className="input"
            type="number"
            value={validityDays}
            onChange={e => setValidityDays(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', fontSize: 13 }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button className="btn-ghost" onClick={handleGenerate} disabled={generating} type="button">
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </GlassCard>

      {result && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <GlassCard style={{ padding: 20, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Certificate — cert.pem</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Use on the <strong>server</strong> side (e.g. Shipyard&apos;s <code>TLS_CERT_PATH</code>, or any HTTPS server&apos;s cert config).
            </p>
            <textarea
              className="input"
              readOnly
              rows={8}
              value={result.certPem}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CopyButton text={result.certPem} />
              <button className="btn-ghost" onClick={() => downloadText(result.certPem, 'cert.pem')} type="button">
                <Download size={13} /> cert.pem
              </button>
              <button className="btn-ghost" onClick={() => downloadText(result.certPem, 'cert.crt')} type="button">
                <Download size={13} /> cert.crt
              </button>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 20, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Private Key — key.pem</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Use on the <strong>server</strong> side too (<code>TLS_KEY_PATH</code>) — keep this secret. Never commit it or send it anywhere.
            </p>
            <textarea
              className="input"
              readOnly
              rows={8}
              value={result.keyPem}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CopyButton text={result.keyPem} />
              <button className="btn-ghost" onClick={() => downloadText(result.keyPem, 'key.pem')} type="button">
                <Download size={13} /> key.pem
              </button>
              <button className="btn-ghost" onClick={() => downloadText(result.keyPem, 'key.key')} type="button">
                <Download size={13} /> key.key
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {result && (
        <GlassCard style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Client side:</strong> this is a self-signed cert — it isn&apos;t issued by a
          CA your OS/browser already trusts, so any client connecting to a server using it (a browser, <code>curl</code>, this app&apos;s
          own requests if pointed at it, etc.) will show a certificate-trust warning by default. For local testing, either bypass
          verification on the client (<code>curl -k</code>, &quot;proceed anyway&quot; in a browser) or import <code>cert.pem</code> into
          that client machine&apos;s trusted root store for a persistent trust relationship. There&apos;s no separate &quot;client file&quot;
          to generate — the client side is about trust configuration, not a cert.
        </GlassCard>
      )}
    </div>
  )
}
