import { RefreshCw } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useQuantPositions } from '../../hooks/useQuant'

export default function PositionsPage() {
  const { data: positions = [], isLoading, refetch, isFetching } = useQuantPositions()

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Positions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {positions.length} open position{positions.length !== 1 ? 's' : ''} · SIMULATE mode
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isFetching && <Spinner size={14} />}
          <button className="btn-ghost" onClick={() => refetch()} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {isLoading ? <Spinner /> : positions.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          No open positions.
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Ticker', 'Market', 'Entry Date', 'Entry Price', 'Qty', 'Cost Basis', 'Days Held', 'Stop Loss', 'Take Profit', 'Mode'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(p => {
                const daysHeld = Math.floor((Date.now() - new Date(p.entry_date).getTime()) / 86400000)
                const costBasis = (Number(p.quantity) * Number(p.entry_price)).toFixed(2)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontWeight: 500 }}>{p.ticker}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12 }}>{p.market}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: 'IBM Plex Mono' }}>{p.entry_date}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>{Number(p.entry_price).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono' }}>{p.quantity}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--text-muted)' }}>
                      {costBasis}
                      <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>cost</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>
                      {daysHeld}d
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--accent-red)' }}>{Number(p.stop_loss).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--accent-green)' }}>{Number(p.take_profit).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{p.mode}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
