import { useState } from 'react'
import {
  Sparkles,
  Target,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Cpu,
  Compass,
  Scale,
} from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import type { TradingAiAnalysis } from '../../types/trading'

interface Props {
  symbol: string
  analysis: TradingAiAnalysis
  onRunClaudeCli: () => void
  isRunningClaude: boolean
}

export default function AiThesisCard({ symbol, analysis, onRunClaudeCli, isRunningClaude }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(analysis.prompt_for_chat)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const isBull = analysis.bias === 'bullish'
  const isBear = analysis.bias === 'bearish'
  const biasColor = isBull
    ? 'var(--accent-green)'
    : isBear
      ? 'var(--accent-red)'
      : 'var(--accent-amber)'
  const biasBg = isBull
    ? 'rgba(16, 185, 129, 0.14)'
    : isBear
      ? 'rgba(239, 68, 68, 0.14)'
      : 'rgba(245, 158, 11, 0.14)'

  const dirColor =
    analysis.trade_setup.direction === 'long'
      ? 'var(--accent-green)'
      : analysis.trade_setup.direction === 'short'
        ? 'var(--accent-red)'
        : 'var(--accent-amber)'

  return (
    <GlassCard
      style={{
        padding: '20px 22px',
        border: `1px solid ${isBull ? 'rgba(16,185,129,0.28)' : isBear ? 'rgba(239,68,68,0.28)' : 'rgba(6,182,212,0.28)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--accent-cyan-dim)',
            border: '1px solid var(--border-active)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={16} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16 }}>
                {symbol} Trade Thesis & Execution Blueprint
              </span>
              <span style={{
                fontSize: 10,
                fontFamily: 'IBM Plex Mono, monospace',
                padding: '2px 8px',
                borderRadius: 5,
                background: analysis.engine === 'claude-cli' ? 'rgba(168,85,247,0.16)' : 'rgba(6,182,212,0.14)',
                color: analysis.engine === 'claude-cli' ? '#c084fc' : 'var(--accent-cyan)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {analysis.engine === 'claude-cli' ? 'CLAUDE AI SYNTHESIS' : 'QUANT STRATEGY ENGINE (NO API KEY)'}
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Regime: <strong style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>{analysis.regime.replace('_', ' ').toUpperCase()}</strong>
              {' · '}Confidence: <strong style={{ color: biasColor, fontFamily: 'IBM Plex Mono, monospace' }}>{analysis.confidence}%</strong>
            </p>
          </div>
        </div>

        {/* Action buttons: Copy Chat Prompt + Optional Claude CLI Deep Dive */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontWeight: 700,
            fontSize: 12,
            padding: '6px 12px',
            borderRadius: 8,
            background: biasBg,
            color: biasColor,
            border: `1px solid ${biasColor}`,
            letterSpacing: '0.04em',
          }}>
            BIAS: {analysis.bias.toUpperCase()} ({analysis.confidence}%)
          </span>

          <button
            className="btn-ghost"
            onClick={handleCopyPrompt}
            title="Copy full OHLCV + Technical Indicator prompt to paste into any AI chat"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            {copied ? <Check size={13} color="var(--accent-green)" /> : <Copy size={13} />}
            {copied ? 'Prompt Copied!' : 'Copy Chat Prompt'}
          </button>

          <button
            className="btn-primary"
            onClick={onRunClaudeCli}
            disabled={isRunningClaude}
            title="Run deep narrative synthesis using local Claude CLI session"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            {isRunningClaude ? <Spinner size={13} /> : <Cpu size={13} />}
            {isRunningClaude ? 'Running Claude CLI...' : 'Deep AI Synthesis'}
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        borderLeft: `3px solid ${biasColor}`,
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--text-primary)',
      }}>
        {analysis.summary}
      </div>

      {/* Actionable Trade Setup Ticket */}
      <div style={{
        padding: '16px 18px',
        borderRadius: 10,
        background: 'rgba(13, 17, 23, 0.72)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Compass size={15} color="var(--accent-cyan)" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
              Actionable Trade Setup
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              color: dirColor,
              border: `1px solid ${dirColor}`,
            }}>
              DIRECTION: {analysis.trade_setup.direction.toUpperCase()}
            </span>
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 11,
              padding: '3px 10px',
              borderRadius: 6,
              background: 'var(--accent-cyan-dim)',
              color: 'var(--accent-cyan)',
              border: '1px solid var(--border-active)',
            }}>
              R:R {analysis.trade_setup.risk_reward}
            </span>
          </div>
        </div>

        {/* Entry / Stop / Targets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
          }}>
            <div style={{ fontSize: 10, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Optimal Entry Zone
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {analysis.trade_setup.entry_zone}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}>
            <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              ATR Stop-Loss Level
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {analysis.trade_setup.stop_loss}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}>
            <div style={{ fontSize: 10, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Take-Profit Targets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {analysis.trade_setup.targets.map((t, i) => (
                <div key={i} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: 'var(--text-primary)' }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invalidation & Sizing Footer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11,
          color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <ShieldAlert size={13} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span><strong>Invalidation:</strong> {analysis.trade_setup.invalidation}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <Scale size={13} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
            <span><strong>Position Sizing:</strong> {analysis.trade_setup.position_sizing_note}</span>
          </div>
        </div>
      </div>

      {/* Bull Case vs Bear Case */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {/* Bull Thesis */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 10,
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <TrendingUp size={15} color="var(--accent-green)" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#34d399' }}>
              Bullish Confluence & Catalysts
            </span>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {analysis.bull_thesis.map((pt, i) => (
              <li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-primary)', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>▸</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bear Thesis */}
        <div style={{
          padding: '14px 16px',
          borderRadius: 10,
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <TrendingDown size={15} color="var(--accent-red)" />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#f87171' }}>
              Bearish Risks & Headwinds
            </span>
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {analysis.bear_thesis.map((pt, i) => (
              <li key={i} style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-primary)', display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>▸</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key Observations */}
      {analysis.key_observations && analysis.key_observations.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Target size={12} color="var(--accent-cyan)" />
            <span>Market Structure & Volatility Telemetry</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {analysis.key_observations.map((obs, idx) => (
              <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                • {obs}
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  )
}
