import { useState } from 'react'
import {
  useDcaRanking,
  useAccumulations,
  useAddAccumulation,
  useDeleteAccumulation,
  useRefreshWatchlist,
  useTradingProposals,
  useCreateProposal,
  useBotProposalReview,
  useApproveProposal,
  useRejectProposal,
  useBotWallet,
  useUpdateBotWallet,
  useMarketDiscovery,
  useRefreshMarketDiscovery,
  useAddWatchlist,
} from '../../hooks/useTrading'
import type {
  AssetType,
  DcaRankedItem,
  Timeframe,
  TradingOrderProposal,
  MarketDiscoveryItem,
} from '../../types/trading'

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
  const { data: proposalsData } = useTradingProposals()
  const addAccumMutation = useAddAccumulation()
  const deleteAccumMutation = useDeleteAccumulation()
  const refreshMutation = useRefreshWatchlist()
  const createProposalMutation = useCreateProposal()
  const botReviewMutation = useBotProposalReview()
  const approveProposalMutation = useApproveProposal()
  const rejectProposalMutation = useRejectProposal()

  const [sizingMode, setSizingMode] = useState<SizingMode>('unit_100')
  const [customCash, setCustomCash] = useState<number>(100)
  const [proposalFilter, setProposalFilter] = useState<'pending' | 'history'>('pending')
  const [selectedTradeEnv, setSelectedTradeEnv] = useState<'SIMULATE' | 'REAL'>('SIMULATE')
  const [confirmApproveModal, setConfirmApproveModal] = useState<{
    proposal: TradingOrderProposal
    targetEnv: 'SIMULATE' | 'REAL'
    executeOnMoomoo: boolean
  } | null>(null)
  const { data: walletData } = useBotWallet(selectedTradeEnv)
  const { data: modalWalletData } = useBotWallet(confirmApproveModal?.targetEnv || selectedTradeEnv)
  const updateWalletMutation = useUpdateBotWallet()
  const [allocInput, setAllocInput] = useState<string>('')
  const [editingAlloc, setEditingAlloc] = useState(false)
  const [guardrailError, setGuardrailError] = useState<string | null>(null)
  const [discoveryFilter, setDiscoveryFilter] = useState<'ALL' | 'SGX' | 'US' | 'CRYPTO'>('ALL')
  const { data: discoveryItems = [], isLoading: discoveryLoading } = useMarketDiscovery()
  const refreshDiscoveryMutation = useRefreshMarketDiscovery()
  const addWatchlistMutation = useAddWatchlist()

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
  const allProposals: TradingOrderProposal[] = proposalsData?.proposals || []
  const simPendingCount = allProposals.filter(
    (p) => p.status === 'pending_approval' && (p.trade_env || 'SIMULATE') === 'SIMULATE',
  ).length
  const realPendingCount = allProposals.filter(
    (p) => p.status === 'pending_approval' && p.trade_env === 'REAL',
  ).length
  const pendingProposals = allProposals.filter(
    (p) => p.status === 'pending_approval' && (p.trade_env || 'SIMULATE') === selectedTradeEnv,
  )
  const historyProposals = allProposals.filter(
    (p) => p.status !== 'pending_approval' && (p.trade_env || 'SIMULATE') === selectedTradeEnv,
  )

  function handleStagePreApproval(item: DcaRankedItem, useDipPrice = false) {
    const entryPrice =
      useDipPrice && item.dca?.ideal_dip_price ? item.dca.ideal_dip_price : item.price
    let qty = 1
    let lotLabel = `$${effectiveCashUnit} Unit`
    if (sizingMode === 'lot_100') {
      qty = 100
      lotLabel = '1 Lot (100 shares)'
    } else if (item.asset_type === 'crypto') {
      qty = Number((effectiveCashUnit / entryPrice).toFixed(6))
    } else {
      qty = Math.max(1, Math.round(effectiveCashUnit / entryPrice))
      lotLabel = `$${effectiveCashUnit} Unit (${qty} sh)`
    }

    setGuardrailError(null)
    createProposalMutation.mutate(
      {
        symbol: item.symbol,
        name: item.name,
        asset_type: item.asset_type,
        currency: item.currency,
        qty,
        proposed_price: entryPrice,
        lot_label: lotLabel,
        trade_env: selectedTradeEnv,
        proposed_dca_score: item.dca?.dca_score ?? 70,
        proposed_rsi: item.rsi,
        proposed_signal: item.technical_signal,
        proposal_reason:
          item.dca?.reasons?.join(' ') ||
          `Staged from Watchlist DCA Rank #${item.rank} at ${item.currency} ${fmtPrice(entryPrice)}.`,
      },
      {
        onError: (err: any) => {
          setGuardrailError(
            err?.response?.data?.error || err?.message || 'Failed to stage pre-approval request',
          )
        },
      },
    )
  }

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

      {/* ── Moomoo Pre-Approval Queue & Bot Re-Evaluation Lifecycle ── */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          border:
            pendingProposals.length > 0
              ? '1px solid rgba(245, 158, 11, 0.5)'
              : '1px solid rgba(51, 65, 85, 0.7)',
          borderRadius: '0.9rem',
          padding: '1rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.16rem 0.55rem',
                  borderRadius: '999px',
                  background:
                    pendingProposals.length > 0
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(56, 189, 248, 0.15)',
                  color: pendingProposals.length > 0 ? '#fbbf24' : '#38bdf8',
                  border:
                    pendingProposals.length > 0
                      ? '1px solid rgba(245, 158, 11, 0.45)'
                      : '1px solid rgba(56, 189, 248, 0.35)',
                }}
              >
                {pendingProposals.length > 0
                  ? `${pendingProposals.length} AWAITING YOUR PRE-APPROVAL`
                  : 'PRE-APPROVAL & BOT GUARDRAIL'}
              </span>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc' }}>
                🛡️ Moomoo Trade Pre-Approval &amp; Bot Worthiness Review
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Every trade waits for your pre-approval. If you haven&apos;t reviewed a request yet, the bot re-evaluates it hourly (checking price drift, RSI &amp; DCA score) and auto-cancels it if the dip is gone and no longer worth performing.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Moomoo Env Selector */}
            <div
              style={{
                display: 'inline-flex',
                background: '#090d16',
                padding: '0.2rem',
                borderRadius: '0.5rem',
                border: '1px solid #1e293b',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedTradeEnv('SIMULATE')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '0.38rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedTradeEnv === 'SIMULATE' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: selectedTradeEnv === 'SIMULATE' ? '#38bdf8' : '#64748b',
                }}
              >
                🧪 SIMULATE ({simPendingCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTradeEnv('REAL')}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '0.38rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedTradeEnv === 'REAL' ? 'rgba(245, 158, 11, 0.22)' : 'transparent',
                  color: selectedTradeEnv === 'REAL' ? '#fbbf24' : '#64748b',
                }}
              >
                💵 REAL ({realPendingCount})
              </button>
            </div>

            {/* Filter Pending vs History */}
            <div
              style={{
                display: 'inline-flex',
                background: '#090d16',
                padding: '0.2rem',
                borderRadius: '0.5rem',
                border: '1px solid #1e293b',
              }}
            >
              <button
                type="button"
                onClick={() => setProposalFilter('pending')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '0.38rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: proposalFilter === 'pending' ? '#1e293b' : 'transparent',
                  color: proposalFilter === 'pending' ? '#f8fafc' : '#64748b',
                }}
              >
                Pending ({pendingProposals.length})
              </button>
              <button
                type="button"
                onClick={() => setProposalFilter('history')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '0.38rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: proposalFilter === 'history' ? '#1e293b' : 'transparent',
                  color: proposalFilter === 'history' ? '#f8fafc' : '#64748b',
                }}
              >
                📜 Execution History ({historyProposals.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => botReviewMutation.mutate(undefined)}
              disabled={botReviewMutation.isPending}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                background: 'rgba(2, 132, 199, 0.18)',
                color: '#38bdf8',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {botReviewMutation.isPending
                ? '🤖 Bot Reviewing…'
                : '🤖 Bot Re-Evaluate Unreviewed Now'}
            </button>
          </div>
        </div>

        {/* ── 2-Column Strip: Live Moomoo Account Balance vs Website Bot Allocated Balance Guardrail ── */}
        {walletData && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {/* Card 1: Live Moomoo Account Balance */}
            <div
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '0.7rem',
                padding: '0.8rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
                  🏦 MOOMOO ACCOUNT BALANCE ({walletData.moomoo.trd_env})
                </span>
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    padding: '0.12rem 0.45rem',
                    borderRadius: '999px',
                    background: walletData.moomoo.connected
                      ? 'rgba(16, 185, 129, 0.16)'
                      : 'rgba(245, 158, 11, 0.15)',
                    color: walletData.moomoo.connected ? '#34d399' : '#fbbf24',
                  }}
                >
                  {walletData.moomoo.connected
                    ? `● Connected (${walletData.moomoo.acc_id || 'OpenD'})`
                    : '○ OpenD Offline'}
                </span>
              </div>

              {walletData.moomoo.connected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>CASH BALANCE</div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                        {walletData.moomoo.currency} {fmtPrice(walletData.moomoo.cash)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>TOTAL ASSETS</div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                        {walletData.moomoo.currency} {fmtPrice(walletData.moomoo.total_assets)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>BUYING POWER</div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#cbd5e1', fontFamily: 'monospace' }}>
                        {walletData.moomoo.currency} {fmtPrice(walletData.moomoo.buying_power)}
                      </div>
                    </div>
                  </div>
                  {(walletData.moomoo.sg_cash != null || walletData.moomoo.us_cash != null) && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#94a3b8',
                        borderTop: '1px solid rgba(51,65,85,0.6)',
                        paddingTop: '0.35rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.65rem',
                      }}
                    >
                      {walletData.moomoo.sg_cash != null && (
                        <span>
                          SG Cash: <strong style={{ color: '#e2e8f0' }}>SGD {fmtPrice(walletData.moomoo.sg_cash)}</strong>
                        </span>
                      )}
                      {walletData.moomoo.us_cash != null && (
                        <span>
                          US Cash: <strong style={{ color: '#e2e8f0' }}>USD {fmtPrice(walletData.moomoo.us_cash)}</strong>
                        </span>
                      )}
                      {walletData.moomoo.sgd_assets != null && walletData.moomoo.sgd_assets > 0 && (
                        <span>
                          SGX Assets: <strong style={{ color: '#38bdf8' }}>SGD {fmtPrice(walletData.moomoo.sgd_assets)}</strong>
                        </span>
                      )}
                      {walletData.moomoo.usd_assets != null && walletData.moomoo.usd_assets > 0 && (
                        <span>
                          US Assets: <strong style={{ color: '#38bdf8' }}>USD {fmtPrice(walletData.moomoo.usd_assets)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.73rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  Moomoo OpenD gateway is not currently logged in ({walletData.moomoo.error || 'offline'}). Start/login Moomoo OpenD in Quant Settings to view live broker cash &amp; auto-route stock orders; pre-approvals &amp; bot allocation limits remain active.
                </div>
              )}
            </div>

            {/* Card 2: Website Bot Allocated Balance (Strict Guardrail — Separate per SIMULATE vs REAL) */}
            <div
              style={{
                background:
                  selectedTradeEnv === 'REAL'
                    ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.25), rgba(9, 13, 22, 0.96))'
                    : 'linear-gradient(135deg, rgba(6, 78, 59, 0.22), rgba(9, 13, 22, 0.96))',
                border:
                  selectedTradeEnv === 'REAL'
                    ? '1px solid rgba(245, 158, 11, 0.5)'
                    : '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '0.7rem',
                padding: '0.8rem 0.95rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: selectedTradeEnv === 'REAL' ? '#fcd34d' : '#6ee7b7',
                      letterSpacing: '0.05em',
                    }}
                  >
                    🔒 BOT ALLOCATED WALLET
                  </span>
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '0.12rem 0.48rem',
                      borderRadius: '999px',
                      background:
                        selectedTradeEnv === 'REAL'
                          ? 'rgba(245, 158, 11, 0.22)'
                          : 'rgba(56, 189, 248, 0.18)',
                      color: selectedTradeEnv === 'REAL' ? '#fbbf24' : '#38bdf8',
                      border:
                        selectedTradeEnv === 'REAL'
                          ? '1px solid rgba(245, 158, 11, 0.55)'
                          : '1px solid rgba(56, 189, 248, 0.45)',
                    }}
                  >
                    {selectedTradeEnv === 'REAL'
                      ? '💵 REAL WALLET (LIVE MONEY)'
                      : '🧪 SIMULATE WALLET (PAPER FUND)'}
                  </span>
                </div>
                {!editingAlloc ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAllocInput(String(walletData.budget.allocated_budget))
                      setEditingAlloc(true)
                    }}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '0.35rem',
                      border:
                        selectedTradeEnv === 'REAL'
                          ? '1px solid rgba(245, 158, 11, 0.5)'
                          : '1px solid rgba(16, 185, 129, 0.45)',
                      background:
                        selectedTradeEnv === 'REAL'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(16, 185, 129, 0.14)',
                      color: selectedTradeEnv === 'REAL' ? '#fbbf24' : '#34d399',
                      cursor: 'pointer',
                    }}
                  >
                    ✎ Set {selectedTradeEnv} Allocation (${fmtPrice(walletData.budget.allocated_budget)})
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={allocInput}
                      onChange={(e) => setAllocInput(e.target.value)}
                      style={{
                        width: '92px',
                        padding: '0.2rem 0.45rem',
                        borderRadius: '0.35rem',
                        border: '1px solid #34d399',
                        background: '#090d16',
                        color: '#f8fafc',
                        fontSize: '0.74rem',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const val = parseFloat(allocInput)
                        if (isFinite(val) && val >= 0) {
                          await updateWalletMutation.mutateAsync({
                            allocated_budget: val,
                            trade_env: selectedTradeEnv,
                          })
                          setEditingAlloc(false)
                          setGuardrailError(null)
                        }
                      }}
                      disabled={updateWalletMutation.isPending}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.22rem 0.55rem',
                        borderRadius: '0.35rem',
                        border: 'none',
                        background: '#10b981',
                        color: '#052e16',
                        cursor: 'pointer',
                      }}
                    >
                      Save ({selectedTradeEnv})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAlloc(false)}
                      style={{
                        fontSize: '0.68rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>
                    {selectedTradeEnv} ALLOCATED
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                    ${fmtPrice(walletData.budget.allocated_budget)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>DEPLOYED IN BUYS</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#cbd5e1', fontFamily: 'monospace' }}>
                    ${fmtPrice(walletData.budget.used_budget)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>REALIZED PROFIT</div>
                  <div
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: (walletData.budget.realized_profit ?? 0) >= 0 ? '#34d399' : '#fb7185',
                      fontFamily: 'monospace',
                    }}
                  >
                    {(walletData.budget.realized_profit ?? 0) >= 0 ? '+' : ''}$
                    {fmtPrice(walletData.budget.realized_profit ?? 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>AVAILABLE TO BOT</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                    ${fmtPrice(walletData.budget.available_bot_balance)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '0.66rem',
                  color: '#94a3b8',
                  borderTop: '1px solid rgba(16,185,129,0.2)',
                  paddingTop: '0.32rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                }}
              >
                <span>
                  🛡️ <strong>Separate SIMULATE vs REAL Wallets:</strong> Switching the toggle above switches between your{' '}
                  <strong style={{ color: '#38bdf8' }}>🧪 SIMULATE Paper Wallet</strong> and{' '}
                  <strong style={{ color: '#fbbf24' }}>💵 REAL Live Wallet</strong>. Paper trades never touch your REAL allocation, and the bot can ONLY sell positions bought by this bot.
                </span>
                {(walletData.budget.sell_proceeds_recycled ?? 0) > 0 && (
                  <span style={{ color: '#6ee7b7', fontFamily: 'monospace' }}>
                    Recycled Proceeds: +${fmtPrice(walletData.budget.sell_proceeds_recycled)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {guardrailError && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '0.5rem',
              background: 'rgba(244, 63, 94, 0.14)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fda4af',
              fontSize: '0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🛑 {guardrailError}</span>
            <button
              type="button"
              onClick={() => setGuardrailError(null)}
              style={{ background: 'transparent', border: 'none', color: '#fda4af', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Proposals List */}
        {proposalFilter === 'pending' ? (
          pendingProposals.length === 0 ? (
            <div
              style={{
                padding: '0.9rem 1rem',
                background: '#090d16',
                borderRadius: '0.6rem',
                border: '1px dashed #334155',
                color: '#94a3b8',
                fontSize: '0.78rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span>
                No pending pre-approval requests right now. Click <strong>&ldquo;📝 Stage Pre-Approval&rdquo;</strong> on any stock below or click <strong>&ldquo;🤖 Bot Re-Evaluate Unreviewed Now&rdquo;</strong> to let the bot scan and stage top watchlist picks.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {pendingProposals.map((p) => {
                const isBetterEntry = p.price_drift_pct <= -0.5
                const isDriftingUp = p.price_drift_pct >= 2.0
                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#090d16',
                      border: isBetterEntry
                        ? '1px solid rgba(16, 185, 129, 0.5)'
                        : isDriftingUp
                          ? '1px solid rgba(245, 158, 11, 0.5)'
                          : '1px solid #1e293b',
                      borderRadius: '0.75rem',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.65rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              padding: '0.15rem 0.52rem',
                              borderRadius: '0.32rem',
                              background:
                                p.trade_env === 'REAL'
                                  ? 'rgba(245, 158, 11, 0.24)'
                                  : 'rgba(56, 189, 248, 0.2)',
                              border:
                                p.trade_env === 'REAL'
                                  ? '1px solid rgba(245, 158, 11, 0.65)'
                                  : '1px solid rgba(56, 189, 248, 0.55)',
                              color: p.trade_env === 'REAL' ? '#fde68a' : '#7dd3fc',
                              fontFamily: 'monospace',
                            }}
                          >
                            {p.trade_env === 'REAL'
                              ? '💵 STAGED FOR: REAL (LIVE MONEY)'
                              : '🧪 STAGED FOR: SIMULATE (PAPER)'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              padding: '0.14rem 0.48rem',
                              borderRadius: '0.3rem',
                              background:
                                p.side === 'SELL'
                                  ? 'rgba(245, 158, 11, 0.22)'
                                  : 'rgba(16, 185, 129, 0.18)',
                              color: p.side === 'SELL' ? '#fbbf24' : '#34d399',
                              fontFamily: 'monospace',
                            }}
                          >
                            {p.side === 'SELL' ? '💰 SELL · TAKE PROFIT' : p.side} {fmtUnits(p.qty)} {p.symbol}
                          </span>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '0.14rem 0.45rem',
                              borderRadius: '0.3rem',
                              background: 'rgba(56, 189, 248, 0.14)',
                              color: '#38bdf8',
                            }}
                          >
                            {p.lot_label} · {p.market}
                          </span>
                          {p.source === 'bot_discovery' && (
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.14rem 0.48rem',
                                borderRadius: '0.3rem',
                                background: 'rgba(168, 85, 247, 0.2)',
                                border: '1px solid rgba(168, 85, 247, 0.45)',
                                color: '#d8b4fe',
                              }}
                            >
                              🌟 NEW MARKET PROPOSAL (OUTSIDE WATCHLIST)
                            </span>
                          )}
                          {p.side === 'SELL' && p.realized_pnl != null && (
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '0.14rem 0.48rem',
                                borderRadius: '0.3rem',
                                background:
                                  p.realized_pnl >= 0
                                    ? 'rgba(16, 185, 129, 0.2)'
                                    : 'rgba(244, 63, 94, 0.2)',
                                color: p.realized_pnl >= 0 ? '#34d399' : '#fb7185',
                                fontFamily: 'monospace',
                              }}
                            >
                              Est. Profit: {p.realized_pnl >= 0 ? '+' : ''}
                              {p.currency} {fmtPrice(p.realized_pnl)} → Recycles to Bot Wallet
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.65rem',
                              color: '#64748b',
                              fontFamily: 'monospace',
                            }}
                          >
                            Proposed @ {p.currency} {fmtPrice(p.proposed_price)} (Est. {p.currency}{' '}
                            {fmtPrice(p.total_estimated_cost)})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.3rem' }}>
                          {p.proposal_reason}
                        </div>
                      </div>

                      {/* Live vs Proposed Comparison + Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div
                          style={{
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontSize: '0.74rem',
                            paddingRight: '0.4rem',
                          }}
                        >
                          <div style={{ color: '#f8fafc', fontWeight: 800 }}>
                            Live: {p.currency} {fmtPrice(p.current_price)}{' '}
                            <span
                              style={{
                                color:
                                  p.price_drift_pct <= 0
                                    ? '#34d399'
                                    : p.price_drift_pct > 2.5
                                      ? '#fbbf24'
                                      : '#94a3b8',
                              }}
                            >
                              ({p.price_drift_pct >= 0 ? '+' : ''}
                              {p.price_drift_pct.toFixed(2)}%)
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            DCA Score: <strong style={{ color: '#34d399' }}>{p.current_dca_score}/100</strong> (was{' '}
                            {p.proposed_dca_score})
                          </div>
                        </div>

                        {p.asset_type === 'crypto' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setGuardrailError(null)
                              setConfirmApproveModal({
                                proposal: p,
                                targetEnv: p.trade_env || selectedTradeEnv,
                                executeOnMoomoo: false,
                              })
                            }}
                            disabled={approveProposalMutation.isPending}
                            style={{
                              padding: '0.45rem 0.8rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #34d399',
                              background: '#10b981',
                              color: '#052e16',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✅ Approve &amp; Log Crypto DCA
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setGuardrailError(null)
                                setConfirmApproveModal({
                                  proposal: p,
                                  targetEnv: 'SIMULATE',
                                  executeOnMoomoo: true,
                                })
                              }}
                              disabled={approveProposalMutation.isPending}
                              title="Review & confirm execution in Moomoo SIMULATE (Paper Trading Account) using virtual funds"
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '0.5rem',
                                border:
                                  p.trade_env === 'SIMULATE'
                                    ? '2px solid #38bdf8'
                                    : '1px solid rgba(56, 189, 248, 0.45)',
                                background:
                                  p.trade_env === 'SIMULATE'
                                    ? 'rgba(2, 132, 199, 0.32)'
                                    : 'rgba(15, 23, 42, 0.9)',
                                color: '#7dd3fc',
                                fontWeight: 800,
                                fontSize: '0.73rem',
                                cursor: 'pointer',
                              }}
                            >
                              🧪 Approve SIMULATE (Paper)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setGuardrailError(null)
                                setConfirmApproveModal({
                                  proposal: p,
                                  targetEnv: 'REAL',
                                  executeOnMoomoo: true,
                                })
                              }}
                              disabled={approveProposalMutation.isPending}
                              title="Review & confirm execution in Moomoo REAL (Live Brokerage Account) using real money"
                              style={{
                                padding: '0.45rem 0.75rem',
                                borderRadius: '0.5rem',
                                border:
                                  p.trade_env === 'REAL'
                                    ? '2px solid #fbbf24'
                                    : '1px solid rgba(245, 158, 11, 0.5)',
                                background:
                                  p.trade_env === 'REAL'
                                    ? 'rgba(245, 158, 11, 0.28)'
                                    : 'rgba(245, 158, 11, 0.12)',
                                color: '#fde68a',
                                fontWeight: 800,
                                fontSize: '0.73rem',
                                cursor: 'pointer',
                              }}
                            >
                              💵 Approve REAL (Live)
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => botReviewMutation.mutate(p.id)}
                          disabled={botReviewMutation.isPending}
                          title="Ask bot to re-verify live price, RSI & DCA score right now"
                          style={{
                            padding: '0.45rem 0.65rem',
                            borderRadius: '0.5rem',
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          🤖 Re-Check Worth
                        </button>

                        <button
                          type="button"
                          onClick={() => rejectProposalMutation.mutate(p.id)}
                          disabled={rejectProposalMutation.isPending}
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            background: 'rgba(244, 63, 94, 0.12)',
                            color: '#fb7185',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>

                    {/* Bot Re-Check Verdict Strip */}
                    {p.last_bot_review_note && (
                      <div
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '0.45rem',
                          background: isBetterEntry
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'rgba(56, 189, 248, 0.08)',
                          border: isBetterEntry
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid rgba(56, 189, 248, 0.2)',
                          fontSize: '0.73rem',
                          color: isBetterEntry ? '#6ee7b7' : '#bae6fd',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.4rem',
                        }}
                      >
                        <span>🤖 {p.last_bot_review_note}</span>
                        {p.last_bot_review_at && (
                          <span style={{ fontSize: '0.66rem', color: '#64748b', fontFamily: 'monospace' }}>
                            Reviews: {p.bot_review_count}× · Last:{' '}
                            {new Date(p.last_bot_review_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        ) : historyProposals.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: '#64748b', padding: '0.5rem 0' }}>
            No executed or bot-cancelled proposals yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '240px', overflowY: 'auto' }}>
            {historyProposals.map((p) => {
              const isExecuted = p.status === 'executed'
              const isBotCancelled = p.status === 'cancelled_bot_stale'
              const isFailed = p.status === 'failed'
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: '#090d16',
                    border: isFailed ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #1e293b',
                    fontSize: '0.74rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.64rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.42rem',
                          borderRadius: '0.25rem',
                          background: isExecuted
                            ? 'rgba(16, 185, 129, 0.18)'
                            : isFailed
                              ? 'rgba(239, 68, 68, 0.2)'
                              : isBotCancelled
                                ? 'rgba(245, 158, 11, 0.18)'
                                : 'rgba(148, 163, 184, 0.14)',
                          color: isExecuted ? '#34d399' : isFailed ? '#f87171' : isBotCancelled ? '#fbbf24' : '#94a3b8',
                          border: isFailed ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                        }}
                      >
                        {isExecuted
                          ? '✅ APPROVED & EXECUTED'
                          : isFailed
                            ? '❌ ORDER FAILED / REJECTED'
                            : isBotCancelled
                              ? '🛑 AUTO-CANCELLED BY BOT (NO LONGER WORTH IT)'
                              : '✕ REJECTED BY USER'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.42rem',
                          borderRadius: '0.25rem',
                          background:
                            p.trade_env === 'REAL'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(56, 189, 248, 0.16)',
                          border:
                            p.trade_env === 'REAL'
                              ? '1px solid rgba(245, 158, 11, 0.5)'
                              : '1px solid rgba(56, 189, 248, 0.4)',
                          color: p.trade_env === 'REAL' ? '#fde68a' : '#7dd3fc',
                          fontFamily: 'monospace',
                        }}
                      >
                        {p.trade_env === 'REAL' ? '💵 REAL (LIVE)' : '🧪 SIMULATE (PAPER)'}
                      </span>
                      <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>
                        {p.side} {fmtUnits(p.qty)} {p.symbol} ({p.lot_label})
                      </strong>
                      <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                        @ {p.currency} {fmtPrice(p.current_price || p.proposed_price)}
                      </span>
                      {p.moomoo_order_id && (
                        <span
                          style={{
                            fontSize: '0.64rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '0.2rem',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#6ee7b7',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontFamily: 'monospace',
                          }}
                        >
                          Moomoo #{p.moomoo_order_id}
                        </span>
                      )}
                    </div>
                    {p.reviewed_at && (
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {new Date(p.reviewed_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {(p.execution_note || p.last_bot_review_note) && (
                    <div style={{ fontSize: '0.71rem', color: isFailed ? '#fca5a5' : isBotCancelled ? '#fde68a' : '#94a3b8' }}>
                      {p.execution_note || p.last_bot_review_note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
                onClick={() => handleStagePreApproval(topPick, false)}
                disabled={createProposalMutation.isPending}
                style={{
                  padding: '0.6rem 0.95rem',
                  borderRadius: '0.6rem',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  background: 'rgba(245, 158, 11, 0.16)',
                  color: '#fbbf24',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                📝 Stage Pre-Approval
              </button>

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
                <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleStagePreApproval(item, false)}
                    disabled={createProposalMutation.isPending}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.55rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      background: 'rgba(245, 158, 11, 0.14)',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    📝 Pre-Approve
                  </button>
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
                      padding: '0.45rem 0.55rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      background: 'rgba(16, 185, 129, 0.14)',
                      color: '#34d399',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    + Log {sizingMode === 'lot_100' ? '1 Lot' : `$${effectiveCashUnit}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTickerForTerminal(item.symbol, item.timeframe, item.asset_type)}
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #334155',
                      background: '#1e293b',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
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

      {/* ── Section 1.5: Bot New Market Discovery (Proposed Outside Watchlist) ── */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(46, 16, 101, 0.28) 0%, rgba(15, 23, 42, 0.94) 60%)',
          border: '1px solid rgba(168, 85, 247, 0.38)',
          borderRadius: '0.9rem',
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.95rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 900,
                  padding: '0.16rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(168, 85, 247, 0.22)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: '#d8b4fe',
                }}
              >
                🌟 BEYOND YOUR WATCHLIST
              </span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                🌍 Bot New Market Proposals &amp; Why They Are Worth Considering
              </h3>
            </div>
            <p style={{ margin: '0.22rem 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
              Scans SGX Dividend Banks &amp; REITs, US Quality Compounders, Low-Fee ETFs, and Crypto outside your watchlist—ranking new monthly DCA ideas with fundamental + technical reasons.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                background: '#090d16',
                padding: '0.2rem',
                borderRadius: '0.5rem',
                border: '1px solid #1e293b',
              }}
            >
              {(['ALL', 'SGX', 'US', 'CRYPTO'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDiscoveryFilter(f)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    borderRadius: '0.38rem',
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      discoveryFilter === f ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                    color: discoveryFilter === f ? '#e9d5ff' : '#64748b',
                  }}
                >
                  {f === 'ALL'
                    ? 'All Markets'
                    : f === 'SGX'
                      ? '🇸🇬 SGX (1-Lot)'
                      : f === 'US'
                        ? '🇺🇸 US Stocks & ETFs'
                        : '🪙 Crypto'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => refreshDiscoveryMutation.mutate()}
              disabled={refreshDiscoveryMutation.isPending}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(168, 85, 247, 0.45)',
                background: 'rgba(168, 85, 247, 0.16)',
                color: '#e9d5ff',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {refreshDiscoveryMutation.isPending ? 'Scanning Markets…' : '🔍 Rescan New Markets'}
            </button>
          </div>
        </div>

        {discoveryLoading ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
            Scanning US, SGX, ETF &amp; Crypto markets outside your watchlist…
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '0.9rem',
            }}
          >
            {discoveryItems
              .filter((d) => discoveryFilter === 'ALL' || d.market === discoveryFilter)
              .map((disc: MarketDiscoveryItem) => {
                const badge = tierBadgeStyle(disc.dca?.dca_tier)
                const isSgx = disc.market === 'SGX' || disc.symbol.endsWith('.SI')
                const unitsSpot = disc.price > 0 ? effectiveCashUnit / disc.price : 0
                const lotCostSpot = disc.price * 100

                return (
                  <div
                    key={disc.symbol}
                    style={{
                      background: 'rgba(9, 13, 22, 0.88)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: '0.8rem',
                      padding: '0.95rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 900,
                              padding: '0.14rem 0.45rem',
                              borderRadius: '0.3rem',
                              background: 'rgba(168, 85, 247, 0.22)',
                              color: '#e9d5ff',
                            }}
                          >
                            🌟 #{disc.rank}
                          </span>
                          <span style={{ fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                            {disc.symbol}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '0.12rem 0.42rem',
                              borderRadius: '0.28rem',
                              background: '#1e293b',
                              color: '#cbd5e1',
                              fontWeight: 700,
                            }}
                          >
                            {disc.category}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 900,
                            fontFamily: 'monospace',
                            color: badge.color,
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            padding: '0.14rem 0.5rem',
                            borderRadius: '0.38rem',
                          }}
                        >
                          DCA {disc.dca.dca_score}/100
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.35rem' }}>
                        <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{disc.name}</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                          {disc.currency} {fmtPrice(disc.price)}{' '}
                          <span
                            style={{
                              fontSize: '0.74rem',
                              color: disc.change_pct >= 0 ? '#34d399' : '#fb7185',
                            }}
                          >
                            ({disc.change_pct >= 0 ? '+' : ''}
                            {disc.change_pct.toFixed(2)}%)
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Why the Bot Proposes This New Market Ticker */}
                    <div
                      style={{
                        background: 'rgba(168, 85, 247, 0.08)',
                        border: '1px solid rgba(168, 85, 247, 0.24)',
                        borderRadius: '0.55rem',
                        padding: '0.6rem 0.7rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.32rem',
                      }}
                    >
                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#d8b4fe', letterSpacing: '0.04em' }}>
                        🤖 WHY BOT PROPOSES THIS MARKET:
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#f1f5f9', lineHeight: 1.38 }}>
                        <strong>Thesis:</strong> {disc.thesis_hook}
                      </div>
                      {disc.dca.reasons.slice(0, 2).map((r, idx) => (
                        <div key={idx} style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                          • {r}
                        </div>
                      ))}
                    </div>

                    {/* Quick Sizing Line */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        background: '#0f172a',
                        padding: '0.42rem 0.6rem',
                        borderRadius: '0.45rem',
                      }}
                    >
                      <span>
                        {isSgx || sizingMode === 'lot_100'
                          ? `1 Lot (100 sh): ${disc.currency} ${fmtPrice(lotCostSpot)}`
                          : `$${effectiveCashUnit} Unit: ${fmtUnits(unitsSpot)} sh`}
                      </span>
                      <span style={{ color: '#34d399' }}>
                        Dip S1: {disc.currency} {fmtPrice(disc.dca.ideal_dip_price)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() =>
                          handleStagePreApproval(
                            {
                              rank: disc.rank,
                              watchlist_id: 0,
                              symbol: disc.symbol,
                              asset_type: disc.asset_type,
                              name: disc.name,
                              timeframe: '1d',
                              currency: disc.currency,
                              exchange: disc.exchange,
                              price: disc.price,
                              change_pct: disc.change_pct,
                              technical_score: disc.technical_score,
                              technical_signal: disc.technical_signal,
                              rsi: disc.rsi,
                              sma200: disc.sma200,
                              sma50: null,
                              support_s1: disc.support_s1,
                              period_high: null,
                              ai_bias: null,
                              ai_summary: null,
                              dca: disc.dca,
                              holding: null,
                              fetched_at: disc.fetched_at,
                            },
                            false,
                          )
                        }
                        disabled={createProposalMutation.isPending}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.55rem',
                          borderRadius: '0.5rem',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          background: 'rgba(245, 158, 11, 0.14)',
                          color: '#fbbf24',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        📝 Pre-Approve
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          addWatchlistMutation.mutate({
                            symbol: disc.symbol,
                            asset_type: disc.asset_type,
                            timeframe: '1d',
                            name: disc.name,
                          })
                        }
                        disabled={addWatchlistMutation.isPending}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '0.5rem',
                          border: '1px solid rgba(168, 85, 247, 0.45)',
                          background: 'rgba(168, 85, 247, 0.16)',
                          color: '#e9d5ff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Watchlist
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectTickerForTerminal(disc.symbol, '1d', disc.asset_type)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #334155',
                          background: '#1e293b',
                          color: '#cbd5e1',
                          fontSize: '0.72rem',
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
      </div>

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
                  <th style={{ padding: '0.5rem' }}>Account / Env</th>
                  <th style={{ padding: '0.5rem' }}>Units Held</th>
                  <th style={{ padding: '0.5rem' }}>Your Avg Cost</th>
                  <th style={{ padding: '0.5rem' }}>Live Price</th>
                  <th style={{ padding: '0.5rem' }}>Total Invested</th>
                  <th style={{ padding: '0.5rem' }}>Market Value</th>
                  <th style={{ padding: '0.5rem' }}>Unrealized P&amp;L</th>
                  <th style={{ padding: '0.5rem' }}>Realized P&amp;L</th>
                  <th style={{ padding: '0.5rem' }}>Bot Action</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.symbol} style={{ borderBottom: '1px solid rgba(30, 41, 59, 0.6)' }}>
                    <td style={{ padding: '0.55rem 0.5rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                      {h.symbol}{' '}
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>{h.name}</span>
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '0.12rem 0.42rem',
                          borderRadius: '0.25rem',
                          background:
                            h.trade_env === 'REAL'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(56, 189, 248, 0.16)',
                          border:
                            h.trade_env === 'REAL'
                              ? '1px solid rgba(245, 158, 11, 0.5)'
                              : '1px solid rgba(56, 189, 248, 0.4)',
                          color: h.trade_env === 'REAL' ? '#fde68a' : '#7dd3fc',
                          fontFamily: 'monospace',
                        }}
                      >
                        {h.trade_env === 'REAL' ? '💵 REAL' : '🧪 SIMULATE'}
                      </span>
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
                    <td
                      style={{
                        padding: '0.55rem 0.5rem',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: (h.realized_pnl ?? 0) >= 0 ? '#34d399' : '#fb7185',
                      }}
                    >
                      {(h.realized_pnl ?? 0) >= 0 ? '+' : ''}
                      {fmtPrice(h.realized_pnl ?? 0)}
                    </td>
                    <td style={{ padding: '0.55rem 0.5rem' }}>
                      {(h.sellable_units ?? h.total_units) > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const sellQty = h.sellable_units ?? h.total_units
                            setGuardrailError(null)
                            createProposalMutation.mutate(
                              {
                                symbol: h.symbol,
                                name: h.name,
                                asset_type: h.asset_type,
                                currency: h.currency,
                                side: 'SELL',
                                qty: sellQty,
                                proposed_price: h.current_price,
                                lot_label: `Bot Holding (${fmtUnits(sellQty)} sh)`,
                                trade_env: selectedTradeEnv,
                                proposed_dca_score: 50,
                                proposed_signal: 'sell',
                                proposal_reason: `Take-profit SELL on ${fmtUnits(sellQty)} bot-owned ${h.symbol} (avg cost ${h.currency} ${fmtPrice(h.avg_cost)} → live ${h.currency} ${fmtPrice(h.current_price)}, P&L ${h.unrealized_pnl >= 0 ? '+' : ''}${h.currency} ${fmtPrice(h.unrealized_pnl)}). Proceeds & profit recycle into Bot Wallet.`,
                              },
                              {
                                onError: (err: any) => {
                                  setGuardrailError(
                                    err?.response?.data?.error ||
                                      err?.message ||
                                      'Failed to stage bot SELL proposal',
                                  )
                                },
                              },
                            )
                          }}
                          disabled={createProposalMutation.isPending}
                          style={{
                            padding: '0.28rem 0.55rem',
                            borderRadius: '0.38rem',
                            border: '1px solid rgba(245, 158, 11, 0.45)',
                            background: 'rgba(245, 158, 11, 0.14)',
                            color: '#fbbf24',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          💰 Stage Bot SELL
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Tranche Entries Log */}
        {entries.length > 0 && (
          <div style={{ marginTop: '0.4rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', marginBottom: '0.45rem', letterSpacing: '0.04em' }}>
              📜 BOT EXECUTED TRADE &amp; ACCUMULATION LOG ({entries.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '240px', overflowY: 'auto' }}>
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
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 900,
                        padding: '0.1rem 0.42rem',
                        borderRadius: '0.25rem',
                        background:
                          e.side === 'SELL'
                            ? 'rgba(245, 158, 11, 0.22)'
                            : 'rgba(16, 185, 129, 0.18)',
                        color: e.side === 'SELL' ? '#fbbf24' : '#34d399',
                        fontFamily: 'monospace',
                      }}
                    >
                      {e.side === 'SELL' ? '💰 SELL' : '🟢 BUY'}
                    </span>
                    {e.trade_env && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.38rem',
                          borderRadius: '0.25rem',
                          background:
                            e.trade_env === 'REAL'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(56, 189, 248, 0.16)',
                          color: e.trade_env === 'REAL' ? '#fde68a' : '#7dd3fc',
                          fontFamily: 'monospace',
                        }}
                      >
                        {e.trade_env === 'REAL' ? '💵 REAL' : '🧪 SIMULATE'}
                      </span>
                    )}
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
                    {e.side === 'SELL' && e.realized_pnl != null && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '0.25rem',
                          background:
                            e.realized_pnl >= 0
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(244, 63, 94, 0.2)',
                          color: e.realized_pnl >= 0 ? '#34d399' : '#fb7185',
                          fontFamily: 'monospace',
                        }}
                      >
                        P&L: {e.realized_pnl >= 0 ? '+' : ''}${fmtPrice(e.realized_pnl)}
                      </span>
                    )}
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

      {/* ── Order Approval Confirmation Modal (Shows Exact Account & Bot Wallet) ── */}
      {confirmApproveModal && (() => {
        const { proposal: p, targetEnv, executeOnMoomoo } = confirmApproveModal
        const isReal = targetEnv === 'REAL'
        const isSell = p.side === 'SELL'
        const estTotal = Number((p.qty * p.current_price).toFixed(2))
        const resolvedAccId =
          modalWalletData?.moomoo?.trd_env === targetEnv && modalWalletData?.moomoo?.acc_id
            ? modalWalletData.moomoo.acc_id
            : isReal
              ? '283726806215160563'
              : '4930511'
        const availBotBal = modalWalletData?.budget?.available_bot_balance ?? walletData?.budget?.available_bot_balance ?? 0
        const afterBotBal = isSell ? availBotBal + estTotal : availBotBal - estTotal

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.82)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '1rem',
            }}
            onClick={() => setConfirmApproveModal(null)}
          >
            <div
              style={{
                background: '#0f172a',
                border: isReal ? '2px solid #f59e0b' : '2px solid #38bdf8',
                borderRadius: '1rem',
                padding: '1.25rem',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '0.7rem',
                  background: isReal
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.24), rgba(120, 53, 15, 0.35))'
                    : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(12, 74, 110, 0.35))',
                  border: isReal
                    ? '1px solid rgba(245, 158, 11, 0.6)'
                    : '1px solid rgba(56, 189, 248, 0.5)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      color: isReal ? '#fcd34d' : '#7dd3fc',
                    }}
                  >
                    {isReal
                      ? '💵 CONFIRM REAL ACCOUNT EXECUTION (LIVE MONEY)'
                      : '🧪 CONFIRM SIMULATE ACCOUNT EXECUTION (PAPER TRADING)'}
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', marginTop: '0.2rem' }}>
                    {isSell ? '💰 SELL (Take Profit)' : '🟢 BUY'} {fmtUnits(p.qty)} {p.symbol} @ {p.currency}{' '}
                    {fmtPrice(p.current_price)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmApproveModal(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Account Details Box */}
              <div
                style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '0.7rem',
                  padding: '0.85rem 0.95rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                }}
              >
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>
                  🎯 TARGET ACCOUNT &amp; WALLET DETAILS
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#94a3b8' }}>Execution Environment:</span>
                  <span
                    style={{
                      fontWeight: 900,
                      color: isReal ? '#fbbf24' : '#38bdf8',
                      fontFamily: 'monospace',
                    }}
                  >
                    {isReal ? '💵 Moomoo REAL (Live Brokerage)' : '🧪 Moomoo SIMULATE (Paper Trading)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#94a3b8' }}>Moomoo Account ID:</span>
                  <span style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
                    {executeOnMoomoo
                      ? `#${resolvedAccId} (${isReal ? 'FUTUSG Universal Margin' : 'Paper Margin Account'})`
                      : 'Bot Portfolio Ledger Only (Crypto)'}
                  </span>
                </div>

                {executeOnMoomoo && modalWalletData?.moomoo?.connected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                    <span style={{ color: '#94a3b8' }}>Moomoo Account Cash:</span>
                    <span style={{ fontWeight: 700, color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {modalWalletData.moomoo.currency} {fmtPrice(modalWalletData.moomoo.cash)}
                      {isReal && modalWalletData.moomoo.sg_cash != null && modalWalletData.moomoo.us_cash != null
                        ? ` (SG: SGD ${fmtPrice(modalWalletData.moomoo.sg_cash)} · US: USD ${fmtPrice(modalWalletData.moomoo.us_cash)})`
                        : ''}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px solid #1e293b',
                    paddingTop: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                  }}
                >
                  <span style={{ color: '#94a3b8' }}>
                    {isReal ? '💵 REAL Bot Wallet Available:' : '🧪 SIMULATE Bot Wallet Available:'}
                  </span>
                  <span style={{ fontWeight: 800, color: '#34d399', fontFamily: 'monospace' }}>
                    ${fmtPrice(availBotBal)} → Est. After:{' '}
                    <span style={{ color: afterBotBal >= 0 ? '#6ee7b7' : '#fb7185' }}>
                      ${fmtPrice(afterBotBal)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Order Breakdown Box */}
              <div
                style={{
                  background: '#090d16',
                  border: '1px solid #1e293b',
                  borderRadius: '0.7rem',
                  padding: '0.8rem 0.95rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  fontFamily: 'monospace',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>QUANTITY</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                    {fmtUnits(p.qty)} {p.symbol}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>EXECUTION PRICE</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                    {p.currency} {fmtPrice(p.current_price)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>
                    {isSell ? 'EST. PROCEEDS' : 'EST. TOTAL COST'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 900,
                      color: isReal ? '#fbbf24' : '#38bdf8',
                    }}
                  >
                    {p.currency} {fmtPrice(estTotal)}
                  </div>
                </div>
              </div>

              {p.trade_env !== targetEnv && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#bae6fd',
                  }}
                >
                  ℹ️ This proposal was originally staged for <strong>{p.trade_env}</strong>, and you are choosing to execute it in{' '}
                  <strong>{targetEnv}</strong> (Account #{resolvedAccId}).
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setConfirmApproveModal(null)}
                  style={{
                    padding: '0.52rem 0.95rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={approveProposalMutation.isPending}
                  onClick={() => {
                    setGuardrailError(null)
                    approveProposalMutation.mutate(
                      {
                        id: p.id,
                        payload: {
                          execute_on_moomoo: executeOnMoomoo,
                          trade_env: targetEnv,
                          execution_price: p.current_price,
                          qty: p.qty,
                        },
                      },
                      {
                        onSuccess: () => {
                          setConfirmApproveModal(null)
                        },
                        onError: (err: any) => {
                          setConfirmApproveModal(null)
                          setGuardrailError(
                            err?.response?.data?.error ||
                              err?.message ||
                              'Approval blocked by Bot Allocation Guardrail',
                          )
                        },
                      },
                    )
                  }}
                  style={{
                    padding: '0.52rem 1.05rem',
                    borderRadius: '0.5rem',
                    border: isReal ? '1px solid #fbbf24' : '1px solid #38bdf8',
                    background: isReal ? '#f59e0b' : '#0284c7',
                    color: isReal ? '#090d16' : '#f8fafc',
                    fontWeight: 900,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                  }}
                >
                  {approveProposalMutation.isPending
                    ? 'Executing…'
                    : isReal
                      ? `💵 Confirm REAL Order (Acc #${resolvedAccId})`
                      : `🧪 Confirm SIMULATE Order (Acc #${resolvedAccId})`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
