import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useQuantSignals, useTopSignals, useLatestModel } from '../../hooks/useQuant'

const DIRECTION_COLORS: Record<string, string> = {
  BUY: 'var(--accent-green)',
  SELL: 'var(--accent-red)',
  HOLD: 'var(--text-muted)',
}

type Tab = 'US' | 'SGX' | 'Top Picks'

export default function SignalsPage() {
  const [tab, setTab] = useState<Tab>('US')
  const market = tab === 'SGX' ? 'SGX' : 'US'

  const signalsQ = useQuantSignals(tab !== 'Top Picks' ? market : undefined)
  const topQ = useTopSignals(market)
  const modelQ = useLatestModel(market)

  const isTopPicks = tab === 'Top Picks'
  const activeQ = isTopPicks ? topQ : signalsQ
  const { data: signals = [], isLoading, refetch, isFetching } = activeQ

  const buys = signals.filter((s: { direction: string }) => s.direction === 'BUY')
  const sells = signals.filter((s: { direction: string }) => s.direction === 'SELL')
  const model = modelQ.data

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Signals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {buys.length} BUY · {sells.length} SELL
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['US', 'SGX', 'Top Picks'] as Tab[]).map(m => (
            <button key={m} className={tab === m ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => setTab(m)}>{m}</button>
          ))}
          {isFetching && <Spinner size={14} />}
          <button className="btn-ghost" onClick={() => refetch()} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Model info card — Top Picks only */}
      {isTopPicks && model && (
        <GlassCard style={{ padding: '14px 20px', display: 'flex', gap: 32, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Model</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 13 }}>{model.market} · {model.trained_at ? new Date(model.trained_at).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Accuracy</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 500, color: 'var(--accent-cyan)' }}>
              {model.accuracy != null ? `${(Number(model.accuracy) * 100).toFixed(1)}%` : '—'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>AUC</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 500, color: 'var(--accent-green)' }}>
              {model.auc != null ? Number(model.auc).toFixed(4) : '—'}
            </p>
          </div>
          {model.train_end && (
            <div style={{ marginLeft: 'auto' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Train end: {model.train_end}</p>
            </div>
          )}
        </GlassCard>
      )}

      {isLoading ? <Spinner /> : signals.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          {isTopPicks ? 'No top signals available. Run the pipeline to generate signals.' : 'No signals yet. Run the pipeline to generate signals.'}
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Ticker', 'Score', 'Direction', 'Model', 'Generated'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s: {
                id: string | number
                ticker: string
                score: number
                direction: string
                model_version?: string
                generated_at: string
                top_features?: string[]
              }) => (
                <>
                  <tr key={s.id} style={{ borderBottom: isTopPicks && s.top_features?.length ? undefined : '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontWeight: 500 }}>{s.ticker}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>{s.score.toFixed(4)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: DIRECTION_COLORS[s.direction], fontWeight: 600, fontSize: 12 }}>{s.direction}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{s.model_version}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.generated_at).toLocaleDateString()}</td>
                  </tr>
                  {isTopPicks && s.top_features && s.top_features.length > 0 && (
                    <tr key={`${s.id}-features`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td colSpan={5} style={{ padding: '0 16px 8px', fontSize: 11, color: 'var(--text-muted)' }}>
                        {s.top_features.map((f: string) => (
                          <span key={f} style={{ marginRight: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 8px' }}>{f}</span>
                        ))}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
