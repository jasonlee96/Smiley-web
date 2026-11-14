import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  LineChart,
  BarChart3,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  FileText,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import {
  useTradingProposals,
  useTradingWatchlist,
  useBotProposalReview,
  useRlStatus,
} from '../../hooks/useTrading'
import type { TradingOrderProposal } from '../../types/trading'

type FilterTab = 'ALL' | 'GAINS' | 'LOSSES' | 'EXECUTED' | 'PENDING'
type EnvFilter = 'ALL' | 'SIMULATE' | 'REAL'

function fmtPrice(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  if (v >= 1000) return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (v >= 1) return `$${v.toFixed(2)}`
  if (v >= 0.01) return `$${v.toFixed(4)}`
  return `$${v.toFixed(6)}`
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

export default function QuantPage() {
  const [filter, setFilter] = useState<FilterTab>('ALL')
  const [envFilter, setEnvFilter] = useState<EnvFilter>('ALL')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [expandAll, setExpandAll] = useState(false)

  const proposalsQ = useTradingProposals()
  const watchlistQ = useTradingWatchlist()
  const rlStatusQ = useRlStatus()
  const reviewMut = useBotProposalReview()

  const allProposals: TradingOrderProposal[] = proposalsQ.data?.proposals ?? []
  const simCount = useMemo(
    () => allProposals.filter(p => (p.trade_env || 'SIMULATE') === 'SIMULATE').length,
    [allProposals],
  )
  const realCount = useMemo(
    () => allProposals.filter(p => p.trade_env === 'REAL').length,
    [allProposals],
  )
  const proposals: TradingOrderProposal[] = useMemo(() => {
    if (envFilter === 'ALL') return allProposals
    return allProposals.filter(p => (p.trade_env || 'SIMULATE') === envFilter)
  }, [allProposals, envFilter])
  const watchlist = watchlistQ.data ?? []

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpandedIds(new Set())
      setExpandAll(false)
    } else {
      setExpandedIds(new Set(proposals.map(p => p.id)))
      setExpandAll(true)
    }
  }

  // Compute prediction performance stats
  const stats = useMemo(() => {
    if (proposals.length === 0) {
      return {
        total: 0,
        winRate: 0,
        gainCount: 0,
        lossCount: 0,
        avgDrift: 0,
        executedCount: 0,
        pendingCount: 0,
        totalRealizedPnl: 0,
        highConvictionWinRate: 0,
        highConvictionCount: 0,
        modConvictionWinRate: 0,
        modConvictionCount: 0,
      }
    }

    let gainCount = 0
    let lossCount = 0
    let driftSum = 0
    let executedCount = 0
    let totalRealized = 0

    let highConvCount = 0
    let highConvGains = 0
    let modConvCount = 0
    let modConvGains = 0

    proposals.forEach(p => {
      const drift = p.price_drift_pct ?? 0
      const isBuy = (p.side || 'BUY').toUpperCase() === 'BUY'
      const isPositiveOutcome = isBuy ? drift >= 0 : drift <= 0

      driftSum += drift

      if (isPositiveOutcome) {
        gainCount++
      } else {
        lossCount++
      }

      if (p.status === 'executed') {
        executedCount++
        totalRealized += (p.realized_pnl ?? 0)
      }

      // Conviction tiers
      if (p.proposed_dca_score >= 70) {
        highConvCount++
        if (isPositiveOutcome) highConvGains++
      } else if (p.proposed_dca_score >= 50) {
        modConvCount++
        if (isPositiveOutcome) modConvGains++
      }
    })

    const winRate = proposals.length > 0 ? (gainCount / proposals.length) * 100 : 0
    const avgDrift = driftSum / proposals.length

    return {
      total: proposals.length,
      winRate,
      gainCount,
      lossCount,
      avgDrift,
      executedCount,
      pendingCount: proposalsQ.data?.pending_count ?? proposals.filter(p => p.status === 'pending_approval').length,
      totalRealizedPnl: totalRealized,
      highConvictionWinRate: highConvCount > 0 ? (highConvGains / highConvCount) * 100 : 0,
      highConvictionCount: highConvCount,
      modConvictionWinRate: modConvCount > 0 ? (modConvGains / modConvCount) * 100 : 0,
      modConvictionCount: modConvCount,
    }
  }, [proposals, proposalsQ.data?.pending_count])

  // Filtered proposals list
  const filteredProposals = useMemo(() => {
    switch (filter) {
      case 'GAINS':
        return proposals.filter(p => (p.price_drift_pct ?? 0) >= 0)
      case 'LOSSES':
        return proposals.filter(p => (p.price_drift_pct ?? 0) < 0)
      case 'EXECUTED':
        return proposals.filter(p => p.status === 'executed')
      case 'PENDING':
        return proposals.filter(p => p.status === 'pending_approval')
      default:
        return proposals
    }
  }, [proposals, filter])

  // Chart data: Symbol vs Price Drift %
  const chartData = useMemo(() => {
    return proposals.slice(0, 15).map(p => ({
      symbol: p.symbol,
      drift: Number((p.price_drift_pct ?? 0).toFixed(2)),
      score: p.proposed_dca_score,
      status: p.status,
    }))
  }, [proposals])

  const isLoading = proposalsQ.isLoading

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner / Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
              Prediction Performance
            </h1>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(6,182,212,0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(6,182,212,0.3)',
            }}>
              LIVE MODEL
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Evaluating prediction accuracy, forward price drift, and decision model outcomes linked directly to the Trading Hub.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Top-level Environment Switcher (ALL / SIMULATE / REAL) */}
          <div style={{
            display: 'inline-flex',
            gap: 4,
            background: 'var(--bg-secondary)',
            padding: 4,
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            {(['ALL', 'SIMULATE', 'REAL'] as EnvFilter[]).map(env => (
              <button
                key={`top-${env}`}
                type="button"
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: envFilter === env
                    ? env === 'REAL'
                      ? '1px solid rgba(245,158,11,0.45)'
                      : '1px solid rgba(6,182,212,0.45)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  background: envFilter === env
                    ? env === 'REAL'
                      ? 'rgba(245,158,11,0.18)'
                      : 'rgba(6,182,212,0.18)'
                    : 'transparent',
                  color: envFilter === env
                    ? env === 'REAL'
                      ? 'var(--accent-amber)'
                      : 'var(--accent-cyan)'
                    : 'var(--text-muted)',
                }}
                onClick={() => setEnvFilter(env)}
              >
                {env === 'ALL'
                  ? `All Envs (${allProposals.length})`
                  : env === 'SIMULATE'
                    ? `🧪 SIMULATE (${simCount})`
                    : `💵 REAL (${realCount})`}
              </button>
            ))}
          </div>

          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }}
            onClick={() => reviewMut.mutate(undefined)}
            disabled={reviewMut.isPending}
            title="Trigger bot re-evaluation across all active proposals"
          >
            {reviewMut.isPending ? <Spinner size={14} /> : <Sparkles size={14} color="var(--accent-cyan)" />}
            {reviewMut.isPending ? 'Evaluating...' : 'Re-Evaluate Signals'}
          </button>

          <button
            className="btn-ghost"
            style={{ padding: '7px 10px' }}
            onClick={() => {
              proposalsQ.refetch()
              watchlistQ.refetch()
              rlStatusQ.refetch()
            }}
            title="Refresh latest data"
          >
            <RefreshCw size={14} className={proposalsQ.isFetching ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/internal/trading"
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              fontSize: 13,
              padding: '7px 16px',
            }}
          >
            <LineChart size={15} />
            Open Trading Hub
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* Main Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* Win Rate */}
        <GlassCard style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Prediction Win Rate
            </span>
            <CheckCircle2 size={15} color={stats.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)'} />
          </div>
          <p style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 26,
            fontWeight: 600,
            color: stats.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {isLoading ? '—' : `${stats.winRate.toFixed(1)}%`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {stats.gainCount} positive / {stats.lossCount} negative calls
          </p>
        </GlassCard>

        {/* Avg Drift */}
        <GlassCard style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Avg Forward Drift
            </span>
            {stats.avgDrift >= 0 ? <TrendingUp size={15} color="var(--accent-green)" /> : <TrendingDown size={15} color="var(--accent-red)" />}
          </div>
          <p style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 26,
            fontWeight: 600,
            color: stats.avgDrift >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {isLoading ? '—' : fmtPct(stats.avgDrift)}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Across {stats.total} tracked model calls
          </p>
        </GlassCard>

        {/* High Conviction Accuracy */}
        <GlassCard style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              High Conviction (70+ DCA)
            </span>
            <ShieldCheck size={15} color="var(--accent-cyan)" />
          </div>
          <p style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 26,
            fontWeight: 600,
            color: 'var(--accent-cyan)',
          }}>
            {isLoading ? '—' : `${stats.highConvictionWinRate.toFixed(1)}%`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {stats.highConvictionCount} high-conviction predictions
          </p>
        </GlassCard>

        {/* Realized P&L */}
        <GlassCard style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Realized Bot P&L
            </span>
            <Activity size={15} color={stats.totalRealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
          </div>
          <p style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 26,
            fontWeight: 600,
            color: stats.totalRealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {isLoading ? '—' : `$${stats.totalRealizedPnl.toFixed(2)}`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {stats.executedCount} executed orders completed
          </p>
        </GlassCard>
      </div>

      {/* Phase 1: Online RL Contextual Bandit Policy & Macro Regime Context */}
      {rlStatusQ.data?.policy && (
        <GlassCard style={{
          padding: '16px 20px',
          border: '1px solid rgba(6,182,212,0.25)',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, rgba(16,185,129,0.02) 100%)',
        }}>
          {(() => {
            const pol = rlStatusQ.data.policy
            const versionLabel = pol.version ?? pol.policy_version ?? '1.0'
            const episodesTrained = pol.total_episodes ?? pol.episodes_trained ?? 0
            const winRatePct = Number(pol.win_rate_pct ?? 0)
            const cumReward = Number(pol.cumulative_reward_pct ?? pol.cumulative_reward ?? 0)
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={16} color="var(--accent-cyan)" />
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>
                    Phase 1: Online RL Decision Policy &amp; Macro Regime Context
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: 'rgba(16,185,129,0.15)',
                    color: 'var(--accent-green)',
                    border: '1px solid rgba(16,185,129,0.3)',
                  }}>
                    POLICY v{versionLabel} · $0 API COST
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>
                    Episodes Trained:{' '}
                    <strong style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>
                      {episodesTrained}
                    </strong>
                  </span>
                  <span>
                    RL Episode Win Rate:{' '}
                    <strong style={{
                      fontFamily: 'IBM Plex Mono',
                      color: winRatePct >= 50 ? 'var(--accent-green)' : 'var(--accent-amber)',
                    }}>
                      {winRatePct.toFixed(1)}%
                    </strong>
                  </span>
                  <span>
                    Cumulative Reward:{' '}
                    <strong style={{
                      fontFamily: 'IBM Plex Mono',
                      color: cumReward >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}>
                      {cumReward >= 0 ? '+' : ''}
                      {cumReward.toFixed(2)}%
                    </strong>
                  </span>
                </div>
              </div>
            )
          })()}

          {/* 3 Macro Regime Cards (US, SGX, CRYPTO) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {(['US', 'SGX', 'CRYPTO'] as const).map((bucket) => {
              const reg = rlStatusQ.data?.regimes?.[bucket]
              if (!reg) return null
              const regimeStr = String(reg.regime || 'neutral')
              const isRiskOn = regimeStr === 'risk_on'
              const isRiskOff = regimeStr.startsWith('risk_off')
              const badgeColor = isRiskOn
                ? 'var(--accent-green)'
                : isRiskOff
                  ? 'var(--accent-red)'
                  : 'var(--accent-amber)'
              const badgeBg = isRiskOn
                ? 'rgba(16,185,129,0.14)'
                : isRiskOff
                  ? 'rgba(239,68,68,0.14)'
                  : 'rgba(245,158,11,0.14)'

              const ret5d = reg.benchmark_return_5d ?? reg.benchmark_return_5d_pct ?? 0
              const ret20d = reg.benchmark_return_20d ?? reg.benchmark_return_20d_pct ?? 0
              const rsiVal = Number(reg.benchmark_rsi ?? 50)
              const vixVal = reg.vix_level != null ? Number(reg.vix_level) : null
              const tnxVal = (reg.tnx_yield ?? reg.us10y_yield) != null ? Number(reg.tnx_yield ?? reg.us10y_yield) : null
              const summaryText = reg.summary || reg.summary_note || `${bucket} benchmark regime active.`

              return (
                <div
                  key={bucket}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                      {bucket} REGIME ({reg.benchmark_symbol || bucket})
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: badgeBg,
                      color: badgeColor,
                      textTransform: 'uppercase',
                    }}>
                      {regimeStr.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                    {summaryText}
                  </p>
                  <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', marginTop: 2, flexWrap: 'wrap' }}>
                    <span>5d: {fmtPct(ret5d)}</span>
                    <span>20d: {fmtPct(ret20d)}</span>
                    <span>RSI: {rsiVal.toFixed(1)}</span>
                    {vixVal != null && <span>VIX: {vixVal.toFixed(1)}</span>}
                    {tnxVal != null && <span>10Y: {tnxVal.toFixed(2)}%</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Chart: Price Drift by Recent Prediction */}
      {chartData.length > 0 && (
        <GlassCard style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Price Drift Distribution (% Return Since Signal)</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Measures the percentage movement from the model's proposed entry price to the current price.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-green)' }} />
                Gain / Bullish Hit
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent-red)' }} />
                Loss / Adverse Drift
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="symbol" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(val: any) => [`${val}%`, 'Price Drift']}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Bar dataKey="drift" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.drift >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Conviction Tier Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <GlassCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(6,182,212,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)',
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>High Conviction (70–100)</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 600, color: 'var(--accent-cyan)' }}>
              {stats.highConvictionCount > 0 ? `${stats.highConvictionWinRate.toFixed(1)}% Win Rate` : 'No samples'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.highConvictionCount} proposals generated</p>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(245,158,11,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber)',
          }}>
            <Layers size={20} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Moderate Conviction (50–69)</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 600, color: 'var(--accent-amber)' }}>
              {stats.modConvictionCount > 0 ? `${stats.modConvictionWinRate.toFixed(1)}% Win Rate` : 'No samples'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.modConvictionCount} proposals generated</p>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(16,185,129,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-green)',
          }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Watchlist Coverage</p>
            <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 600, color: 'var(--accent-green)' }}>
              {watchlist.length} Active Assets
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Real-time indicators & AI thesis tracked</p>
          </div>
        </GlassCard>
      </div>

      {/* Predictions & Outcome History Table */}
      <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Controls */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Model Prediction Logs & Decision Rationales</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Inspect each individual proposal, model entry score, un-truncated decision rationales, and bot re-evaluation outcomes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Expand / Collapse All Rationales Toggle */}
            <button
              className="btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                padding: '5px 12px',
                color: expandAll ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: expandAll ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--border)',
                background: expandAll ? 'rgba(6,182,212,0.08)' : 'transparent',
              }}
              onClick={toggleExpandAll}
              title="Toggle full rationales for all rows"
            >
              <MessageSquareText size={13} color={expandAll ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span>{expandAll ? 'Collapse Rationales' : 'Expand All Rationales'}</span>
            </button>

            {/* Environment Filter (ALL / SIMULATE / REAL) */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
              {(['ALL', 'SIMULATE', 'REAL'] as EnvFilter[]).map(env => (
                <button
                  key={env}
                  type="button"
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: envFilter === env
                      ? env === 'REAL'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(6,182,212,0.2)'
                      : 'transparent',
                    color: envFilter === env
                      ? env === 'REAL'
                        ? 'var(--accent-amber)'
                        : 'var(--accent-cyan)'
                      : 'var(--text-muted)',
                  }}
                  onClick={() => setEnvFilter(env)}
                >
                  {env === 'ALL' ? 'All Envs' : env === 'SIMULATE' ? '🧪 SIMULATE' : '💵 REAL'}
                </button>
              ))}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['ALL', 'GAINS', 'LOSSES', 'EXECUTED', 'PENDING'] as FilterTab[]).map(tab => (
                <button
                  key={tab}
                  className={filter === tab ? 'btn-primary' : 'btn-ghost'}
                  style={{ padding: '5px 12px', fontSize: 11, textTransform: 'capitalize' }}
                  onClick={() => setFilter(tab)}
                >
                  {tab === 'ALL' ? 'All Signals' : tab.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <Spinner />
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No proposals match the "{filter}" filter. Visit the{' '}
            <Link to="/internal/trading" style={{ color: 'var(--accent-cyan)' }}>Trading Hub</Link> to generate new model setups.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ width: 36, padding: '10px 8px 10px 16px' }} />
                  {['Asset / Symbol', 'Model Signal', 'Proposed Price', 'Current Price', 'Price Drift', 'Bot Review Status', 'Action'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map(p => {
                  const drift = p.price_drift_pct ?? 0
                  const isPositive = drift >= 0
                  const isExpanded = expandAll || expandedIds.has(p.id)
                  const statusBg =
                    p.status === 'executed'
                      ? 'rgba(16,185,129,0.14)'
                      : p.status === 'pending_approval'
                        ? 'rgba(6,182,212,0.14)'
                        : 'rgba(239,68,68,0.14)'
                  const statusColor =
                    p.status === 'executed'
                      ? 'var(--accent-green)'
                      : p.status === 'pending_approval'
                        ? 'var(--accent-cyan)'
                        : 'var(--accent-red)'

                  return (
                    <tr key={`group-${p.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {/* Main Summary Row */}
                            <tr
                              style={{
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                                background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                              }}
                              className="hover:bg-white/[0.03]"
                              onClick={() => toggleExpand(p.id)}
                            >
                              {/* Expand Toggle */}
                              <td style={{ width: 36, padding: '12px 8px 12px 16px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{
                                    padding: 4,
                                    borderRadius: 4,
                                    color: isExpanded ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleExpand(p.id)
                                  }}
                                  title={isExpanded ? 'Collapse rationale' : 'View full rationale'}
                                >
                                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              </td>

                              {/* Asset & Symbol */}
                              <td style={{ padding: '12px 16px', minWidth: 160 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 600, fontSize: 13 }}>
                                    {p.symbol}
                                  </span>
                                  <span style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-muted)',
                                    border: '1px solid var(--border)',
                                    textTransform: 'uppercase',
                                  }}>
                                    {p.asset_type || 'STOCK'}
                                  </span>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: p.trade_env === 'REAL' ? 'rgba(245,158,11,0.16)' : 'rgba(6,182,212,0.12)',
                                    color: p.trade_env === 'REAL' ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                                    border: `1px solid ${p.trade_env === 'REAL' ? 'rgba(245,158,11,0.35)' : 'rgba(6,182,212,0.3)'}`,
                                  }}>
                                    {p.trade_env === 'REAL' ? 'REAL' : 'SIM'}
                                  </span>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {p.name !== p.symbol ? p.name : ''} · {new Date(p.created_at).toLocaleDateString()}
                                </p>
                              </td>

                              {/* Signal & Score */}
                              <td style={{ padding: '12px 16px', minWidth: 180 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: p.proposed_signal?.toLowerCase().includes('buy') ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
                                    color: p.proposed_signal?.toLowerCase().includes('buy') ? 'var(--accent-green)' : 'var(--accent-red)',
                                  }}>
                                    {p.proposed_signal?.toUpperCase() || p.side}
                                  </span>
                                  <span style={{
                                    fontSize: 11,
                                    fontFamily: 'IBM Plex Mono',
                                    color: p.proposed_dca_score >= 70 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                                  }}>
                                    DCA: {p.proposed_dca_score}
                                  </span>
                                  {p.rl_q_score != null && (
                                    <span style={{
                                      fontSize: 10,
                                      fontFamily: 'IBM Plex Mono',
                                      padding: '1px 5px',
                                      borderRadius: 4,
                                      background: p.rl_q_score >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                      color: p.rl_q_score >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                                      border: `1px solid ${p.rl_q_score >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    }} title={`RL Expected Q-Edge: ${p.rl_q_score >= 0 ? '+' : ''}${p.rl_q_score.toFixed(1)}% · Macro: ${p.macro_regime || 'neutral'}`}>
                                      Q:{p.rl_q_score >= 0 ? '+' : ''}{p.rl_q_score.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && p.proposal_reason && (
                                  <p style={{
                                    fontSize: 11,
                                    color: 'var(--text-muted)',
                                    marginTop: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}>
                                    <span style={{ color: 'var(--accent-cyan)', fontSize: 10 }}>[Click to view full rationale]</span>
                                  </p>
                                )}
                              </td>

                              {/* Proposed Price */}
                              <td style={{ padding: '12px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13, minWidth: 110 }}>
                                {fmtPrice(p.proposed_price)}
                              </td>

                              {/* Current Price */}
                              <td style={{ padding: '12px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13, minWidth: 110 }}>
                                {fmtPrice(p.current_price)}
                              </td>

                              {/* Price Drift */}
                              <td style={{ padding: '12px 16px', minWidth: 110 }}>
                                <span style={{
                                  fontFamily: 'IBM Plex Mono',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                                }}>
                                  {fmtPct(drift)}
                                </span>
                              </td>

                              {/* Bot Review Status */}
                              <td style={{ padding: '12px 16px', minWidth: 170 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: 4,
                                    background: statusBg,
                                    color: statusColor,
                                    textTransform: 'uppercase',
                                  }}>
                                    {p.status.replace(/_/g, ' ')}
                                  </span>
                                  {p.still_worth_it ? (
                                    <span style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 500 }} title="Bot re-evaluated and confirmed setup is still valid">
                                      ● Valid
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 500 }} title="Bot flagged condition as faded / stale">
                                      ▲ Faded
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && (
                                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                                    Checked #{p.bot_review_count || 1}
                                  </p>
                                )}
                              </td>

                              {/* Action Link to Trading */}
                              <td style={{ padding: '12px 16px', minWidth: 120 }}>
                                <Link
                                  to="/internal/trading"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 12,
                                    color: 'var(--accent-cyan)',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                  }}
                                >
                                  Trading Hub
                                  <ChevronRight size={13} />
                                </Link>
                              </td>
                            </tr>

                            {/* Full Un-truncated Rationale & Decision Details Drawer */}
                            {isExpanded && (
                              <tr style={{ background: 'rgba(255, 255, 255, 0.012)' }}>
                                <td colSpan={8} style={{ padding: '8px 20px 20px 48px' }}>
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                                    gap: 16,
                                  }}>
                                    {/* 1. Initial Model Decision Rationale */}
                                    <div style={{
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 10,
                                      padding: '16px 18px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 10,
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent-cyan)' }}>
                                          <Sparkles size={15} />
                                          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Initial Decision Rationale &amp; Thesis
                                          </span>
                                        </div>
                                        <span style={{
                                          fontSize: 11,
                                          color: 'var(--text-muted)',
                                          background: 'rgba(255,255,255,0.03)',
                                          padding: '2px 8px',
                                          borderRadius: 4,
                                          border: '1px solid var(--border)',
                                        }}>
                                          Source: {p.source || 'bot_hourly'} · {p.lot_label || '$100 Unit'}
                                        </span>
                                      </div>

                                      {/* Complete un-truncated proposal reason */}
                                      <p style={{
                                        fontSize: 13,
                                        lineHeight: 1.65,
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        margin: 0,
                                      }}>
                                        {p.proposal_reason || 'No initial thesis text provided.'}
                                      </p>

                                      {/* Parameter Metrics */}
                                      <div style={{
                                        display: 'flex',
                                        gap: 14,
                                        fontSize: 11,
                                        color: 'var(--text-muted)',
                                        marginTop: 4,
                                        paddingTop: 10,
                                        borderTop: '1px solid var(--border)',
                                        flexWrap: 'wrap',
                                      }}>
                                        <span>Proposed RSI: <strong style={{ color: 'var(--text-primary)' }}>{p.proposed_rsi ?? '—'}</strong></span>
                                        <span>Initial DCA Score: <strong style={{ color: 'var(--accent-cyan)' }}>{p.proposed_dca_score}/100</strong></span>
                                        {p.rl_q_score != null && (
                                          <span>RL Q-Edge: <strong style={{ color: p.rl_q_score >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{p.rl_q_score >= 0 ? '+' : ''}{p.rl_q_score.toFixed(1)}%</strong></span>
                                        )}
                                        {p.macro_regime && (
                                          <span>Macro Regime: <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>{p.macro_regime.replace(/_/g, ' ')}</strong></span>
                                        )}
                                        {p.relative_strength_pct != null && (
                                          <span>Rel. Strength vs Benchmark: <strong style={{ color: p.relative_strength_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>{fmtPct(p.relative_strength_pct)}</strong></span>
                                        )}
                                        <span>Est. Cost: <strong style={{ color: 'var(--text-primary)' }}>{fmtPrice(p.total_estimated_cost)}</strong></span>
                                        <span>Env: <strong style={{ color: 'var(--text-primary)' }}>{p.trade_env || 'SIMULATE'}</strong></span>
                                      </div>
                                    </div>

                                    {/* 2. Bot Re-Evaluation & Review Rationale */}
                                    <div style={{
                                      background: 'var(--bg-secondary)',
                                      border: `1px solid ${p.still_worth_it ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
                                      borderRadius: 10,
                                      padding: '16px 18px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 10,
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 7,
                                          color: p.still_worth_it ? 'var(--accent-green)' : 'var(--accent-amber)',
                                        }}>
                                          <Activity size={15} />
                                          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Bot Hourly Review (#{p.bot_review_count || 1})
                                          </span>
                                        </div>
                                        <span style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          padding: '2px 8px',
                                          borderRadius: 4,
                                          background: p.still_worth_it ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                          color: p.still_worth_it ? 'var(--accent-green)' : 'var(--accent-amber)',
                                          border: `1px solid ${p.still_worth_it ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                        }}>
                                          {p.still_worth_it ? 'STILL WORTH IT' : 'CONDITION FADED'}
                                        </span>
                                      </div>

                                      {/* Complete un-truncated bot review note */}
                                      <p style={{
                                        fontSize: 13,
                                        lineHeight: 1.65,
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        margin: 0,
                                      }}>
                                        {p.last_bot_review_note || 'No automated review notes recorded yet. The bot checks proposals hourly or upon clicking "Re-Evaluate Signals".'}
                                      </p>

                                      {/* Dynamic Drift & Re-Check Stats */}
                                      <div style={{
                                        display: 'flex',
                                        gap: 14,
                                        fontSize: 11,
                                        color: 'var(--text-muted)',
                                        marginTop: 4,
                                        paddingTop: 10,
                                        borderTop: '1px solid var(--border)',
                                        flexWrap: 'wrap',
                                      }}>
                                        <span>Current RSI: <strong style={{ color: 'var(--text-primary)' }}>{p.current_rsi ?? '—'}</strong></span>
                                        <span>Current DCA: <strong style={{ color: p.current_dca_score >= 70 ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{p.current_dca_score}/100</strong></span>
                                        <span>Net Drift: <strong style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}>{fmtPct(drift)}</strong></span>
                                        {p.last_bot_review_at && (
                                          <span>Reviewed: <strong style={{ color: 'var(--text-primary)' }}>{new Date(p.last_bot_review_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                                        )}
                                        {p.execution_note && (
                                          <span style={{ width: '100%', marginTop: 2, color: 'var(--accent-green)', fontWeight: 500 }}>
                                            Order Execution: {p.execution_note} {p.moomoo_order_id ? `(ID: ${p.moomoo_order_id})` : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Direct Bridge Footer to Trading Page */}
      <GlassCard style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(16,185,129,0.04) 100%)',
        border: '1px solid rgba(6,182,212,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--accent-cyan-dim)',
            border: '1px solid var(--border-active)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)',
          }}>
            <LineChart size={22} />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Ready to act on these predictions?</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Inspect live candlestick charts, multi-timeframe indicator matrices, and execute Moomoo pre-approvals in the Trading Hub.
            </p>
          </div>
        </div>

        <Link
          to="/internal/trading"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textDecoration: 'none',
            fontSize: 13,
            padding: '9px 20px',
          }}
        >
          Go to Trading Hub
          <ArrowUpRight size={15} />
        </Link>
      </GlassCard>
    </div>
  )
}
