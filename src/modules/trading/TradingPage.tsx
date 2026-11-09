import { useState, useEffect } from 'react'
import {
  Search,
  RefreshCw,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Sparkles,
  AlertCircle,
  BarChart2,
  Bell,
  Target,
  Slack,
} from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import TradingChartPanel from './TradingChartPanel'
import IndicatorMatrix from './IndicatorMatrix'
import AiThesisCard from './AiThesisCard'
import TradingAlertModal from './TradingAlertModal'
import {
  useTradingWatchlist,
  useTradingSnapshot,
  useFetchTicker,
  useAnalyzeTicker,
  useAddWatchlist,
  useRemoveWatchlist,
  useRefreshWatchlist,
  useTradingAlerts,
} from '../../hooks/useTrading'
import type { AssetType, Timeframe, TechnicalSignal, TradingSnapshot } from '../../types/trading'

const QUICK_TICKERS: Array<{ symbol: string; type: AssetType; label: string }> = [
  { symbol: 'BTC', type: 'crypto', label: 'BTC' },
  { symbol: 'ETH', type: 'crypto', label: 'ETH' },
  { symbol: 'SOL', type: 'crypto', label: 'SOL' },
  { symbol: 'NVDA', type: 'stock', label: 'NVDA' },
  { symbol: 'AAPL', type: 'stock', label: 'AAPL' },
  { symbol: 'TSLA', type: 'stock', label: 'TSLA' },
  { symbol: 'SPY', type: 'etf', label: 'SPY' },
  { symbol: 'QQQ', type: 'etf', label: 'QQQ' },
  { symbol: 'D05.SI', type: 'stock', label: 'DBS (SGX)' },
]

function fmtPrice(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (v >= 1) return v.toFixed(2)
  if (v >= 0.01) return v.toFixed(4)
  return v.toFixed(6)
}

