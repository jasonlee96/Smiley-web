import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useAssetsSummary, useNetworthHistory } from '../../../hooks/useNetworth'

const PERIODS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
]

const ASSET_TYPE_LABELS: Record<string, string> = {
  property: 'Property',
  vehicle: 'Vehicle',
  cash: 'Cash',
  investment: 'Investment',
  epf: 'EPF / KWSP',
  fd: 'Fixed Deposit',
  crypto: 'Crypto',
  other: 'Other',
}

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function DashboardTab() {
  const [periodIdx, setPeriodIdx] = useState(1)
  const { days } = PERIODS[periodIdx]
  const summaryQuery = useAssetsSummary()
  const historyQuery = useNetworthHistory(days)

  const summary = summaryQuery.data
  const history = historyQuery.data ?? []

  const chartData = history.map(h => ({
    date: format(parseISO(h.snapshot_date), 'MMM d'),
    value: h.net_worth_myr,
  }))

  const deltaAbs = chartData.length >= 2 ? chartData[chartData.length - 1].value - chartData[0].value : null
  const deltaColor = deltaAbs == null ? 'var(--text-muted)' : deltaAbs >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'

  const breakdownEntries = Object.entries(summary?.assets_by_type ?? {}).sort(([, a], [, b]) => b - a)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Net Worth</p>
          {summaryQuery.isLoading ? <Spinner /> : (
            <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 28, color: 'var(--accent-green)' }}>
              RM {fmt(summary?.net_worth_myr ?? 0)}
            </p>
          )}
        </GlassCard>
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Total Assets</p>
          {summaryQuery.isLoading ? <Spinner /> : (
            <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 22, color: 'var(--text-primary)' }}>
              RM {fmt(summary?.total_assets_myr ?? 0)}
            </p>
          )}
        </GlassCard>
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Total Liabilities</p>
          {summaryQuery.isLoading ? <Spinner /> : (
            <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 22, color: 'var(--text-primary)' }}>
              RM {fmt(summary?.total_liabilities_myr ?? 0)}
            </p>
          )}
        </GlassCard>
      </div>

      <GlassCard style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Timeline</p>
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIODS.map((p, i) => (
              <button key={p.label} onClick={() => setPeriodIdx(i)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12,
                border: `1px solid ${periodIdx === i ? 'var(--border-active)' : 'var(--border)'}`,
                background: periodIdx === i ? 'var(--accent-cyan-dim)' : 'transparent',
                color: periodIdx === i ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {deltaAbs !== null && (
          <p style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', color: deltaColor, marginBottom: 10 }}>
            {deltaAbs >= 0 ? '+' : ''}RM {fmt(Math.abs(deltaAbs))} vs {PERIODS[periodIdx].label} ago
          </p>
        )}
        {historyQuery.isLoading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94a3b8' }} formatter={(v: number) => [`RM ${fmt(v)}`, 'Net Worth']} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#netWorthGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No history yet</span>
          </div>
        )}
      </GlassCard>

      {breakdownEntries.length > 0 && (
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Assets by Type</p>
          {breakdownEntries.map(([type, val]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ASSET_TYPE_LABELS[type] ?? type}</span>
              <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--text-primary)' }}>RM {fmt(val)}</span>
            </div>
          ))}
        </GlassCard>
      )}

      {summary?.insight && (
        <GlassCard style={{ padding: '16px 20px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>{summary.insight}</p>
        </GlassCard>
      )}
    </div>
  )
}
