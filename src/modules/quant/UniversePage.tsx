import { useState } from 'react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useQuantUniverse } from '../../hooks/useQuant'

export default function UniversePage() {
  const [market, setMarket] = useState<'US' | 'SGX' | 'ALL'>('ALL')
  const { data: stocks = [], isLoading } = useQuantUniverse(market === 'ALL' ? undefined : market)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Universe</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{stocks.length} stocks</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['ALL', 'US', 'SGX'] as const).map(m => (
            <button key={m} className={market === m ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => setMarket(m)}>{m}</button>
          ))}
        </div>
      </div>

      {isLoading ? <Spinner /> : (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Ticker', 'Market', 'Name', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '9px 16px', fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 13 }}>{s.ticker}</td>
                  <td style={{ padding: '9px 16px', fontSize: 12 }}>{s.market}</td>
                  <td style={{ padding: '9px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.name ?? '—'}</td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: s.active ? 'rgba(16,185,129,0.12)' : 'rgba(99,99,99,0.12)', color: s.active ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      {s.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
