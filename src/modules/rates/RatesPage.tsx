import { useRates } from '../../hooks/useRates'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import TransferAlertBanner from './TransferAlertBanner'

export default function RatesPage() {
  const { latestQuery, dailyQuery } = useRates()

  const latest = latestQuery.data
  const daily = dailyQuery.data ?? []

  const chartData = daily.map(r => ({
    date: format(parseISO(r.rate_date), 'MMM d'),
    rate: Number(parseFloat(r.buy_rate).toFixed(4)),
  }))

  const sparkData = chartData.slice(-7)
  const rates = daily.map(r => parseFloat(r.buy_rate))
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
  const min = rates.length ? Math.min(...rates) : null
  const max = rates.length ? Math.max(...rates) : null
  const currentRate = latest ? parseFloat(String(latest.buy_rate)) : null
  const sevenDayAgo = daily[daily.length - 8] ? parseFloat(daily[daily.length - 8].buy_rate) : null
  const change7d = currentRate && sevenDayAgo ? (currentRate - sevenDayAgo) / sevenDayAgo : null

  const changeColor = !change7d ? 'var(--text-muted)' : change7d > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  const TrendIcon = !change7d ? Minus : change7d > 0 ? TrendingUp : TrendingDown

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TransferAlertBanner />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Exchange Rates</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>SGD → MYR</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(latestQuery.isFetching || dailyQuery.isFetching) && <Spinner size={16} />}
          <button className="btn-ghost" onClick={() => { latestQuery.refetch(); dailyQuery.refetch() }} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <GlassCard style={{ padding: '28px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Current Rate</p>
          {latestQuery.isLoading ? <Spinner /> : (
            <>
              <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 48, letterSpacing: '-0.03em', color: 'var(--accent-cyan)', lineHeight: 1, marginBottom: 8 }}>
                {currentRate?.toFixed(4) ?? '—'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: changeColor, fontSize: 13, fontFamily: 'IBM Plex Mono' }}>
                  <TrendIcon size={14} />
                  {change7d !== null ? `${change7d > 0 ? '+' : ''}${(change7d * 100).toFixed(2)}%` : '—'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>7-day change</span>
              </div>
              {latest?.rate_date && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'IBM Plex Mono' }}>
                  Updated {format(parseISO(latest.rate_date), 'MMM d, HH:mm')}
                </p>
              )}
            </>
          )}
        </GlassCard>

        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>7-Day Trend</p>
          {sparkData.length > 0 ? (
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={2} fill="url(#sparkGrad)" dot={false} />
                <Tooltip contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} formatter={(v: number) => [v.toFixed(4), 'SGD→MYR']} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {dailyQuery.isLoading ? <Spinner /> : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data</span>}
            </div>
          )}
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: '30-Day Avg', value: avg?.toFixed(4), color: 'var(--accent-cyan)' },
          { label: 'Period Low',  value: min?.toFixed(4), color: 'var(--accent-red)' },
          { label: 'Period High', value: max?.toFixed(4), color: 'var(--accent-green)' },
        ].map(s => (
          <GlassCard key={s.label} style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 500, color: s.color }}>
              {dailyQuery.isLoading ? '—' : (s.value ?? '—')}
            </p>
          </GlassCard>
        ))}
      </div>

      <GlassCard style={{ padding: '20px 22px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>30-Day History</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(3)} width={55} />
              <Tooltip contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} formatter={(v: number) => [v.toFixed(4), 'SGD→MYR']} />
              {avg && <ReferenceLine y={avg} stroke="rgba(6,182,212,0.3)" strokeDasharray="4 4" label={{ value: 'avg', fill: '#475569', fontSize: 10, fontFamily: 'IBM Plex Mono' }} />}
              <Line type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {dailyQuery.isLoading ? <Spinner /> : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data available</span>}
          </div>
        )}
      </GlassCard>

      {/* Rates table */}
      <GlassCard style={{ padding: '20px 22px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
          Daily Rates
        </p>
        {dailyQuery.isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            <Spinner size={14} /> Loading...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Date', 'Buy Rate', 'Sell Rate', 'Change', 'Readings'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: h === 'Date' ? 'left' : 'right',
                      fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...daily].reverse().map((row, i) => {
                  const buy = parseFloat(row.buy_rate)
                  const prevRow = [...daily].reverse()[i + 1]
                  const prevBuy = prevRow ? parseFloat(prevRow.buy_rate) : null
                  const change = prevBuy ? buy - prevBuy : null
                  const changeColor = !change ? 'var(--text-muted)'
                    : change > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                  return (
                    <tr
                      key={row.rate_date}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {format(parseISO(row.rate_date), 'EEE, MMM d yyyy')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono', fontWeight: 500, color: 'var(--accent-cyan)' }}>
                        {buy.toFixed(4)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)' }}>
                        {parseFloat(row.sell_rate).toFixed(4)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono', fontSize: 12, color: changeColor }}>
                        {change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(4)}`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-muted)' }}>
                        {row.count}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
