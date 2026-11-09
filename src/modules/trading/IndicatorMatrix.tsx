import { Gauge, TrendingUp, ShieldAlert, Zap } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import type { TechnicalIndicators } from '../../types/trading'

interface Props {
  currency: string
  indicators: TechnicalIndicators
}

function fmtPrice(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (v >= 1) return v.toFixed(2)
  if (v >= 0.01) return v.toFixed(4)
  return v.toFixed(6)
}

export default function IndicatorMatrix({ currency, indicators }: Props) {
  const { movingAverages, rsi, macd, stochastic, bollinger, atr, volume, structure } = indicators
  const price = indicators.price

  const rsiColor =
    rsi.value >= 70
      ? 'var(--accent-amber)'
      : rsi.value <= 30
        ? 'var(--accent-cyan)'
        : rsi.value >= 52
          ? 'var(--accent-green)'
          : 'var(--accent-red)'

  const macdBull = macd.histogram >= 0
  const stackBadge =
    movingAverages.alignment === 'bullish_stack'
      ? { label: 'BULLISH EMA STACK', color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.12)' }
      : movingAverages.alignment === 'bearish_stack'
        ? { label: 'BEARISH EMA STACK', color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.12)' }
        : { label: 'MIXED ALIGNMENT', color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.12)' }

  const rLevels = [...structure.resistanceLevels].slice(0, 3).sort((a, b) => b - a) // R3, R2, R1
  const sLevels = [...structure.supportLevels].slice(0, 3).sort((a, b) => b - a)    // S1, S2, S3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 6-Card Oscillator & Volatility Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {/* RSI Card */}
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              RSI (14) Momentum
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              color: rsiColor,
              textTransform: 'uppercase',
            }}>
              {rsi.state}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600, color: rsiColor }}>
              {rsi.value.toFixed(1)}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
              5B Δ: {rsi.slope5 >= 0 ? '+' : ''}{rsi.slope5.toFixed(1)}
            </span>
          </div>
          {/* RSI visual bar */}
          <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute',
              left: '30%',
              width: '40%',
              top: 0,
              bottom: 0,
              borderLeft: '1px dashed rgba(16,185,129,0.4)',
              borderRight: '1px dashed rgba(239,68,68,0.4)',
            }} />
            <div style={{
              width: `${Math.min(100, Math.max(0, rsi.value))}%`,
              height: '100%',
              background: rsiColor,
              borderRadius: 4,
            }} />
          </div>
        </GlassCard>

        {/* MACD Card */}
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              MACD (12, 26, 9)
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              background: macdBull ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: macdBull ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {macd.state.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 22,
              fontWeight: 600,
              color: macdBull ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {macd.histogram >= 0 ? '+' : ''}{macd.histogram.toFixed(3)}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
              Hist
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
            <span>MACD: {macd.macd.toFixed(2)}</span>
            <span>Sig: {macd.signal.toFixed(2)}</span>
          </div>
        </GlassCard>

        {/* Bollinger Bands Card */}
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Bollinger (20, 2)
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              background: bollinger.squeeze ? 'rgba(245,158,11,0.16)' : 'rgba(6,182,212,0.12)',
              color: bollinger.squeeze ? 'var(--accent-amber)' : 'var(--accent-cyan)',
            }}>
              {bollinger.squeeze ? '⚡ SQUEEZE ACTIVE' : `BW ${bollinger.bandwidthPct.toFixed(1)}%`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
              {(bollinger.percentB * 100).toFixed(0)}%
            </span>
            <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
              %B Position
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
            <span>L: {fmtPrice(bollinger.lower)}</span>
            <span>U: {fmtPrice(bollinger.upper)}</span>
          </div>
        </GlassCard>

        {/* ATR Volatility Card */}
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ATR (14) Volatility
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)',
            }}>
              {atr.pct.toFixed(2)}% / BAR
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600, color: 'var(--accent-cyan)' }}>
              {currency} {fmtPrice(atr.value)}
            </span>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
            1.5×ATR Stop Buffer: ±{currency} {fmtPrice(atr.value * 1.5)}
          </div>
        </GlassCard>

        {/* Stochastic Card */}
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Stochastic (14, 3)
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              color: stochastic.k >= stochastic.d ? 'var(--accent-green)' : 'var(--accent-red)',
              textTransform: 'uppercase',
            }}>
              {stochastic.state}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>
              {stochastic.k.toFixed(1)}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
              %D: {stochastic.d.toFixed(1)}
            </span>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
            {stochastic.k >= stochastic.d ? '%K above %D (Bullish cross)' : '%K below %D (Bearish cross)'}
          </div>
        </GlassCard>

        {/* Relative Volume & Range Position Card */}
        <GlassCard style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Relative Volume (20B)
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              padding: '2px 6px',
              borderRadius: 4,
              background: volume.rvol >= 1.2 ? 'rgba(6,182,212,0.14)' : 'rgba(255,255,255,0.05)',
              color: volume.rvol >= 1.2 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            }}>
              {volume.rvol >= 1.5 ? 'HIGH PARTICIPATION' : volume.rvol >= 0.8 ? 'NORMAL VOL' : 'LOW VOL'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>
              {volume.rvol.toFixed(2)}×
            </span>
            <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-secondary)' }}>
              Range: {structure.rangePositionPct.toFixed(0)}%
            </span>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
            L: {fmtPrice(structure.periodLow)} · H: {fmtPrice(structure.periodHigh)}
          </div>
        </GlassCard>
      </div>

      {/* Two-Column Matrix: Moving Averages + Support/Resistance Price Ladder */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* Moving Average Alignment Matrix */}
        <GlassCard style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={15} color="var(--accent-cyan)" />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
                Moving Average Alignment
              </span>
            </div>
            <span style={{
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 6,
              background: stackBadge.bg,
              color: stackBadge.color,
            }}>
              {stackBadge.label}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {movingAverages.rows.map((row) => {
              const isBull = row.signal === 'bullish'
              const isBear = row.signal === 'bearish'
              const color = isBull ? 'var(--accent-green)' : isBear ? 'var(--accent-red)' : 'var(--text-muted)'
              return (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '76px 1fr 90px 76px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 10px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    fontSize: 12,
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {row.value != null ? `${currency} ${fmtPrice(row.value)}` : '—'}
                  </span>
                  <span style={{ textAlign: 'right', color }}>
                    {row.distancePct != null
                      ? `${row.distancePct >= 0 ? '+' : ''}${row.distancePct.toFixed(2)}%`
                      : '—'}
                  </span>
                  <span style={{
                    textAlign: 'center',
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isBull
                      ? 'rgba(16,185,129,0.12)'
                      : isBear
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(255,255,255,0.04)',
                    color,
                    textTransform: 'uppercase',
                  }}>
                    {row.value != null ? (isBull ? 'ABOVE' : isBear ? 'BELOW' : 'FLAT') : 'N/A'}
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Support & Resistance Structural Price Ladder */}
        <GlassCard style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gauge size={15} color="var(--accent-cyan)" />
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
                  Support & Resistance Price Ladder
                </span>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)' }}>
                Pivot Clusters (1×ATR)
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {/* Resistance R3 -> R1 */}
              {rLevels.map((lvl, idx) => {
                const rNum = rLevels.length - idx
                const pct = price > 0 ? ((lvl - price) / price) * 100 : 0
                return (
                  <div
                    key={`R${rNum}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.18)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldAlert size={13} color="var(--accent-red)" />
                      <span style={{ color: '#f87171', fontWeight: 600 }}>R{rNum} Resistance</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {currency} {fmtPrice(lvl)}
                    </span>
                    <span style={{ color: '#f87171', fontSize: 11 }}>
                      +{pct.toFixed(2)}%
                    </span>
                  </div>
                )
              })}

              {/* Current Spot Price Spotlight */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'var(--accent-cyan-dim)',
                  border: '1px solid var(--border-active)',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 13,
                  fontWeight: 600,
                  margin: '2px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={14} color="var(--accent-cyan)" />
                  <span style={{ color: 'var(--accent-cyan)' }}>SPOT MARKET PRICE</span>
                </div>
                <span style={{ color: 'var(--text-primary)' }}>
                  {currency} {fmtPrice(price)}
                </span>
                <span style={{
                  fontSize: 11,
                  color: indicators.changePct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {indicators.changePct >= 0 ? '+' : ''}{indicators.changePct.toFixed(2)}%
                </span>
              </div>

              {/* Support S1 -> S3 */}
              {sLevels.map((lvl, idx) => {
                const sNum = idx + 1
                const pct = price > 0 ? ((lvl - price) / price) * 100 : 0
                return (
                  <div
                    key={`S${sNum}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(16, 185, 129, 0.06)',
                      border: '1px solid rgba(16, 185, 129, 0.18)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={13} color="var(--accent-green)" />
                      <span style={{ color: '#34d399', fontWeight: 600 }}>S{sNum} Support</span>
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {currency} {fmtPrice(lvl)}
                    </span>
                    <span style={{ color: '#34d399', fontSize: 11 }}>
                      {pct.toFixed(2)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