function signalMeta(sig: TechnicalSignal) {
  switch (sig) {
    case 'strong_buy':
      return { label: 'STRONG BUY', color: '#34d399', bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.4)' }
    case 'buy':
      return { label: 'BUY', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' }
    case 'strong_sell':
      return { label: 'STRONG SELL', color: '#f87171', bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.4)' }
    case 'sell':
      return { label: 'SELL', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' }
    default:
      return { label: 'NEUTRAL', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' }
  }
}

export default function TradingPage() {
  const [tickerInput, setTickerInput] = useState('BTC')
  const [assetTypeHint, setAssetTypeHint] = useState<'auto' | AssetType>('auto')
  const [timeframe, setTimeframe] = useState<Timeframe>('1d')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC')
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | undefined>('crypto')
  const [wlFilter, setWlFilter] = useState<'all' | 'crypto' | 'equity'>('all')
  const [activeSnapshot, setActiveSnapshot] = useState<TradingSnapshot | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [alertModalTab, setAlertModalTab] = useState<'alerts' | 'targets' | 'settings'>('alerts')

  const watchlistQ = useTradingWatchlist()
  const alertsQ = useTradingAlerts(40)
  const unreadAlerts = alertsQ.data?.unread_count ?? 0
  const snapshotQ = useTradingSnapshot(selectedSymbol, timeframe, selectedAssetType)
  const fetchMut = useFetchTicker()
  const analyzeMut = useAnalyzeTicker()
  const addWlMut = useAddWatchlist()
  const removeWlMut = useRemoveWatchlist()
  const refreshWlMut = useRefreshWatchlist()

  const watchlist = watchlistQ.data ?? []
  const filteredWatchlist = watchlist.filter((w) => {
    if (wlFilter === 'crypto') return w.asset_type === 'crypto'
    if (wlFilter === 'equity') return w.asset_type === 'stock' || w.asset_type === 'etf'
    return true
  })

  // Sync activeSnapshot from query when available, or auto-fetch if symbol has no snapshot yet
  useEffect(() => {
    if (snapshotQ.data?.latest) {
      setActiveSnapshot(snapshotQ.data.latest)
    } else if (
      snapshotQ.isFetched &&
      !snapshotQ.isFetching &&
      !snapshotQ.data?.latest &&
      selectedSymbol &&
      !fetchMut.isPending
    ) {
      fetchMut
        .mutateAsync({
          symbol: selectedSymbol,
          asset_type: selectedAssetType,
          timeframe,
        })
        .then((snap) => setActiveSnapshot(snap))
        .catch((err) => setErrorMsg(err?.response?.data?.error || err.message))
    }
  }, [snapshotQ.data, snapshotQ.isFetched, selectedSymbol, timeframe])

  const handleRunFetchAndAnalyze = async (
    symOverride?: string,
    typeOverride?: AssetType | 'auto',
    tfOverride?: Timeframe,
    useClaude = false,
  ) => {
    const rawSym = (symOverride ?? tickerInput).trim().toUpperCase()
    if (!rawSym) return
    setErrorMsg(null)

    const resolvedType =
      typeOverride && typeOverride !== 'auto'
        ? typeOverride
        : assetTypeHint !== 'auto'
          ? assetTypeHint
          : undefined
    const resolvedTf = tfOverride ?? timeframe

    setSelectedSymbol(rawSym)
    setSelectedAssetType(resolvedType)

    try {
      const snap = useClaude
        ? await analyzeMut.mutateAsync({
            symbol: rawSym,
            asset_type: resolvedType,
            timeframe: resolvedTf,
            use_claude: true,
          })
        : await fetchMut.mutateAsync({
            symbol: rawSym,
            asset_type: resolvedType,
            timeframe: resolvedTf,
          })
      setActiveSnapshot(snap)
      setSelectedSymbol(snap.symbol)
      setSelectedAssetType(snap.asset_type)
      setTickerInput(snap.symbol)
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Failed to fetch market data')
    }
  }

  const handleAddCurrentToWatchlist = async () => {
    const rawSym = (activeSnapshot?.symbol || tickerInput).trim().toUpperCase()
    if (!rawSym) return
    setErrorMsg(null)
    try {
      const res = await addWlMut.mutateAsync({
        symbol: rawSym,
        asset_type: activeSnapshot?.asset_type || (assetTypeHint !== 'auto' ? assetTypeHint : undefined),
        timeframe,
      })
      if (res.snapshot) {
        setActiveSnapshot(res.snapshot)
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.message || 'Failed to add to watchlist')
    }
  }

  const isInWatchlist = watchlist.some(
    (w) => w.symbol.toUpperCase() === (activeSnapshot?.symbol || selectedSymbol).toUpperCase(),
  )

  const snap = activeSnapshot || snapshotQ.data?.latest || null
  const isBusy = fetchMut.isPending || analyzeMut.isPending

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Title & Command Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
                Trading Intelligence Terminal
              </h1>
              <span style={{
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--accent-cyan-dim)',
                border: '1px solid var(--border-active)',
                color: 'var(--accent-cyan)',
              }}>
                STOCKS · ETFS · CRYPTO
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Live multi-timeframe OHLCV fetch, institutional technical indicator matrix & automated trade setup synthesis
            </p>
          </div>

          {/* Hourly Monitor, Price Targets & Slack Alert Center Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={unreadAlerts > 0 ? 'btn-primary' : 'btn-ghost'}
              onClick={() => {
                setAlertModalTab('alerts')
                setAlertModalOpen(true)
              }}
              style={{ position: 'relative', fontSize: 12, padding: '7px 13px' }}
            >
              <Bell size={14} />
              <span>Alerts {unreadAlerts > 0 ? `(${unreadAlerts})` : ''}</span>
              {unreadAlerts > 0 && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--accent-amber)',
                    animation: 'pulse-dot 1.6s ease-in-out infinite',
                  }}
                />
              )}
            </button>

            <button
              className="btn-ghost"
              onClick={() => {
                setAlertModalTab('targets')
                setAlertModalOpen(true)
              }}
              style={{ fontSize: 12, padding: '7px 13px' }}
            >
              <Target size={14} />
              <span>Price Targets</span>
            </button>

            <button
              className="btn-ghost"
              onClick={() => {
                setAlertModalTab('settings')
                setAlertModalOpen(true)
              }}
              style={{ fontSize: 12, padding: '7px 13px' }}
            >
              <Slack size={14} />
              <span>Hourly & Slack</span>
            </button>
          </div>
        </div>

        {/* Search & Fetch Control Bar */}
        <GlassCard style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Ticker Input */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                className="input"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunFetchAndAnalyze()
                }}
                placeholder="Enter Ticker (e.g. BTC, ETH, NVDA, AAPL, SPY, D05.SI)..."
                style={{
                  paddingLeft: 36,
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.03em',
                }}
              />
            </div>

            {/* Asset Type Selector */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 2,
            }}>
              {(
                [
                  { id: 'auto', label: 'Auto' },
                  { id: 'crypto', label: 'Crypto' },
                  { id: 'stock', label: 'Stock' },
                  { id: 'etf', label: 'ETF' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAssetTypeHint(opt.id)}
                  style={{
                    padding: '6px 11px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    background: assetTypeHint === opt.id ? 'var(--accent-cyan-dim)' : 'transparent',
                    color: assetTypeHint === opt.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 2,
            }}>
              {(['1h', '4h', '1d', '1w'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf)
                    if (selectedSymbol) {
                      handleRunFetchAndAnalyze(selectedSymbol, selectedAssetType ?? 'auto', tf, false)
                    }
                  }}
                  style={{
                    padding: '6px 11px',
                    fontSize: 12,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: timeframe === tf ? 'var(--accent-cyan-dim)' : 'transparent',
                    color: timeframe === tf ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Fetch & Analyze CTA */}
            <button
              className="btn-primary"
              onClick={() => handleRunFetchAndAnalyze(undefined, undefined, undefined, false)}
              disabled={isBusy || !tickerInput.trim()}
              style={{ padding: '8px 18px', fontWeight: 600 }}
            >
              {isBusy ? <Spinner size={14} /> : <Zap size={14} />}
              {isBusy ? 'Fetching & Analyzing...' : 'Fetch & Analyze'}
            </button>

            {/* Save to Watchlist */}
            {!isInWatchlist && (
              <button
                className="btn-ghost"
                onClick={handleAddCurrentToWatchlist}
                disabled={addWlMut.isPending || !tickerInput.trim()}
                style={{ padding: '8px 14px' }}
              >
                {addWlMut.isPending ? <Spinner size={13} /> : <Plus size={14} />}
                Watchlist
              </button>
            )}
          </div>

          {/* Quick-Pick Ticker Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Quick Pick:</span>
            {QUICK_TICKERS.map((q) => {
              const active = selectedSymbol.toUpperCase() === q.symbol
              return (
                <button
                  key={q.symbol}
                  onClick={() => {
                    setTickerInput(q.symbol)
                    setAssetTypeHint(q.type)
                    handleRunFetchAndAnalyze(q.symbol, q.type, timeframe, false)
                  }}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'IBM Plex Mono, monospace',
                    cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--border-active)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-cyan-dim)' : 'rgba(255,255,255,0.025)',
                    color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {q.label}
                </button>
              )
            })}
          </div>
        </GlassCard>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Main Layout: Left Watchlist Rail + Right Analysis Workbench */}
      <div className="trading-main-grid">
        {/* Left Watchlist Rail */}
        <GlassCard style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <BarChart2 size={15} color="var(--accent-cyan)" />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
                Watchlist Radar
              </span>
            </div>
            <button
              className="btn-ghost"
              onClick={() => refreshWlMut.mutate()}
              disabled={refreshWlMut.isPending}
              title="Refresh all watchlist tickers"
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              {refreshWlMut.isPending ? <Spinner size={12} /> : <RefreshCw size={12} />}
              Refresh
            </button>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
            background: 'var(--bg-elevated)',
            padding: 3,
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            {(
              [
                { id: 'all', label: `All (${watchlist.length})` },
                { id: 'crypto', label: 'Crypto' },
                { id: 'equity', label: 'Equities' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setWlFilter(tab.id)}
                style={{
                  padding: '5px 6px',
                  fontSize: 11,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: wlFilter === tab.id ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: wlFilter === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontWeight: wlFilter === tab.id ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Watchlist Items */}
          {watchlistQ.isLoading ? (
            <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
              <Spinner size={20} />
            </div>
          ) : filteredWatchlist.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No tickers in this filter. Search a symbol above and click <strong>+ Watchlist</strong>.
            </div>
          ) : (
            <div className="trading-watchlist-items">
              {filteredWatchlist.map((item) => {
                const isSelected = selectedSymbol.toUpperCase() === item.symbol.toUpperCase()
                const lat = item.latest
                const sig = lat ? signalMeta(lat.technical_signal) : null
                const isUp = (lat?.change_pct ?? 0) >= 0

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setTickerInput(item.symbol)
                      setSelectedSymbol(item.symbol)
                      setSelectedAssetType(item.asset_type)
                      handleRunFetchAndAnalyze(item.symbol, item.asset_type, timeframe, false)
                    }}
                    className="hover-lift trading-watchlist-card"
                    style={{
                      padding: '11px 12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(6, 182, 212, 0.11)' : 'rgba(255,255,255,0.025)',
                      border: `1px solid ${isSelected ? 'var(--border-active)' : 'var(--border)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          {item.symbol}
                        </span>
                        <span style={{
                          fontSize: 9,
                          fontFamily: 'IBM Plex Mono, monospace',
                          padding: '1px 5px',
                          borderRadius: 4,
                          background: item.asset_type === 'crypto' ? 'rgba(245,158,11,0.14)' : 'rgba(6,182,212,0.12)',
                          color: item.asset_type === 'crypto' ? 'var(--accent-amber)' : 'var(--accent-cyan)',
                          textTransform: 'uppercase',
                        }}>
                          {item.asset_type}
                        </span>
                        {lat?.bb_squeeze && (
                          <span title="Bollinger Band Squeeze Active" style={{ fontSize: 11 }}>⚡</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {lat && (
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, fontSize: 13 }}>
                            {fmtPrice(lat.price)}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeWlMut.mutate(item.id)
                          }}
                          title="Remove from watchlist"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: 2,
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 120,
                      }}>
                        {item.name}
                      </span>

                      {lat ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'IBM Plex Mono, monospace' }}>
                          <span style={{ color: isUp ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 11 }}>
                            {isUp ? '+' : ''}{lat.change_pct.toFixed(2)}%
                          </span>
                          {sig && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: sig.bg,
                              color: sig.color,
                              border: `1px solid ${sig.border}`,
                            }}>
                              {sig.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Click to fetch
                        </span>
                      )}
                    </div>

                    {(item.target_above != null || item.target_below != null) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 10,
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: 'var(--text-secondary)',
                        paddingTop: 4,
                        borderTop: '1px dashed rgba(255,255,255,0.06)',
                      }}>
                        <span>🎯</span>
                        {item.target_above != null && (
                          <span style={{ color: 'var(--accent-green)' }}>≥{fmtPrice(item.target_above)}</span>
                        )}
                        {item.target_below != null && (
                          <span style={{ color: 'var(--accent-red)' }}>≤{fmtPrice(item.target_below)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>

        {/* Right Main Workbench */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          {isBusy && !snap ? (
            <GlassCard style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <Spinner size={28} />
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: 'var(--text-secondary)' }}>
                Fetching 200 OHLCV candles & computing technical indicators for {selectedSymbol}...
              </p>
            </GlassCard>
          ) : !snap ? (
            <GlassCard style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a ticker from the Watchlist or enter any Stock, ETF, or Crypto symbol above to launch analysis.
            </GlassCard>
          ) : (
            <>
              {/* Instrument Spotlight Banner */}
              <GlassCard style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  {/* Left: Symbol & Price */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
                        {snap.symbol}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {snap.name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'IBM Plex Mono, monospace',
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--accent-cyan)',
                        textTransform: 'uppercase',
                      }}>
                        {snap.asset_type} · {snap.exchange || 'MARKET'} · {snap.timeframe.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {snap.currency} {fmtPrice(snap.price)}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: snap.change_pct >= 0 ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
                        color: snap.change_pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {snap.change_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {snap.change_pct >= 0 ? '+' : ''}{snap.change_pct.toFixed(2)}%
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        {new Date(snap.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right: Composite Technical Score & Signal Gauge */}
                  {(() => {
                    const sig = signalMeta(snap.technical_signal)
                    const comp = snap.indicators.composite
                    return (
                      <div
                        className="trading-Composite-gauge"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '10px 14px',
                          borderRadius: 12,
                          background: 'rgba(13, 17, 23, 0.75)',
                          border: `1px solid ${sig.border}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Composite Technical Signal
                          </div>
                          <div style={{
                            fontFamily: 'Syne, sans-serif',
                            fontWeight: 800,
                            fontSize: 18,
                            color: sig.color,
                            marginTop: 2,
                          }}>
                            {sig.label}
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
                            <span>Trend: <strong style={{ color: comp.trendScore >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{comp.trendScore >= 0 ? '+' : ''}{comp.trendScore}/40</strong></span>
                            <span>Mom: <strong style={{ color: comp.momentumScore >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{comp.momentumScore >= 0 ? '+' : ''}{comp.momentumScore}/35</strong></span>
                            <span>Struct: <strong style={{ color: comp.structureScore >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{comp.structureScore >= 0 ? '+' : ''}{comp.structureScore}/25</strong></span>
                          </div>
                        </div>

                        <div style={{
                          width: 62,
                          height: 62,
                          borderRadius: '50%',
                          background: sig.bg,
                          border: `2px solid ${sig.color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'IBM Plex Mono, monospace',
                        }}>
                          <span style={{ fontSize: 17, fontWeight: 700, color: sig.color }}>
                            {comp.score >= 0 ? `+${comp.score}` : comp.score}
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>/ 100</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </GlassCard>

              {/* Interactive Price & Oscillator Chart */}
              <TradingChartPanel
                symbol={snap.symbol}
                currency={snap.currency}
                timeframe={snap.timeframe}
                indicators={snap.indicators}
              />

              {/* Trade Thesis & Execution Blueprint Card */}
              {snap.ai_analysis && (
                <AiThesisCard
                  symbol={snap.symbol}
                  analysis={snap.ai_analysis}
                  onRunClaudeCli={() => handleRunFetchAndAnalyze(snap.symbol, snap.asset_type, snap.timeframe, true)}
                  isRunningClaude={analyzeMut.isPending}
                />
              )}

              {/* Full Technical Indicator & Support/Resistance Matrix */}
              <IndicatorMatrix currency={snap.currency} indicators={snap.indicators} />

              {/* Recent Analysis Snapshots Timeline */}
              {snapshotQ.data?.history && snapshotQ.data.history.length > 1 && (
                <GlassCard style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Sparkles size={14} color="var(--accent-cyan)" />
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13 }}>
                      Recent {snap.symbol} Snapshot History
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {snapshotQ.data.history.map((h) => {
                      const sMeta = signalMeta(h.technical_signal)
                      return (
                        <div
                          key={h.id}
                          style={{
                            minWidth: 165,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid var(--border)',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: 11,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 10, marginBottom: 4 }}>
                            <span>{h.timeframe.toUpperCase()}</span>
                            <span>{new Date(h.fetched_at).toLocaleDateString()} {new Date(h.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtPrice(h.price)}</span>
                            <span style={{ color: sMeta.color, fontSize: 10 }}>
                              {h.technical_score >= 0 ? `+${h.technical_score}` : h.technical_score} ({sMeta.label})
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>
              )}
            </>
          )}
        </div>
      </div>

      <TradingAlertModal
        open={alertModalOpen}
        initialTab={alertModalTab}
        watchlist={watchlist}
        onClose={() => setAlertModalOpen(false)}
        onSelectSymbol={(sym) => {
          setTickerInput(sym)
          setSelectedSymbol(sym)
          handleRunFetchAndAnalyze(sym, 'auto', timeframe, false)
        }}
      />
    </div>
  )
}
