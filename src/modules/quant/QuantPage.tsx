import { Link } from 'react-router-dom'
import { BarChart2, TrendingUp, Activity, Briefcase, Database, CheckCircle, XCircle, AlertCircle, Settings2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import {
  useQuantHealth,
  useQuantPositions,
  useQuantTrades,
  useQuantJobs,
  useQuantPerformanceSummary,
  useQuantPerformance,
} from '../../hooks/useQuant'

export default function QuantPage() {
  const healthQ = useQuantHealth()
  const posQ = useQuantPositions()
  const tradesQ = useQuantTrades()
  const jobsQ = useQuantJobs()
  const perfSummaryQ = useQuantPerformanceSummary()
  const perfDataQ = useQuantPerformance(90)

  const trades = tradesQ.data ?? []
  const positions = posQ.data ?? []
  const jobs = jobsQ.data ?? []
  const lastJob = jobs[0]
  const summary = perfSummaryQ.data
  const perfData: Array<{ date: string; equity: number; daily_pnl?: number; drawdown?: number }> = perfDataQ.data ?? []

  const closedTrades = trades.filter(t => t.exit_date)
  const wins = closedTrades.filter(t => t.pnl > 0).length
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : null
  const totalPnlFromTrades = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

  const isOnline = healthQ.data?.status === 'ok'
  const StatusIcon = !healthQ.data ? AlertCircle : isOnline ? CheckCircle : XCircle
  const statusColor = !healthQ.data ? 'var(--text-muted)' : isOnline ? 'var(--accent-green)' : 'var(--accent-red)'

  // Prefer performance summary values; fall back to computed-from-trades
  const totalReturn = summary?.total_return != null
    ? `${Number(summary.total_return).toFixed(2)}%`
    : winRate != null ? `${winRate.toFixed(0)}% win` : '—'
  const todayPnl = summary?.daily_pnl != null
    ? Number(summary.daily_pnl)
    : null
  const maxDrawdown = summary?.drawdown != null
    ? `${Number(summary.drawdown).toFixed(2)}%`
    : '—'
  const openPositions = summary?.open_positions ?? positions.length
  const totalPnlDisplay = summary?.total_return != null
    ? totalReturn
    : `$${totalPnlFromTrades.toFixed(2)}`

  const cards = [
    { label: 'Signals', desc: "Today's BUY/SELL signals", to: '/quant/signals', icon: TrendingUp },
    { label: 'Positions', desc: 'Open paper positions', to: '/quant/positions', icon: Briefcase },
    { label: 'Backtest', desc: 'Run historical simulation', to: '/quant/backtest', icon: BarChart2 },
    { label: 'Universe', desc: 'Stock watchlist', to: '/quant/universe', icon: Database },
    { label: 'Jobs', desc: 'Scheduler job status', to: '/quant/jobs', icon: Activity },
    { label: 'Settings', desc: 'Credentials & container control', to: '/quant/settings', icon: Settings2 },
  ]

  const todayPnlColor = todayPnl == null
    ? 'var(--text-primary)'
    : todayPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Quant Bot</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>US + SGX swing trading</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {healthQ.isLoading ? <Spinner size={14} /> : (
            <StatusIcon size={16} color={statusColor} />
          )}
          <span style={{ fontSize: 12, color: statusColor }}>
            {healthQ.isLoading ? 'checking...' : isOnline ? 'API online' : 'API offline'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <GlassCard style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Total Return</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 500, color: totalPnlFromTrades >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {summary?.total_return != null ? totalReturn : `$${totalPnlFromTrades.toFixed(2)}`}
          </p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Today's P&L</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 500, color: todayPnlColor }}>
            {todayPnl != null ? `$${todayPnl.toFixed(2)}` : '—'}
          </p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Max Drawdown</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 500, color: maxDrawdown !== '—' ? 'var(--accent-red)' : 'var(--text-primary)' }}>
            {maxDrawdown}
          </p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Open Positions</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 22, fontWeight: 500 }}>{posQ.isLoading ? '—' : openPositions}</p>
        </GlassCard>
      </div>

      {/* Equity curve */}
      {perfData && perfData.length > 0 ? (
        <GlassCard style={{ padding: '20px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, paddingLeft: 4 }}>Portfolio Equity (90d)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={perfData}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={55} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="equity" stroke="var(--accent-cyan)" strokeWidth={2} fill="url(#perfGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No performance data yet — run the daily pipeline to start tracking equity.
        </GlassCard>
      )}

      {/* Last job */}
      {lastJob && (
        <GlassCard style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last job:</span>
          <span style={{ fontSize: 12 }}>{lastJob.job_name}</span>
          <span style={{ fontSize: 12, color: lastJob.status === 'success' ? 'var(--accent-green)' : lastJob.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
            {lastJob.status}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {new Date(lastJob.started_at).toLocaleString()}
          </span>
        </GlassCard>
      )}

      {/* Module cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {cards.map(c => (
          <Link key={c.to} to={c.to} style={{ textDecoration: 'none' }}>
            <GlassCard style={{ padding: '20px', cursor: 'pointer', height: '100%' }}>
              <c.icon size={20} color="var(--accent-cyan)" />
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, marginTop: 10 }}>{c.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.desc}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
