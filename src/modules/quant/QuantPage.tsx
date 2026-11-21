import { Fragment, useState, useMemo } from 'react'
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
  useTradingSettings,
  useUpdatePhaseConfig,
  useRefreshNewsBatch,
  useTriggerRlTune,
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
  const settingsQ = useTradingSettings()
  const phaseConfigMut = useUpdatePhaseConfig()
  const reviewMut = useBotProposalReview()
  const newsRefreshMut = useRefreshNewsBatch()
  const rlTuneMut = useTriggerRlTune()
  const [expandedTuneId, setExpandedTuneId] = useState<number | null>(null)

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

  // Chart data: Group same stock (symbol) into a single bar with average Price Drift % & call count
  const chartData = useMemo(() => {
    const bySymbol = new Map<
      string,
      {
        symbol: string
        driftSum: number
        count: number
        scoreSum: number
        minDrift: number
        maxDrift: number
        envs: Set<string>
      }
    >()

    for (const p of filteredProposals) {
      const sym = (p.symbol || 'UNKNOWN').toUpperCase()
      const d = Number(p.price_drift_pct ?? 0)
      const s = Number(p.proposed_dca_score ?? 0)
      const env = p.trade_env || 'SIMULATE'
      const existing = bySymbol.get(sym)
      if (!existing) {
        bySymbol.set(sym, {
          symbol: sym,
          driftSum: d,
          count: 1,
          scoreSum: s,
          minDrift: d,
          maxDrift: d,
          envs: new Set([env]),
        })
      } else {
        existing.driftSum += d
        existing.count += 1
        existing.scoreSum += s
        if (d < existing.minDrift) existing.minDrift = d
        if (d > existing.maxDrift) existing.maxDrift = d
        existing.envs.add(env)
      }
    }

    return Array.from(bySymbol.values())
      .slice(0, 20)
      .map((item) => ({
        symbol: item.symbol,
        drift: Number((item.driftSum / item.count).toFixed(2)),
        count: item.count,
        avgScore: Math.round(item.scoreSum / item.count),
        minDrift: Number(item.minDrift.toFixed(2)),
        maxDrift: Number(item.maxDrift.toFixed(2)),
        envs: Array.from(item.envs).join(' & '),
      }))
  }, [filteredProposals])

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
            to="/internal/quant/settings"
            className="btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              fontSize: 13,
              padding: '7px 14px',
            }}
          >
            ⚙️ Bot &amp; Phase Config
          </Link>

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

      {/* Phase 1 & Phase 2: Online RL Contextual Bandit Policy, Macro Regime & Per-Environment Onboarding */}
      <GlassCard style={{
        padding: '16px 20px',
        border: '1px solid rgba(6,182,212,0.25)',
        background: 'linear-gradient(135deg, rgba(6,182,212,0.05) 0%, rgba(16,185,129,0.02) 100%)',
      }}>
        {(() => {
          const pol = rlStatusQ.data?.policy
          const versionLabel = pol?.version ?? pol?.policy_version ?? '2.0-bandit-news'
          const episodesTrained = pol?.total_episodes ?? pol?.episodes_trained ?? 0
          const winRatePct = Number(pol?.win_rate_pct ?? 0)
          const cumReward = Number(pol?.cumulative_reward_pct ?? pol?.cumulative_reward ?? 0)
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={16} color="var(--accent-cyan)" />
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>
                  Phase 1 &amp; 2: Online RL Decision Policy, Macro Regime &amp; News Catalyst Engine
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

        {/* Phase 1 & Phase 2 Per-Environment Onboarding Configuration (Defaulted ON for SIMULATE & REAL) */}
        {(() => {
          const cfg = rlStatusQ.data?.onboarding_config || {
            phase1_simulate_enabled: settingsQ.data?.phase1_simulate_enabled !== false,
            phase1_real_enabled: settingsQ.data?.phase1_real_enabled !== false,
            phase2_simulate_enabled: settingsQ.data?.phase2_simulate_enabled !== false,
            phase2_real_enabled: settingsQ.data?.phase2_real_enabled !== false,
          }
          const toggleBtnStyle = (active: boolean, isReal: boolean) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            cursor: phaseConfigMut.isPending ? 'wait' : 'pointer',
            border: active
              ? isReal
                ? '1px solid rgba(245, 158, 11, 0.55)'
                : '1px solid rgba(16, 185, 129, 0.5)'
              : '1px solid var(--border)',
            background: active
              ? isReal
                ? 'rgba(245, 158, 11, 0.16)'
                : 'rgba(16, 185, 129, 0.15)'
              : 'var(--bg-secondary)',
            color: active ? (isReal ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--text-muted)',
            fontFamily: 'IBM Plex Mono',
          })
          return (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
                  ⚙️ PHASE 1 &amp; PHASE 2 ONBOARDING CONFIG (SIMULATE &amp; REAL — DEFAULTED ON)
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Toggle Phase 1 (Macro Regime, Relative Strength &amp; RL Contextual Bandit) and Phase 2 (FinBERT News Sentiment &amp; Event Risk Guardrails) per environment.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={phaseConfigMut.isPending}
                  onClick={() =>
                    phaseConfigMut.mutate({ phase1_simulate_enabled: !cfg.phase1_simulate_enabled })
                  }
                  style={toggleBtnStyle(cfg.phase1_simulate_enabled, false)}
                  title="Toggle Phase 1 (Macro Regime, 20d Alpha & RL Contextual Bandit) for SIMULATE"
                >
                  🧪 SIMULATE Phase 1: {cfg.phase1_simulate_enabled ? 'ON ●' : 'OFF ○'}
                </button>
                <button
                  type="button"
                  disabled={phaseConfigMut.isPending}
                  onClick={() =>
                    phaseConfigMut.mutate({ phase2_simulate_enabled: !cfg.phase2_simulate_enabled })
                  }
                  style={toggleBtnStyle(cfg.phase2_simulate_enabled, false)}
                  title="Toggle Phase 2 (FinBERT News Catalyst & Event Risk Guardrail) for SIMULATE"
                >
                  🧪 SIMULATE Phase 2: {cfg.phase2_simulate_enabled ? 'ON ●' : 'OFF ○'}
                </button>
                <button
                  type="button"
                  disabled={phaseConfigMut.isPending}
                  onClick={() =>
                    phaseConfigMut.mutate({ phase1_real_enabled: !cfg.phase1_real_enabled })
                  }
                  style={toggleBtnStyle(cfg.phase1_real_enabled, true)}
                  title="Toggle Phase 1 (Macro Regime, 20d Alpha & RL Contextual Bandit) for REAL"
                >
                  💵 REAL Phase 1: {cfg.phase1_real_enabled ? 'ON ●' : 'OFF ○'}
                </button>
                <button
                  type="button"
                  disabled={phaseConfigMut.isPending}
                  onClick={() =>
                    phaseConfigMut.mutate({ phase2_real_enabled: !cfg.phase2_real_enabled })
                  }
                  style={toggleBtnStyle(cfg.phase2_real_enabled, true)}
                  title="Toggle Phase 2 (FinBERT News Catalyst & Event Risk Guardrail) for REAL"
                >
                  💵 REAL Phase 2: {cfg.phase2_real_enabled ? 'ON ●' : 'OFF ○'}
                </button>
              </div>

              {/* Per-Environment Allowed Markets (e.g. disable SGX in SIMULATE since Moomoo SIMULATE only supports US/HK) */}
              {(() => {
                const simMarkets = cfg.simulate_markets || ['US', 'CRYPTO']
                const realMarkets = cfg.real_markets || ['US', 'SGX', 'CRYPTO']
                const toggleMkt = (env: 'SIMULATE' | 'REAL', mkt: string) => {
                  const cur = env === 'SIMULATE' ? simMarkets : realMarkets
                  const next = cur.includes(mkt) ? cur.filter((x) => x !== mkt) : [...cur, mkt]
                  phaseConfigMut.mutate(
                    env === 'SIMULATE' ? { simulate_markets: next } : { real_markets: next },
                  )
                }
                const mktPill = (env: 'SIMULATE' | 'REAL', mkt: string, active: boolean) => (
                  <button
                    key={`${env}-${mkt}`}
                    type="button"
                    disabled={phaseConfigMut.isPending}
                    onClick={() => toggleMkt(env, mkt)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'IBM Plex Mono',
                      cursor: phaseConfigMut.isPending ? 'wait' : 'pointer',
                      border: active
                        ? env === 'REAL'
                          ? '1px solid rgba(245, 158, 11, 0.5)'
                          : '1px solid rgba(16, 185, 129, 0.5)'
                        : '1px solid var(--border)',
                      background: active
                        ? env === 'REAL'
                          ? 'rgba(245, 158, 11, 0.14)'
                          : 'rgba(16, 185, 129, 0.14)'
                        : 'transparent',
                      color: active ? (env === 'REAL' ? 'var(--accent-amber)' : 'var(--accent-green)') : 'var(--text-muted)',
                    }}
                    title={`Toggle ${mkt} market proposals for ${env}`}
                  >
                    {mkt} {active ? '✓' : '✕'}
                  </button>
                )
                return (
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>🧪 SIMULATE Markets:</span>
                      {(['US', 'SGX', 'CRYPTO'] as const).map((m) => mktPill('SIMULATE', m, simMarkets.includes(m)))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>💵 REAL Markets:</span>
                      {(['US', 'SGX', 'CRYPTO'] as const).map((m) => mktPill('REAL', m, realMarkets.includes(m)))}
                    </div>
                  </div>
                )
              })()}
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

          {/* Phase 2: Batch News & Catalyst Sentiment Feed */}
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
                    PHASE 2: BATCH NEWS &amp; CATALYST SENTIMENT GUARDRAILS
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: 'rgba(6, 182, 212, 0.12)',
                    color: 'var(--accent-cyan)',
                  }}>
                    Yahoo News + Google Finance RSS · FinBERT Lexicon
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Detects earnings beats/misses, analyst upgrades/downgrades, and legal/regulatory shocks — adjusting DCA scores (±18 pts) and auto-cancelling pending BUYs on severe negative catalysts.
                </p>
              </div>
              <button
                onClick={() => newsRefreshMut.mutate()}
                disabled={newsRefreshMut.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: newsRefreshMut.isPending ? 'wait' : 'pointer',
                  background: 'var(--bg-secondary)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.35)',
                }}
              >
                <RefreshCw size={12} className={newsRefreshMut.isPending ? 'spin' : ''} />
                {newsRefreshMut.isPending ? 'Scanning Watchlist News...' : 'Scan Watchlist News'}
              </button>
            </div>

            {rlStatusQ.data?.news_feed && rlStatusQ.data.news_feed.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 8,
              }}>
                {rlStatusQ.data.news_feed.slice(0, 12).map((nf) => {
                  const score = Number(nf.avg_sentiment_score ?? nf.sentiment_score ?? 0)
                  const isBull = score >= 0.08 || nf.dca_score_adjustment > 0
                  const isBear = score <= -0.08 || nf.dca_score_adjustment < 0
                  const sColor = isBull ? 'var(--accent-green)' : isBear ? 'var(--accent-red)' : 'var(--text-muted)'
                  const sBg = isBull ? 'rgba(16, 185, 129, 0.12)' : isBear ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.12)'
                  return (
                    <div
                      key={nf.symbol}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 7,
                        padding: '9px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 12, fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>
                            {nf.symbol}
                          </span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: sBg,
                            color: sColor,
                            textTransform: 'uppercase',
                            fontFamily: 'IBM Plex Mono',
                          }}>
                            {nf.sentiment_label} ({score >= 0 ? '+' : ''}{score.toFixed(2)})
                          </span>
                        </div>
                        <span style={{
                          fontSize: 9,
                          fontFamily: 'IBM Plex Mono',
                          color: nf.dca_score_adjustment > 0 ? 'var(--accent-green)' : nf.dca_score_adjustment < 0 ? 'var(--accent-red)' : 'var(--text-muted)',
                        }}>
                          DCA {nf.dca_score_adjustment >= 0 ? '+' : ''}{nf.dca_score_adjustment}pt · {nf.dominant_catalyst.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }} title={nf.top_headline || nf.summary_line}>
                        {nf.top_headline || nf.summary_line}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                No cached watchlist headlines yet — click "Scan Watchlist News" or wait for the next hourly bot review.
              </p>
            )}
          </div>

          {/* Daily RL Model Tuning Audit Log */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>
                    DAILY MODEL TUNING LOG
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--accent-green)',
                  }}>
                    Office-Hour Cron (10:30 MYT / 02:30 UTC + Boot Catch-Up)
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Re-evaluates multi-horizon live outcomes, excludes budget-noise cancels, replays daily OHLCV bars, and logs every weight delta.
                </p>
              </div>
              <button
                onClick={() => rlTuneMut.mutate()}
                disabled={rlTuneMut.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: rlTuneMut.isPending ? 'wait' : 'pointer',
                  background: 'var(--bg-secondary)',
                  color: 'var(--accent-green)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                <RefreshCw size={12} className={rlTuneMut.isPending ? 'spin' : ''} />
                {rlTuneMut.isPending ? 'Tuning Model...' : 'Run Daily Tune Now'}
              </button>
            </div>

            {rlStatusQ.data?.tuning_logs && rlStatusQ.data.tuning_logs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rlStatusQ.data.tuning_logs.slice(0, 5).map((tl) => {
                  const isExpanded = expandedTuneId === tl.id
                  const changedWeights = (tl.weight_deltas_json || []).filter((d) => Math.abs(d.delta) >= 0.001)
                  return (
                    <div
                      key={tl.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 7,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                          <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {new Date(tl.created_at).toLocaleString()}
                          </span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: tl.trigger_source === 'manual_ui' ? 'rgba(6, 182, 212, 0.14)' : 'rgba(16, 185, 129, 0.14)',
                            color: tl.trigger_source === 'manual_ui' ? 'var(--accent-cyan)' : 'var(--accent-green)',
                            fontFamily: 'IBM Plex Mono',
                            textTransform: 'uppercase',
                          }}>
                            {tl.trigger_source === 'manual_ui' ? 'Manual Tune' : 'Daily Cron'}
                          </span>
                          <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)' }}>
                            Live: {tl.live_episodes_updated} · Replay: {tl.replay_samples_used} · Noise Excluded: {tl.excluded_budget_noise}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontFamily: 'IBM Plex Mono' }}>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Win: {Number(tl.win_rate_before_pct).toFixed(1)}% →{' '}
                            <strong style={{ color: tl.win_rate_after_pct >= 50 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                              {Number(tl.win_rate_after_pct).toFixed(1)}%
                            </strong>
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            Avg R: {Number(tl.avg_reward_before).toFixed(2)}% →{' '}
                            <strong style={{ color: tl.avg_reward_after >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {tl.avg_reward_after >= 0 ? '+' : ''}{Number(tl.avg_reward_after).toFixed(2)}%
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedTuneId(isExpanded ? null : tl.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: 4,
                              color: 'var(--accent-cyan)',
                              fontSize: 10,
                              padding: '2px 7px',
                              cursor: 'pointer',
                            }}
                          >
                            {isExpanded ? 'Hide Deltas' : `Weights (${changedWeights.length})`}
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0', lineHeight: 1.4 }}>
                        {tl.summary_note}
                      </p>
                      {isExpanded && changedWeights.length > 0 && (
                        <div style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid var(--border)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 6,
                        }}>
                          {changedWeights.map((d) => (
                            <div key={d.key} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: 10,
                              fontFamily: 'IBM Plex Mono',
                              padding: '4px 8px',
                              borderRadius: 4,
                              background: 'rgba(15, 23, 42, 0.35)',
                            }}>
                              <span style={{ color: 'var(--text-muted)' }}>{d.label}</span>
                              <span>
                                {d.before.toFixed(2)} → {d.after.toFixed(2)}{' '}
                                <strong style={{ color: d.delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                  ({d.delta >= 0 ? '+' : ''}{d.delta.toFixed(2)})
                                </strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                No daily tuning logs recorded yet — click "Run Daily Tune Now" or wait for the next office-hour run (10:30 MYT / 02:30 UTC).
              </p>
            )}
          </div>
      </GlassCard>

      {/* Chart: Price Drift by Recent Prediction */}
      {chartData.length > 0 && (
        <GlassCard style={{ padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>
                Price Drift Distribution by Stock (% Avg Return Since Signal · Grouped by Ticker)
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Aggregates all signals for the same stock into a single bar showing average percentage drift from proposed entry to current live price.
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
                formatter={(val: any, _name: any, props: any) => {
                  const p = props?.payload
                  if (!p) return [`${val}%`, 'Avg Price Drift']
                  const callsLabel = p.count > 1 ? ` (${p.count} signals grouped · Range ${p.minDrift}% to ${p.maxDrift}%)` : ' (1 signal)'
                  return [`${val >= 0 ? '+' : ''}${val}%${callsLabel} · Avg DCA ${p.avgScore}/100 [${p.envs}]`, 'Avg Price Drift']
                }}
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
                  <th style={{ width: 36, padding: '10px 8px 10px 14px' }} />
                  {[
                    { label: 'Asset / Symbol', align: 'left' as const },
                    { label: 'Order / Side', align: 'left' as const },
                    { label: 'Model Signal', align: 'left' as const },
                    { label: 'Proposed', align: 'right' as const },
                    { label: 'Current', align: 'right' as const },
                    { label: 'Drift', align: 'right' as const },
                    { label: 'Execution & Bot Status', align: 'left' as const },
                    { label: 'Action', align: 'right' as const },
                  ].map((h) => (
                    <th
                      key={h.label}
                      style={{
                        padding: '10px 8px',
                        textAlign: h.align,
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map(p => {
                  const drift = p.price_drift_pct ?? 0
                  const isPositive = drift >= 0
                  const isExpanded = expandAll || expandedIds.has(p.id)
                  const orderSide = String(p.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY'
                  const isBuyOrder = orderSide === 'BUY'
                  const isWorkingOnBroker = p.status === 'executed' && p.accum_logged === false
                  const statusBg =
                    isWorkingOnBroker
                      ? 'rgba(245,158,11,0.16)'
                      : p.status === 'executed'
                        ? 'rgba(16,185,129,0.14)'
                        : p.status === 'pending_approval'
                          ? 'rgba(6,182,212,0.14)'
                          : 'rgba(239,68,68,0.14)'
                  const statusColor =
                    isWorkingOnBroker
                      ? 'var(--accent-amber)'
                      : p.status === 'executed'
                        ? 'var(--accent-green)'
                        : p.status === 'pending_approval'
                          ? 'var(--accent-cyan)'
                          : 'var(--accent-red)'

                  return (
                    <Fragment key={p.id}>
                      {/* Main Summary Row */}
                      <tr
                        style={{
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                        }}
                        className="hover:bg-white/[0.03]"
                        onClick={() => toggleExpand(p.id)}
                      >
                        {/* 1. Expand Toggle */}
                        <td style={{ width: 36, padding: '12px 8px 12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              padding: 4,
                              borderRadius: 4,
                              color: isExpanded ? 'var(--accent-cyan)' : 'var(--text-muted)',
                              display: 'inline-flex',
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

                        {/* 2. Asset & Symbol */}
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle', maxWidth: 185 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 13 }}>
                              {p.symbol}
                            </span>
                            <span style={{
                              fontSize: 10,
                              padding: '1px 5px',
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
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: p.trade_env === 'REAL' ? 'rgba(245,158,11,0.16)' : 'rgba(6,182,212,0.12)',
                              color: p.trade_env === 'REAL' ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                              border: `1px solid ${p.trade_env === 'REAL' ? 'rgba(245,158,11,0.35)' : 'rgba(6,182,212,0.3)'}`,
                            }}>
                              {p.trade_env === 'REAL' ? 'REAL' : 'SIM'}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.35, wordBreak: 'break-word' }}>
                            {p.name !== p.symbol ? `${p.name} · ` : ''}{new Date(p.created_at).toLocaleDateString()}
                          </p>
                        </td>

                        {/* 3. Order / Side (BUY / SELL) */}
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle', maxWidth: 125 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              fontFamily: 'IBM Plex Mono',
                              padding: '2px 7px',
                              borderRadius: 4,
                              letterSpacing: '0.04em',
                              background: isBuyOrder ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
                              color: isBuyOrder ? 'var(--accent-green)' : 'var(--accent-red)',
                              border: `1px solid ${isBuyOrder ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                            }}>
                              {orderSide}
                            </span>
                            <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>
                              {p.qty}
                            </span>
                          </div>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.3, wordBreak: 'break-word' }}>
                            {p.lot_label || '$100 Unit'}
                          </p>
                        </td>

                        {/* 4. Model Signal & Score */}
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: p.proposed_signal?.toLowerCase().includes('buy') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color: p.proposed_signal?.toLowerCase().includes('buy') ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}>
                              {p.proposed_signal?.toUpperCase() || orderSide}
                            </span>
                            <span style={{
                              fontSize: 11,
                              fontFamily: 'IBM Plex Mono',
                              color: p.proposed_dca_score >= 70 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                            }}>
                              DCA:{p.proposed_dca_score}
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
                              }} title={`RL Expected Q-Edge: ${p.rl_q_score >= 0 ? '+' : ''}${Number(p.rl_q_score).toFixed(1)}% · Macro: ${p.macro_regime || 'neutral'}`}>
                                Q:{p.rl_q_score >= 0 ? '+' : ''}{Number(p.rl_q_score).toFixed(1)}%
                              </span>
                            )}
                            {p.news_sentiment_score != null && (
                              <span style={{
                                fontSize: 10,
                                fontFamily: 'IBM Plex Mono',
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: p.news_sentiment_score >= 0.08
                                  ? 'rgba(16,185,129,0.12)'
                                  : p.news_sentiment_score <= -0.08
                                  ? 'rgba(239,68,68,0.12)'
                                  : 'rgba(148,163,184,0.12)',
                                color: p.news_sentiment_score >= 0.08
                                  ? 'var(--accent-green)'
                                  : p.news_sentiment_score <= -0.08
                                  ? 'var(--accent-red)'
                                  : 'var(--text-muted)',
                              }} title={p.news_headline_summary || `News Catalyst: ${p.news_catalyst_tag || 'general'}`}>
                                News:{p.news_sentiment_score >= 0 ? '+' : ''}{Number(p.news_sentiment_score).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {!isExpanded && p.proposal_reason && (
                            <p style={{ fontSize: 10, color: 'var(--accent-cyan)', marginTop: 3 }}>
                              [Click row for full rationale]
                            </p>
                          )}
                        </td>

                        {/* 5. Proposed Price */}
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'IBM Plex Mono', fontSize: 12, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div>{fmtPrice(p.proposed_price)}</div>
                          {p.status === 'executed' && p.filled_avg_price != null && Number(p.filled_avg_price) !== Number(p.proposed_price) && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                              Fill {fmtPrice(p.filled_avg_price)}
                            </div>
                          )}
                        </td>

                        {/* 6. Current Price */}
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'IBM Plex Mono', fontSize: 12, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {fmtPrice(p.current_price)}
                        </td>

                        {/* 7. Price Drift */}
                        <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'IBM Plex Mono',
                            fontSize: 12,
                            fontWeight: 700,
                            color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                          }}>
                            {fmtPct(drift)}
                          </span>
                          {p.realized_pnl != null && Number(p.realized_pnl) !== 0 && (
                            <div style={{
                              fontSize: 10,
                              fontFamily: 'IBM Plex Mono',
                              color: Number(p.realized_pnl) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                              marginTop: 2,
                            }}>
                              PnL {Number(p.realized_pnl) >= 0 ? '+' : ''}{fmtPrice(p.realized_pnl)}
                            </div>
                          )}
                        </td>

                        {/* 8. Execution & Bot Review Status */}
                        <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: statusBg,
                              color: statusColor,
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                            }}>
                              {isWorkingOnBroker
                                ? `WORKING ${orderSide} (${p.broker_order_status || 'SUBMITTED'} · ${p.filled_qty ?? 0}/${p.qty})`
                                : p.status === 'executed'
                                  ? `EXECUTED ${orderSide}`
                                  : p.status.replace(/_/g, ' ')}
                            </span>
                            {p.still_worth_it ? (
                              <span style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 500, whiteSpace: 'nowrap' }} title="Bot re-evaluated and confirmed setup is still valid">
                                ● Valid
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--accent-amber)', fontWeight: 500, whiteSpace: 'nowrap' }} title="Bot flagged condition as faded / stale">
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

                        {/* 9. Action Link to Trading */}
                        <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <Link
                            to="/internal/trading"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 11,
                              color: 'var(--accent-cyan)',
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            Trading
                            <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>

                      {/* Full Un-truncated Rationale & Decision Details Drawer */}
                      {isExpanded && (
                        <tr style={{ background: 'rgba(255, 255, 255, 0.012)', borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={9} style={{ padding: '8px 20px 20px 48px' }}>
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
                                        {p.news_sentiment_score != null && (
                                          <span>News Sentiment: <strong style={{ color: p.news_sentiment_score >= 0.08 ? 'var(--accent-green)' : p.news_sentiment_score <= -0.08 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{p.news_sentiment_score >= 0 ? '+' : ''}{Number(p.news_sentiment_score).toFixed(2)} ({p.news_catalyst_tag || 'general'})</strong></span>
                                        )}
                                        <span>Est. Cost: <strong style={{ color: 'var(--text-primary)' }}>{fmtPrice(p.total_estimated_cost)}</strong></span>
                                        <span>Env: <strong style={{ color: 'var(--text-primary)' }}>{p.trade_env || 'SIMULATE'}</strong></span>
                                      </div>
                                      {p.news_headline_summary && (
                                        <div style={{
                                          fontSize: 11,
                                          color: 'var(--text-muted)',
                                          background: 'rgba(6, 182, 212, 0.06)',
                                          border: '1px solid rgba(6, 182, 212, 0.2)',
                                          borderRadius: 6,
                                          padding: '6px 10px',
                                        }}>
                                          <strong style={{ color: 'var(--accent-cyan)' }}>Catalyst Headline:</strong> {p.news_headline_summary}
                                        </div>
                                      )}
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
                    </Fragment>
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
