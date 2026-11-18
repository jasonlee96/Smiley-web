import { useMemo, useState } from 'react'
import { Calendar, DollarSign, Plus, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useAddWatchlist, useDividendCalendar } from '../../hooks/useTrading'

type TickerScope = 'ALL' | 'HELD' | 'SGX' | 'US'

function fmtCcy(val: number, ccy = 'USD'): string {
  const prefix = ccy === 'SGD' ? 'S$' : '$'
  return `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtCcyMap(map: Record<string, number>): string {
  const entries = Object.entries(map).filter(([, v]) => v > 0)
  if (entries.length === 0) return '$0.00'
  return entries.map(([ccy, val]) => fmtCcy(val, ccy)).join(' + ')
}

export default function DividendCalendarTab() {
  const [trdEnv, setTrdEnv] = useState<'ALL' | 'SIMULATE' | 'REAL'>('ALL')
  const [simInvest, setSimInvest] = useState<number>(1000)
  const [displayMode, setDisplayMode] = useState<'held' | 'sim'>('held')
  const [scope, setScope] = useState<TickerScope>('ALL')

  const divQ = useDividendCalendar(trdEnv, simInvest)
  const addWlMut = useAddWatchlist()

  const currentMonth = new Date().getUTCMonth() + 1

  const filteredTickers = useMemo(() => {
    const list = divQ.data?.tickers ?? []
    return list.filter((t) => {
      if (scope === 'HELD') return t.held_qty > 0
      if (scope === 'SGX') return t.symbol.endsWith('.SI')
      if (scope === 'US') return !t.symbol.endsWith('.SI')
      return true
    })
  }, [divQ.data?.tickers, scope])

  const filteredSymbolSet = useMemo(() => new Set(filteredTickers.map((t) => t.symbol)), [filteredTickers])

  const monthsView = useMemo(() => {
    const raw = divQ.data?.months ?? []
    return raw.map((m) => {
      const payouts = m.payouts.filter((p) => filteredSymbolSet.has(p.symbol))
      const heldTotal = payouts.reduce((s, p) => s + p.est_held_payout, 0)
      const simTotal = payouts.reduce((s, p) => s + p.est_sim_payout, 0)
      const heldByCcy: Record<string, number> = {}
      const simByCcy: Record<string, number> = {}
      for (const p of payouts) {
        if (p.est_held_payout > 0) {
          heldByCcy[p.currency] = Number(((heldByCcy[p.currency] || 0) + p.est_held_payout).toFixed(2))
        }
        simByCcy[p.currency] = Number(((simByCcy[p.currency] || 0) + p.est_sim_payout).toFixed(2))
      }
      return {
        ...m,
        payouts,
        heldTotal: Number(heldTotal.toFixed(2)),
        simTotal: Number(simTotal.toFixed(2)),
        heldByCcy,
        simByCcy,
      }
    })
  }, [divQ.data?.months, filteredSymbolSet])

  const chartData = useMemo(
    () =>
      monthsView.map((m) => ({
        month: m.label,
        value: displayMode === 'held' ? m.heldTotal : m.simTotal,
        isCurrent: m.month === currentMonth,
      })),
    [monthsView, displayMode, currentMonth],
  )

  const annualSummaryByCcy = useMemo(() => {
    const out: Record<string, number> = {}
    for (const t of filteredTickers) {
      const v = displayMode === 'held' ? t.est_annual_held : t.est_annual_sim
      if (v > 0) {
        out[t.currency] = Number(((out[t.currency] || 0) + v).toFixed(2))
      }
    }
    return out
  }, [filteredTickers, displayMode])

  const activeMonthsCount = useMemo(
    () =>
      monthsView.filter((m) => (displayMode === 'held' ? m.heldTotal > 0 : m.simTotal > 0)).length,
    [monthsView, displayMode],
  )

  if (divQ.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls & Mode Bar */}
      <GlassCard style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="var(--accent-green)" />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>
                12-Month Passive Income &amp; Dividend Supply Calendar
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Maps historical payout months &amp; trailing 12M DPS from Yahoo Finance to estimate monthly cashflow for held shares or simulated allocations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Held vs Sim toggle */}
            <div style={{ display: 'inline-flex', borderRadius: 7, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setDisplayMode('held')}
                style={{
                  padding: '6px 11px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: displayMode === 'held' ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-secondary)',
                  color: displayMode === 'held' ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              >
                My Held Shares
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('sim')}
                style={{
                  padding: '6px 11px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: displayMode === 'sim' ? 'rgba(6, 182, 212, 0.18)' : 'var(--bg-secondary)',
                  color: displayMode === 'sim' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}
              >
                Simulate / Ticker
              </button>
            </div>

            {displayMode === 'sim' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Alloc:</span>
                {[1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimInvest(amt)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontFamily: 'IBM Plex Mono',
                      cursor: 'pointer',
                      border: simInvest === amt ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
                      background: simInvest === amt ? 'rgba(6,182,212,0.14)' : 'var(--bg-secondary)',
                      color: simInvest === amt ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    }}
                  >
                    ${amt.toLocaleString()}
                  </button>
                ))}
              </div>
            )}

            {/* Env Filter */}
            <select
              value={trdEnv}
              onChange={(e) => setTrdEnv(e.target.value as 'ALL' | 'SIMULATE' | 'REAL')}
              style={{
                padding: '5px 9px',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'IBM Plex Mono',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <option value="ALL">Env: ALL</option>
              <option value="SIMULATE">Env: SIMULATE</option>
              <option value="REAL">Env: REAL</option>
            </select>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => divQ.refetch()}
              disabled={divQ.isFetching}
              style={{ padding: '5px 10px', fontSize: 11 }}
            >
              <RefreshCw size={12} className={divQ.isFetching ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Scope Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'ALL', label: 'All Dividend Payers' },
              { id: 'HELD', label: 'Held Only' },
              { id: 'SGX', label: 'SGX Income (.SI)' },
              { id: 'US', label: 'US Income' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: scope === s.id ? 700 : 500,
                cursor: 'pointer',
                border: scope === s.id ? '1px solid rgba(16,185,129,0.5)' : '1px solid var(--border)',
                background: scope === s.id ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: scope === s.id ? 'var(--accent-green)' : 'var(--text-muted)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <DollarSign size={13} color="var(--accent-green)" />
            <span>{displayMode === 'held' ? 'Est. Annual Held Income' : `Est. Annual ($${simInvest.toLocaleString()}/ticker)`}</span>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: 'var(--accent-green)', marginTop: 6 }}>
            {fmtCcyMap(annualSummaryByCcy)}
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <Calendar size={13} color="var(--accent-cyan)" />
            <span>Months With Supply</span>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginTop: 6 }}>
            {activeMonthsCount} / 12 months
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <TrendingUp size={13} color="var(--accent-amber)" />
            <span>Highest Trailing Yield</span>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: 'var(--accent-amber)', marginTop: 6 }}>
            {filteredTickers[0] ? `${filteredTickers[0].symbol} · ${filteredTickers[0].trailing_yield_pct.toFixed(2)}%` : '—'}
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
            <Sparkles size={13} color="var(--accent-cyan)" />
            <span>Tracked Dividend Payers</span>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', marginTop: 6 }}>
            {filteredTickers.length} tickers
          </div>
        </GlassCard>
      </div>

      {/* Monthly Cashflow Bar Chart */}
      <GlassCard style={{ padding: '16px 18px' }}>
        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          Estimated Monthly Dividend Supply ({displayMode === 'held' ? 'Held Positions' : `Simulated $${simInvest.toLocaleString()} per Ticker`})
        </p>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chartData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Est. Payout']}
            />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* 12-Month Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))', gap: 12 }}>
        {monthsView.map((m) => {
          const isCur = m.month === currentMonth
          const totalDisplay = displayMode === 'held' ? fmtCcyMap(m.heldByCcy) : fmtCcyMap(m.simByCcy)
          const hasPayouts = m.payouts.length > 0
          return (
            <GlassCard
              key={m.month}
              style={{
                padding: '13px 14px',
                border: isCur ? '1px solid rgba(6, 182, 212, 0.55)' : '1px solid var(--border)',
                background: isCur ? 'rgba(6, 182, 212, 0.04)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>{m.label}</span>
                  {isCur && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(6,182,212,0.18)',
                      color: 'var(--accent-cyan)',
                    }}>
                      CURRENT
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: 'IBM Plex Mono',
                  fontWeight: 700,
                  fontSize: 12,
                  color: (displayMode === 'held' ? m.heldTotal : m.simTotal) > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                }}>
                  {totalDisplay}
                </span>
              </div>

              {hasPayouts ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {m.payouts.map((p) => {
                    const estVal = displayMode === 'held' ? p.est_held_payout : p.est_sim_payout
                    return (
                      <div
                        key={p.symbol}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 6,
                          background: 'var(--bg-secondary)',
                          fontSize: 11,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <strong style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>{p.symbol}</strong>
                            <span style={{
                              fontSize: 9,
                              padding: '1px 4px',
                              borderRadius: 3,
                              background: 'rgba(148,163,184,0.15)',
                              color: 'var(--text-muted)',
                            }}>
                              {p.payout_frequency}
                            </span>
                            {p.held_qty > 0 && (
                              <span style={{
                                fontSize: 9,
                                padding: '1px 4px',
                                borderRadius: 3,
                                background: 'rgba(16,185,129,0.15)',
                                color: 'var(--accent-green)',
                              }}>
                                HELD
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                            DPS {fmtCcy(p.dps, p.currency)} · {p.trailing_yield_pct.toFixed(2)}% yld
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono', fontWeight: 700, color: estVal > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {estVal > 0 ? fmtCcy(estVal, p.currency) : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No scheduled payouts in {m.label}.</p>
              )}
            </GlassCard>
          )
        })}
      </div>

      {/* Dividend Payer Matrix */}
      <GlassCard style={{ padding: '16px 18px', overflowX: 'auto' }}>
        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Dividend Payers &amp; Supply Schedule</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left', fontSize: 11 }}>
              <th style={{ padding: '6px 8px' }}>Ticker</th>
              <th style={{ padding: '6px 8px' }}>Freq</th>
              <th style={{ padding: '6px 8px' }}>Yield</th>
              <th style={{ padding: '6px 8px' }}>12M DPS</th>
              <th style={{ padding: '6px 8px' }}>Held Qty</th>
              <th style={{ padding: '6px 8px' }}>Est. Annual ({displayMode === 'held' ? 'Held' : `$${simInvest}`})</th>
              <th style={{ padding: '6px 8px' }}>Watchlist</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickers.map((t) => (
              <tr key={t.symbol} style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                <td style={{ padding: '7px 8px', fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>
                  {t.symbol} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>· {t.name}</span>
                </td>
                <td style={{ padding: '7px 8px' }}>{t.payout_frequency}</td>
                <td style={{ padding: '7px 8px', fontFamily: 'IBM Plex Mono', color: 'var(--accent-green)' }}>
                  {t.trailing_yield_pct.toFixed(2)}%
                </td>
                <td style={{ padding: '7px 8px', fontFamily: 'IBM Plex Mono' }}>{fmtCcy(t.trailing_12m_dps, t.currency)}</td>
                <td style={{ padding: '7px 8px', fontFamily: 'IBM Plex Mono' }}>{t.held_qty > 0 ? t.held_qty : '—'}</td>
                <td style={{ padding: '7px 8px', fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>
                  {fmtCcy(displayMode === 'held' ? t.est_annual_held : t.est_annual_sim, t.currency)}
                </td>
                <td style={{ padding: '7px 8px' }}>
                  {t.in_watchlist ? (
                    <span style={{ fontSize: 10, color: 'var(--accent-green)' }}>In Watchlist</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={addWlMut.isPending}
                      onClick={() => addWlMut.mutate({ symbol: t.symbol, asset_type: t.asset_type, name: t.name })}
                      style={{ padding: '3px 8px', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={10} /> Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}
