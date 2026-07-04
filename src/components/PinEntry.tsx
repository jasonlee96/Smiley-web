import { useState, useRef } from 'react'

export default function PinEntry({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    setError(false)
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'https://ip-172-31-2-167.tail9203bc.ts.net/api'
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) {
        const { token } = await res.json()
        onSuccess(token)
      } else {
        setError(true)
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div className="glass-card animate-slide-up" style={{
        width: '100%',
        maxWidth: 380,
        padding: '40px 36px',
        textAlign: 'center',
      }}>
        {/* Logo mark */}
        <div style={{
          width: 52, height: 52,
          background: 'var(--accent-cyan-dim)',
          border: '1px solid var(--border-active)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 22,
        }}>
          ⌘
        </div>

        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 26,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 6,
        }}>
          Smiley Web
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
          Enter your PIN to continue
        </p>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="••••••"
            autoFocus
            style={{
              width: '100%',
              background: 'var(--bg-elevated)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 20,
              textAlign: 'center',
              letterSpacing: '0.3em',
              color: error ? 'var(--accent-red)' : 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'IBM Plex Mono, monospace',
              marginBottom: 16,
              transition: 'border-color 0.2s',
            }}
          />
          {error && (
            <p style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 12 }}>
              Invalid PIN. Try again.
            </p>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !pin}
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
          >
            {loading ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  )
}
