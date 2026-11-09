import { useState } from 'react'
import {
  useDcaRanking,
  useAccumulations,
  useAddAccumulation,
  useDeleteAccumulation,
  useRefreshWatchlist,
} from '../../hooks/useTrading'
import type { AssetType, DcaRankedItem, Timeframe } from '../../types/trading'

interface Props {
  onSelectTickerForTerminal: (symbol: string, timeframe: Timeframe, assetType: AssetType) => void
}

type SizingMode = 'unit_100' | 'lot_100' | 'custom_cash'

function fmtPrice(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return '—'
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return p.toFixed(2)
  if (p >= 0.01) return p.toFixed(4)
  return p.toFixed(6)
}

function fmtUnits(u: number | null | undefined): string {
  if (u == null || !isFinite(u)) return '0'
  if (Number.isInteger(u)) return u.toLocaleString('en-US')
  if (u >= 10) return u.toFixed(2)
  if (u >= 1) return u.toFixed(4)
  return u.toFixed(6)
}

function tierBadgeStyle(tier?: string) {
  switch (tier) {
    case 'top_buy':
      return {
        bg: 'rgba(16, 185, 129, 0.16)',
        border: 'rgba(16, 185, 129, 0.45)',
        color: '#34d399',
      }
    case 'accumulate':
      return {
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.4)',
        color: '#38bdf8',
      }
    case 'limit_dip':
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        color: '#fbbf24',
      }
    default:
      return {
        bg: 'rgba(244, 63, 94, 0.14)',
        border: 'rgba(244, 63, 94, 0.35)',
        color: '#fb7185',
      }
  }
}

