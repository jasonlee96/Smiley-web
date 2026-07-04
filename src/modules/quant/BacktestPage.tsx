import { useState } from 'react'
import { Play } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useRunBacktest } from '../../hooks/useQuant'
import type { BacktestResult } from '../../types/quant'

export default function BacktestPage() {
  const [market, setMarket] = useState<'US' | 'SGX'>('US')
  const [lookback, setLookback] = useState(180)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const mutation = useRunBacktest()

  const run = () => {
    mutation.mutate({ market, lookback_days: lookback }, {
      onSuccess: (data) => setResult(data),
    })
  }

  const metrics = result ? [
    { label: 'Total Return', value: `${(result.total_return * 100).toFixed(2)}%`, color: result.total_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Ann. Return', value: `${(result.annualised_return * 100).toFixed(2)}%`, color: result.annualised_return >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
    { label: 'Sharpe', value: result.sharpe.toFixed(2), color: result.sharpe >= 1 ? 'var(--accent-green)' : 'var(--text-primary)' },
    { label: 'Max Drawdown', value: `${(result.max_drawdown * 100).toFixed(2)}%`, color: 'var(--accent-red)' },
    { label: 'Win Rate', value: `${(result.win_rate * 100).toFixed(1)}%` },
    { label: 'Profit Factor', value: result.profit_factor === Infinity ? '∞' : result.profit_factor.toFixed(2), color: result.profit_factor >= 1.5 ? 'var(--accent-green)' : 'var(--text-primary)' },
    { label: 'Avg Hold', value: `${result.avg_hold_days.toFixed(1)}d` },
    { label: 'Trades', value: String(result.trade_count) },
  ] : []

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Backtest</h1>

      <GlassCard style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Market</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['US', 'SGX'] as const).map(m => (
              <button key={m} className={market === m ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setMarket(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Lookback (days)</label>
          <select value={lookback} onChange={e => setLookback(Number(e.target.value))}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', color: 'var(--text-primary)', fontSize: 13 }}>
            {[90, 180, 365, 730].map(d => <option key={d} value={d}>{d}d</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={run} disabled={mutation.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px' }}>
          {mutation.isPending ? <Spinner size={14} /> : <Play size={14} />}
          Run Backtest
        </button>
        {mutation.isError && (
          <span style={{ fontSize: 12, color: 'var(--accent-red)' }}>Error running backtest</span>
        )}
      </GlassCard>

      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {metrics.map(m => (
              <GlassCard key={m.label} style={{ padding: '14px 18px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{m.label}</p>
                <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 500, color: m.color ?? 'var(--text-primary)' }}>{m.value}</p>
              </GlassCard>
            ))}
          </div>

          {result.equity_curve.length > 0 && (
            <GlassCard style={{ padding: '20px 16px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, paddingLeft: 4 }}>Equity Curve</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={result.equity_curve}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="equity" stroke="var(--accent-cyan)" strokeWidth={2} fill="url(#eqGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
        </>
      )}
    </div>
  )
}
