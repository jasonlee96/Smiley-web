import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Layers, Activity, BarChart3 } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import type { TechnicalIndicators } from '../../types/trading'

interface Props {
  symbol: string
  currency: string
  timeframe: string
  indicators: TechnicalIndicators
}

function fmtPrice(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (v >= 1) return v.toFixed(2)
  if (v >= 0.01) return v.toFixed(4)
  return v.toFixed(6)
}

export default function TradingChartPanel({ symbol, currency, timeframe, indicators }: Props) {
  const [showEma21, setShowEma21] = useState(true)
  const [showSma50, setShowSma50] = useState(true)
  const [showBollinger, setShowBollinger] = useState(true)
  const [showLevels, setShowLevels] = useState(true)
  const [subChart, setSubChart] = useState<'rsi' | 'macd' | 'volume'>('rsi')
  const [barsCount, setBarsCount] = useState<45 | 90>(90)

  const data = useMemo(() => {
    const raw = indicators.chartSeries || []
    return raw.slice(-barsCount)
  }, [indicators.chartSeries, barsCount])

  const s1 = indicators.structure.supportLevels[0]
  const r1 = indicators.structure.resistanceLevels[0]

  const priceDomain = useMemo(() => {
    if (data.length === 0) return ['auto', 'auto'] as const
    const lows = data.map((d) =>
      showBollinger && d.bbLower != null ? Math.min(d.low, d.bbLower) : d.low,
    )
    const highs = data.map((d) =>
      showBollinger && d.bbUpper != null ? Math.max(d.high, d.bbUpper) : d.high,
    )
    let minVal = Math.min(...lows)
    let maxVal = Math.max(...highs)
    if (showLevels && s1) minVal = Math.min(minVal, s1)
    if (showLevels && r1) maxVal = Math.max(maxVal, r1)
    const pad = (maxVal - minVal) * 0.06 || minVal * 0.02
    return [Math.max(0, minVal - pad), maxVal + pad] as const
  }, [data, showBollinger, showLevels, s1, r1])

  const isUp = indicators.changePct >= 0
  const strokeMain = isUp ? '#10b981' : '#06b6d4'

  return (
    <GlassCard style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={15} color="var(--accent-cyan)" />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
            {symbol} · {timeframe.toUpperCase()} Price Structure & Overlays
          </span>
          <span style={{
            fontSize: 11,
            fontFamily: 'IBM Plex Mono, monospace',
            color: 'var(--text-muted)',
            padding: '2px 7px',
            borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
          }}>
            {data.length} bars
          </span>
        </div>

        {/* Overlay toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: 'EMA 21', active: showEma21, color: '#f59e0b', toggle: () => setShowEma21((v) => !v) },
            { label: 'SMA 50', active: showSma50, color: '#a855f7', toggle: () => setShowSma50((v) => !v) },
            { label: 'Bollinger (20,2)', active: showBollinger, color: '#38bdf8', toggle: () => setShowBollinger((v) => !v) },
            { label: 'S1 / R1 Pivots', active: showLevels, color: '#10b981', toggle: () => setShowLevels((v) => !v) },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.toggle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'IBM Plex Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: btn.active ? 'rgba(255,255,255,0.07)' : 'transparent',
                border: `1px solid ${btn.active ? btn.color : 'var(--border)'}`,
                color: btn.active ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: btn.active ? btn.color : 'var(--text-muted)',
              }} />
              {btn.label}
            </button>
          ))}

          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            overflow: 'hidden',
            marginLeft: 4,
          }}>
            {([45, 90] as const).map((cnt) => (
              <button
                key={cnt}
                onClick={() => setBarsCount(cnt)}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  fontFamily: 'IBM Plex Mono, monospace',
                  border: 'none',
                  cursor: 'pointer',
                  background: barsCount === cnt ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: barsCount === cnt ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}
              >
                {cnt}B
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Price Chart */}
      <div style={{ width: '100%', height: 290 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeMain} stopOpacity={0.22} />
                <stop offset="95%" stopColor={strokeMain} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={priceDomain as any}
              tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={false}
              width={68}
              tickFormatter={(val) => fmtPrice(Number(val))}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const pt = payload[0].payload
                const barChange = pt.open > 0 ? ((pt.close - pt.open) / pt.open) * 100 : 0
                return (
                  <div style={{
                    background: 'rgba(13, 17, 23, 0.96)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 11,
                    fontFamily: 'IBM Plex Mono, monospace',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
                    minWidth: 210,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                      <span>{pt.date}</span>
                      <span style={{ color: barChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {barChange >= 0 ? '+' : ''}{barChange.toFixed(2)}%
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Close: <strong style={{ color: 'var(--text-primary)' }}>{currency} {fmtPrice(pt.close)}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>Open: <strong style={{ color: 'var(--text-primary)' }}>{fmtPrice(pt.open)}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>High: <strong style={{ color: 'var(--accent-green)' }}>{fmtPrice(pt.high)}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>Low: <strong style={{ color: 'var(--accent-red)' }}>{fmtPrice(pt.low)}</strong></span>
                      {pt.ema21 != null && (
                        <span style={{ color: '#f59e0b' }}>EMA21: {fmtPrice(pt.ema21)}</span>
                      )}
                      {pt.sma50 != null && (
                        <span style={{ color: '#a855f7' }}>SMA50: {fmtPrice(pt.sma50)}</span>
                      )}
                      {pt.bbUpper != null && (
                        <span style={{ color: '#38bdf8' }}>BB Up: {fmtPrice(pt.bbUpper)}</span>
                      )}
                      {pt.bbLower != null && (
                        <span style={{ color: '#38bdf8' }}>BB Low: {fmtPrice(pt.bbLower)}</span>
                      )}
                    </div>
                  </div>
                )
              }}
            />

            {showLevels && r1 && (
              <ReferenceLine
                y={r1}
                stroke="rgba(239, 68, 68, 0.55)"
                strokeDasharray="4 4"
                label={{
                  value: `R1 ${fmtPrice(r1)}`,
                  position: 'insideTopRight',
                  fill: '#f87171',
                  fontSize: 10,
                }}
              />
            )}
            {showLevels && s1 && (
              <ReferenceLine
                y={s1}
                stroke="rgba(16, 185, 129, 0.55)"
                strokeDasharray="4 4"
                label={{
                  value: `S1 ${fmtPrice(s1)}`,
                  position: 'insideBottomRight',
                  fill: '#34d399',
                  fontSize: 10,
                }}
              />
            )}

            {showBollinger && (
              <>
                <Line
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="rgba(56, 189, 248, 0.45)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bbLower"
                  stroke="rgba(56, 189, 248, 0.45)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </>
            )}

            <Area
              type="monotone"
              dataKey="close"
              stroke={strokeMain}
              strokeWidth={2.2}
              fill="url(#priceFillGrad)"
              dot={false}
              isAnimationActive={false}
            />

            {showEma21 && (
              <Line
                type="monotone"
                dataKey="ema21"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {showSma50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sub-chart selector & oscillator pane */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'rsi' as const, label: `RSI (14) · ${indicators.rsi.value.toFixed(1)}`, icon: Activity },
              { id: 'macd' as const, label: `MACD (12,26,9) · ${indicators.macd.histogram >= 0 ? '+' : ''}${indicators.macd.histogram.toFixed(2)}`, icon: BarChart3 },
              { id: 'volume' as const, label: `Volume · ${indicators.volume.rvol.toFixed(2)}x RVOL`, icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubChart(tab.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'IBM Plex Mono, monospace',
                  cursor: 'pointer',
                  border: `1px solid ${subChart === tab.id ? 'var(--border-active)' : 'var(--border)'}`,
                  background: subChart === tab.id ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: subChart === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
            {subChart === 'rsi'
              ? 'Overbought > 70 · Oversold < 30'
              : subChart === 'macd'
                ? 'Cyan: MACD · Amber: Signal · Bars: Histogram'
                : '20-Period Relative Volume'}
          </span>
        </div>

        <div style={{ width: '100%', height: 125 }}>
          <ResponsiveContainer width="100%" height="100%">
            {subChart === 'rsi' ? (
              <ComposedChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" hide />
                <YAxis
                  domain={[0, 100]}
                  ticks={[30, 50, 70]}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                />
                <ReferenceLine y={70} stroke="rgba(239,68,68,0.45)" strokeDasharray="3 3" />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
                <ReferenceLine y={30} stroke="rgba(16,185,129,0.45)" strokeDasharray="3 3" />
                <Tooltip
                  formatter={(v: any) => [Number(v).toFixed(2), 'RSI (14)']}
                  labelStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                  contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#06b6d4"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            ) : subChart === 'macd' ? (
              <ComposedChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" hide />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                  tickFormatter={(v) => Number(v).toFixed(2)}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
                <Tooltip
                  formatter={(v: any, name: string) => [Number(v).toFixed(3), name]}
                  labelStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                  contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                />
                <Bar dataKey="macdHist" name="Histogram" isAnimationActive={false}>
                  {data.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={(entry.macdHist ?? 0) >= 0 ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.55)'}
                    />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="macd" name="MACD" stroke="#06b6d4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="macdSignal" name="Signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </ComposedChart>
            ) : (
              <ComposedChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" hide />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                  tickFormatter={(v) => {
                    const n = Number(v)
                    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
                    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
                    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
                    return String(Math.round(n))
                  }}
                />
                <Tooltip
                  formatter={(v: any) => [Number(v).toLocaleString(), 'Volume']}
                  labelStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                  contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                />
                <Bar dataKey="volume" isAnimationActive={false}>
                  {data.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.close >= entry.open ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </GlassCard>
  )
}