export default function MonthlyDcaTab({ onSelectTickerForTerminal }: Props) {
  const { data: ranked = [], isLoading: rankLoading } = useDcaRanking()
  const { data: accumData, isLoading: accumLoading } = useAccumulations()
  const addAccumMutation = useAddAccumulation()
  const deleteAccumMutation = useDeleteAccumulation()
  const refreshMutation = useRefreshWatchlist()

  const [sizingMode, setSizingMode] = useState<SizingMode>('unit_100')
  const [customCash, setCustomCash] = useState<number>(100)

  // Modal state for logging a monthly buy
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [formSymbol, setFormSymbol] = useState('')
  const [formAssetType, setFormAssetType] = useState<AssetType>('stock')
  const [formCurrency, setFormCurrency] = useState('USD')
  const [formLotLabel, setFormLotLabel] = useState('$100 Unit')
  const [formPrice, setFormPrice] = useState('')
  const [formUnits, setFormUnits] = useState('')
  const [formTotal, setFormTotal] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formNotes, setFormNotes] = useState('')

  const effectiveCashUnit = sizingMode === 'custom_cash' ? Math.max(10, customCash || 100) : 100

  function openLogBuyModal(item?: {
    symbol: string
    asset_type: AssetType
    currency: string
    price: number
  }) {
    const sym = item?.symbol || ranked[0]?.symbol || 'AAPL'
    const at = item?.asset_type || ranked[0]?.asset_type || 'stock'
    const ccy = item?.currency || ranked[0]?.currency || 'USD'
    const price = item?.price || ranked[0]?.price || 100

    setFormSymbol(sym)
    setFormAssetType(at)
    setFormCurrency(ccy)
    setFormPrice(String(price))

    if (sizingMode === 'lot_100') {
      setFormLotLabel('1 Lot (100 shares)')
      setFormUnits('100')
      setFormTotal((price * 100).toFixed(2))
    } else {
      const cash = effectiveCashUnit
      setFormLotLabel(`$${cash} Unit`)
      const units = price > 0 ? cash / price : 1
      setFormUnits(units >= 1 ? units.toFixed(4) : units.toFixed(6))
      setFormTotal(cash.toFixed(2))
    }

    setFormDate(new Date().toISOString().slice(0, 10))
    setFormNotes('')
    setLogModalOpen(true)
  }

  function applyQuickPreset(preset: 'unit_100' | 'unit_200' | 'lot_100' | 'lot_50') {
    const p = parseFloat(formPrice) || 0
    if (preset === 'unit_100') {
      setFormLotLabel('$100 Unit')
      setFormTotal('100.00')
      if (p > 0) setFormUnits((100 / p >= 1 ? 100 / p : 100 / p).toFixed(p >= 1 ? 4 : 6))
    } else if (preset === 'unit_200') {
      setFormLotLabel('$200 (2 Units)')
      setFormTotal('200.00')
      if (p > 0) setFormUnits((200 / p).toFixed(p >= 1 ? 4 : 6))
    } else if (preset === 'lot_100') {
      setFormLotLabel('1 Lot (100 shares)')
      setFormUnits('100')
      if (p > 0) setFormTotal((p * 100).toFixed(2))
    } else if (preset === 'lot_50') {
      setFormLotLabel('0.5 Lot (50 shares)')
      setFormUnits('50')
      if (p > 0) setFormTotal((p * 50).toFixed(2))
    }
  }

  function handlePriceChange(val: string) {
    setFormPrice(val)
    const p = parseFloat(val)
    if (!isFinite(p) || p <= 0) return
    if (formLotLabel.includes('Lot')) {
      const u = parseFloat(formUnits) || 100
      setFormTotal((p * u).toFixed(2))
    } else {
      const tot = parseFloat(formTotal) || 100
      setFormUnits((tot / p).toFixed(p >= 1 ? 4 : 6))
    }
  }

  function handleUnitsChange(val: string) {
    setFormUnits(val)
    const u = parseFloat(val)
    const p = parseFloat(formPrice)
    if (isFinite(u) && isFinite(p) && u > 0 && p > 0) {
      setFormTotal((u * p).toFixed(2))
    }
  }

  function handleTotalChange(val: string) {
    setFormTotal(val)
    const tot = parseFloat(val)
    const p = parseFloat(formPrice)
    if (isFinite(tot) && isFinite(p) && tot > 0 && p > 0) {
      setFormUnits((tot / p).toFixed(p >= 1 ? 4 : 6))
    }
  }

  async function handleSaveBuy(e: React.FormEvent) {
    e.preventDefault()
    const u = parseFloat(formUnits)
    const p = parseFloat(formPrice)
    const tot = parseFloat(formTotal)
    if (!formSymbol.trim() || !isFinite(u) || u <= 0 || !isFinite(p) || p <= 0) return

    await addAccumMutation.mutateAsync({
      symbol: formSymbol.trim().toUpperCase(),
      asset_type: formAssetType,
      currency: formCurrency,
      units: u,
      price_per_unit: p,
      total_amount: isFinite(tot) && tot > 0 ? tot : u * p,
      lot_label: formLotLabel,
      bought_at: formDate,
      notes: formNotes.trim() || undefined,
    })
    setLogModalOpen(false)
  }

  const topPick: DcaRankedItem | undefined = ranked[0]
  const totals = accumData?.totals
  const holdings = accumData?.holdings || []
  const entries = accumData?.entries || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── Top Control Bar: Unit Mode Switcher + Actions ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.88))',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '0.9rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                padding: '0.18rem 0.55rem',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
              }}
            >
              LONG-TERM MONTHLY INVESTOR
            </span>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              Which Watchlist Stock Should I Choose This Month?
            </h2>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
            Ranks every ticker in your watchlist by pullback discount from highs, RSI dip zone, proximity to 200-SMA &amp; S1 support, and whether price is below your average cost.
          </p>
        </div>

        {/* Unit Sizing Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              background: '#090d16',
              padding: '0.22rem',
              borderRadius: '0.6rem',
              border: '1px solid #1e293b',
            }}
          >
            <button
              type="button"
              onClick={() => setSizingMode('unit_100')}
              style={{
                padding: '0.38rem 0.7rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '0.45rem',
                border: 'none',
                cursor: 'pointer',
                background: sizingMode === 'unit_100' ? '#0284c7' : 'transparent',
                color: sizingMode === 'unit_100' ? '#fff' : '#94a3b8',
              }}
            >
              💵 $100 / Unit
            </button>
            <button
              type="button"
              onClick={() => setSizingMode('lot_100')}
              style={{
                padding: '0.38rem 0.7rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '0.45rem',
                border: 'none',
                cursor: 'pointer',
                background: sizingMode === 'lot_100' ? '#0284c7' : 'transparent',
                color: sizingMode === 'lot_100' ? '#fff' : '#94a3b8',
              }}
            >
              📦 1 Lot (100 Shares)
            </button>
            <button
              type="button"
              onClick={() => setSizingMode('custom_cash')}
              style={{
                padding: '0.38rem 0.7rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '0.45rem',
                border: 'none',
                cursor: 'pointer',
                background: sizingMode === 'custom_cash' ? '#0284c7' : 'transparent',
                color: sizingMode === 'custom_cash' ? '#fff' : '#94a3b8',
              }}
            >
              ⚙️ Custom $
            </button>
          </div>

          {sizingMode === 'custom_cash' && (
            <input
              type="number"
              min={10}
              step={50}
              value={customCash}
              onChange={(e) => setCustomCash( parseFloat(e.target.value) || 100 )}
              style={{
                width: '88px',
                padding: '0.38rem 0.55rem',
                borderRadius: '0.5rem',
                border: '1px solid #38bdf8',
                background: '#090d16',
                color: '#f8fafc',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            />
          )}

          <button
            type="button"
            onClick={() => openLogBuyModal()}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.55rem',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: '#fff',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Log Monthly Buy
          </button>

          <button
            type="button"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '0.55rem',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {refreshMutation.isPending ? 'Scanning…' : '↻ Re-Score Watchlist'}
          </button>
        </div>
      </div>

      {/* ── #1 Monthly Pick Spotlight Banner ── */}
      {topPick && topPick.dca && (
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(6, 78, 59, 0.38) 0%, rgba(15, 23, 42, 0.96) 55%, rgba(2, 132, 199, 0.22) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            borderRadius: '0.95rem',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#10b981',
                    color: '#052e16',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    padding: '0.18rem 0.6rem',
                    borderRadius: '999px',
                    letterSpacing: '0.06em',
                  }}
                >
                  ★ #1 BEST WATCHLIST PICK THIS MONTH
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.16rem 0.55rem',
                    borderRadius: '0.35rem',
                    background: tierBadgeStyle(topPick.dca.dca_tier).bg,
                    border: `1px solid ${tierBadgeStyle(topPick.dca.dca_tier).border}`,
                    color: tierBadgeStyle(topPick.dca.dca_tier).color,
                  }}
                >
                  {topPick.dca.dca_label}
                </span>
                {topPick.holding?.below_avg_cost && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.16rem 0.55rem',
                      borderRadius: '0.35rem',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#6ee7b7',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    ⬇ BELOW YOUR AVG COST ({topPick.currency} {fmtPrice(topPick.holding.avg_cost)})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                  {topPick.symbol}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>
                  {topPick.name}
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                  {topPick.currency} {fmtPrice(topPick.price)}
                </span>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: topPick.change_pct >= 0 ? '#34d399' : '#fb7185',
                  }}
                >
                  {topPick.change_pct >= 0 ? '+' : ''}
                  {topPick.change_pct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Score Circle + Quick Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  textAlign: 'center',
                  background: 'rgba(9, 13, 22, 0.8)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '0.75rem',
                  padding: '0.45rem 0.85rem',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em' }}>
                  MONTHLY DCA SCORE
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                  {topPick.dca.dca_score}
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/100</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  openLogBuyModal({
                    symbol: topPick.symbol,
                    asset_type: topPick.asset_type,
                    currency: topPick.currency,
                    price: topPick.price,
                  })
                }
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '0.6rem',
                  border: '1px solid #34d399',
                  background: '#10b981',
                  color: '#052e16',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {sizingMode === 'lot_100'
                  ? `Log 1 Lot Buy (${topPick.currency} ${fmtPrice(topPick.price * 100)})`
                  : `Log $${effectiveCashUnit} Buy (${fmtUnits(effectiveCashUnit / topPick.price)} units)`}
              </button>
            </div>
          </div>

          {/* Why #1 Reasons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {topPick.dca.reasons.map((reason, i) => (
              <div key={i} style={{ fontSize: '0.82rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ color: '#34d399', fontWeight: 900 }}>✓</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Watchlist Monthly DCA Ranking Grid ── */}
      {rankLoading ? (
        <div
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '0.9rem',
            border: '1px solid #1e293b',
            color: '#94a3b8',
          }}
        >
          Scoring your watchlist tickers for this month&apos;s DCA opportunity…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '0.95rem',
          }}
        >
          {ranked.map((item) => {
            const dca = item.dca
            const badge = tierBadgeStyle(dca?.dca_tier)
            const unitsAtSpot = item.price > 0 ? effectiveCashUnit / item.price : 0
            const unitsAtDip = dca && dca.ideal_dip_price > 0 ? effectiveCashUnit / dca.ideal_dip_price : 0
            const lotCostSpot = item.price * 100
            const lotCostDip = (dca?.ideal_dip_price || item.price) * 100

            return (
              <div
                key={item.symbol}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border:
                    item.rank === 1
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid rgba(51, 65, 85, 0.7)',
                  borderRadius: '0.85rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.35rem',
                          background: item.rank === 1 ? '#10b981' : item.rank <= 3 ? '#0284c7' : '#1e293b',
                          color: item.rank === 1 ? '#052e16' : '#f8fafc',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{item.rank}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                        {item.symbol}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          textTransform: 'uppercase',
                          padding: '0.1rem 0.38rem',
                          borderRadius: '0.25rem',
                          background: '#1e293b',
                          color: '#94a3b8',
                          fontWeight: 700,
                        }}
                      >
                        {item.asset_type}
                      </span>
                    </div>

                    {dca && (
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          color: badge.color,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '0.4rem',
                        }}
                      >
                        Score {dca.dca_score}/100
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        color: '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '58%',
                      }}
                    >
                      {item.name}
                    </span>
                    <div style={{ fontFamily: 'monospace' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                        {item.currency} {fmtPrice(item.price)}
                      </span>{' '}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: item.change_pct >= 0 ? '#34d399' : '#fb7185',
                        }}
                      >
                        {item.change_pct >= 0 ? '+' : ''}
                        {item.change_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Tier label + Cost basis badge */}
                  {dca && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '0.14rem 0.48rem',
                          borderRadius: '0.3rem',
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.color,
                        }}
                      >
                        {dca.dca_label}
                      </span>
                      {item.holding && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            padding: '0.14rem 0.48rem',
                            borderRadius: '0.3rem',
                            background: item.holding.below_avg_cost
                              ? 'rgba(16, 185, 129, 0.16)'
                              : 'rgba(148, 163, 184, 0.12)',
                            color: item.holding.below_avg_cost ? '#34d399' : '#cbd5e1',
                            border: item.holding.below_avg_cost
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : '1px solid rgba(148, 163, 184, 0.25)',
                          }}
                        >
                          {item.holding.below_avg_cost ? '⬇ Below Your Avg Cost ' : 'Avg Cost '}
                          ({item.currency} {fmtPrice(item.holding.avg_cost)})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Key Metrics 3-col strip */}
                {dca && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.45rem',
                      background: '#090d16',
                      padding: '0.55rem',
                      borderRadius: '0.55rem',
                      border: '1px solid #1e293b',
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>OFF HIGH</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: dca.drawdown_from_high_pct <= -8 ? '#34d399' : '#cbd5e1',
                        }}
                      >
                        {dca.drawdown_from_high_pct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>RSI (14)</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color:
                            (item.rsi ?? 50) <= 42
                              ? '#34d399'
                              : (item.rsi ?? 50) >= 68
                                ? '#fb7185'
                                : '#e2e8f0',
                        }}
                      >
                        {item.rsi != null ? item.rsi.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>VS SMA 200</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: '#38bdf8',
                        }}
                      >
                        {dca.dist_sma200_pct != null
                          ? `${dca.dist_sma200_pct >= 0 ? '+' : ''}${dca.dist_sma200_pct.toFixed(1)}%`
                          : '—'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Unit / Lot Sizing Calculator Box */}
                {dca && (
                  <div
                    style={{
                      background: 'rgba(2, 132, 199, 0.07)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '0.55rem',
                      padding: '0.6rem 0.7rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.32rem',
                    }}
                  >
                    {sizingMode === 'lot_100' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>1 Lot (100 sh) @ Spot:</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                            {item.currency} {fmtPrice(lotCostSpot)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>
                            Ideal Dip Limit ({item.currency} {fmtPrice(dca.ideal_dip_price)}):
                          </span>
                          <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>
                            {item.currency} {fmtPrice(lotCostDip)}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>${effectiveCashUnit} Unit @ Spot:</span>
                          <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                            {fmtUnits(unitsAtSpot)} {item.asset_type === 'crypto' ? item.symbol : 'shares'}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8' }}>
                            Ideal Dip Limit ({item.currency} {fmtPrice(dca.ideal_dip_price)}):
                          </span>
                          <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>
                            {fmtUnits(unitsAtDip)} {item.asset_type === 'crypto' ? item.symbol : 'shares'}
                          </strong>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                      <span>Deep Value Support (S2 / SMA200):</span>
                      <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
                        {item.currency} {fmtPrice(dca.deep_value_price)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Reasons */}
                {dca && dca.reasons.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {dca.reasons.slice(0, 2).map((r, idx) => (
                      <div key={idx} style={{ fontSize: '0.73rem', color: '#94a3b8', lineHeight: 1.35 }}>
                        • {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Footer */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={() =>
                      openLogBuyModal({
                        symbol: item.symbol,
                        asset_type: item.asset_type,
                        currency: item.currency,
                        price: item.price,
                      })
                    }
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      background: 'rgba(16, 185, 129, 0.14)',
                      color: '#34d399',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    + Log {sizingMode === 'lot_100' ? '1 Lot' : `$${effectiveCashUnit}`} Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTickerForTerminal(item.symbol, item.timeframe, item.asset_type)}
                    style={{
                      padding: '0.45rem 0.7rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #334155',
                      background: '#1e293b',
                      color: '#cbd5e1',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Chart →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Section 2: Monthly Accumulation Portfolio & Cost-Basis Tracker ── */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid #1e293b',
          borderRadius: '0.9rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
              📊 Monthly Accumulation Portfolio &amp; Average Cost Tracker
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Log each monthly $100 unit or 1-lot purchase to track your average cost basis and see when spot price dips below your cost.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openLogBuyModal()}
            style={{
              padding: '0.42rem 0.85rem',
              borderRadius: '0.5rem',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              background: 'rgba(2, 132, 199, 0.2)',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Record Monthly Tranche
          </button>
        </div>

        {/* Summary KPI Strip */}
        {totals && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>TOTAL INVESTED</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                ${fmtPrice(totals.total_invested)}
              </div>
            </div>
            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>CURRENT VALUE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                ${fmtPrice(totals.total_market_value)}
              </div>
            </div>
            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>UNREALIZED P&amp;L</div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  marginTop: '0.2rem',
                  color: totals.total_unrealized_pnl >= 0 ? '#34d399' : '#fb7185',
                }}
              >
                {totals.total_unrealized_pnl >= 0 ? '+' : ''}
                ${fmtPrice(totals.total_unrealized_pnl)} ({totals.total_unrealized_pnl_pct >= 0 ? '+' : ''}
                {totals.total_unrealized_pnl_pct.toFixed(2)}%)
              </div>
            </div>
            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>MONTHLY TRANCHES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                {totals.total_tranches} buys · {totals.holdings_count} tickers
              </div>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        {accumLoading ? (
          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Loading accumulation portfolio…</div>
        ) : holdings.length === 0 ? (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              background: '#090d16',
              borderRadius: '0.65rem',
              border: '1px dashed #334155',
              color: '#94a3b8',
              fontSize: '0.8rem',
            }}
          >
            No monthly buys logged yet. Click <strong>&ldquo;+ Log $100 Buy&rdquo;</strong> or <strong>&ldquo;+ Log 1 Lot Buy&rdquo;</strong> on any card above to start tracking your average cost basis!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Ticker</th>
                  <th style={{ padding: '0.5rem' }}>Units Held</th>
                  <th style={{ padding: '0.5rem' }}>Your Avg Cost</th>
                  <th style={{ padding: '0.5rem' }}>Live Price</th>
                  <th style={{ padding: '0.5rem' }}>Total Invested</th>
                  <th style={{ padding: '0.5rem' }}>Market Value</th>
                  <th style={{ padding: '0.5rem' }}>Unrealized P&amp;L</th>
                  <th style={{ padding: '0.5rem' }}>Tranches</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}>
                    <td style={{ padding: '0.55rem 0.5rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                      {h.symbol}{' '}
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{h.name}</span>
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem', fontFamily: 'monospace', color: '#e2e8f0' }}>
                      {fmtUnits(h.total_units)}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                      {h.currency} {fmtPrice(h.avg_cost)}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem', fontFamily: 'monospace', color: '#f8fafc' }}>
                      {h.currency} {fmtPrice(h.current_price)}{' '}
                      {h.below_avg_cost && (
                        <span
                          style={{
                            fontSize: '0.63rem',
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: '#34d399',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '0.25rem',
                            fontWeight: 700,
                          }}
                        >
                          BELOW AVG
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                      {h.currency} {fmtPrice(h.total_invested)}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                      {h.currency} {fmtPrice(h.market_value)}
                    </td>
                    <td
                      style={{
                        padding: '0.55rem 0.5rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: h.unrealized_pnl >= 0 ? '#34d399' : '#fb7185',
                      }}
                    >
                      {h.unrealized_pnl >= 0 ? '+' : ''}
                      {fmtPrice(h.unrealized_pnl)} ({h.unrealized_pnl_pct >= 0 ? '+' : ''}
                      {h.unrealized_pnl_pct.toFixed(2)}%)
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem', color: '#94a3b8' }}>{h.tranche_count}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Tranche Entries Log */}
        {entries.length > 0 && (
          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.45rem' }}>
              RECENT MONTHLY BUY LOG ({entries.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
              {entries.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    background: '#090d16',
                    borderRadius: '0.45rem',
                    border: '1px solid #1e293b',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{e.bought_at}</span>
                    <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{e.symbol}</strong>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '0.25rem',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        fontWeight: 700,
                      }}
                    >
                      {e.lot_label}
                    </span>
                    <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {fmtUnits(e.units)} units @ {e.currency} {fmtPrice(e.price_per_unit)} ={' '}
                      <strong>
                        {e.currency} {fmtPrice(e.total_amount)}
                      </strong>
                    </span>
                    {e.notes && <span style={{ color: '#64748b' }}>· {e.notes}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteAccumMutation.mutate(e.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Log Monthly Buy Modal ── */}
      {logModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setLogModalOpen(false)}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '0.9rem',
              padding: '1.25rem',
              width: '100%',
              maxWidth: '440px',
              color: '#f8fafc',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                Log Monthly DCA Purchase
              </h3>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Unit Preset Buttons */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 700 }}>
                QUICK MONTHLY SIZING PRESET
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => applyQuickPreset('unit_100')}
                  style={{
                    padding: '0.42rem',
                    borderRadius: '0.45rem',
                    border: formLotLabel === '$100 Unit' ? '1px solid #38bdf8' : '1px solid #334155',
                    background: formLotLabel === '$100 Unit' ? 'rgba(2, 132, 199, 0.22)' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💵 $100 Unit
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset('unit_200')}
                  style={{
                    padding: '0.42rem',
                    borderRadius: '0.45rem',
                    border: formLotLabel === '$200 (2 Units)' ? '1px solid #38bdf8' : '1px solid #334155',
                    background: formLotLabel === '$200 (2 Units)' ? 'rgba(2, 132, 199, 0.22)' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  💵 $200 (2 Units)
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset('lot_100')}
                  style={{
                    padding: '0.42rem',
                    borderRadius: '0.45rem',
                    border: formLotLabel === '1 Lot (100 shares)' ? '1px solid #38bdf8' : '1px solid #334155',
                    background: formLotLabel === '1 Lot (100 shares)' ? 'rgba(2, 132, 199, 0.22)' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📦 1 Lot (100 Shares)
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset('lot_50')}
                  style={{
                    padding: '0.42rem',
                    borderRadius: '0.45rem',
                    border: formLotLabel === '0.5 Lot (50 shares)' ? '1px solid #38bdf8' : '1px solid #334155',
                    background: formLotLabel === '0.5 Lot (50 shares)' ? 'rgba(2, 132, 199, 0.22)' : '#1e293b',
                    color: '#f8fafc',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📦 0.5 Lot (50 Shares)
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBuy} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Ticker Symbol
                  </label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    required
                    style={{
                      width: '100%',
                      padding: '0.48rem',
                      borderRadius: '0.45rem',
                      border: '1px solid #334155',
                      background: '#090d16',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.48rem',
                      borderRadius: '0.45rem',
                      border: '1px solid #334155',
                      background: '#090d16',
                      color: '#f8fafc',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Buy Price ({formCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.48rem',
                      borderRadius: '0.45rem',
                      border: '1px solid #334155',
                      background: '#090d16',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Units / Shares
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formUnits}
                    onChange={(e) => handleUnitsChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.48rem',
                      borderRadius: '0.45rem',
                      border: '1px solid #334155',
                      background: '#090d16',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    Total Invested
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formTotal}
                    onChange={(e) => handleTotalChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.48rem',
                      borderRadius: '0.45rem',
                      border: '1px solid #334155',
                      background: '#090d16',
                      color: '#34d399',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., November monthly DCA tranche at S1 dip"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.48rem',
                    borderRadius: '0.45rem',
                    border: '1px solid #334155',
                    background: '#090d16',
                    color: '#f8fafc',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setLogModalOpen(false)}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAccumMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: '#10b981',
                    color: '#052e16',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {addAccumMutation.isPending ? 'Saving…' : 'Save Monthly Buy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
