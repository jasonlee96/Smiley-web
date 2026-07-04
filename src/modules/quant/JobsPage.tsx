import { RefreshCw, Play } from 'lucide-react'
import { useState } from 'react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useQuantJobs, useTriggerScheduler } from '../../hooks/useQuant'

const STATUS_COLORS: Record<string, string> = {
  success: 'var(--accent-green)',
  failed: 'var(--accent-red)',
  running: 'var(--accent-cyan)',
}

export default function QuantJobsPage() {
  const { data: jobs = [], isLoading, refetch, isFetching } = useQuantJobs()
  const trigger = useTriggerScheduler()
  const [market, setMarket] = useState<'US' | 'SGX'>('US')

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Quant Jobs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Scheduler run history</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['US', 'SGX'] as const).map(m => (
            <button key={m} className={market === m ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => setMarket(m)}>{m}</button>
          ))}
          <button className="btn-ghost"
            onClick={() => trigger.mutate(market)}
            disabled={trigger.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}>
            {trigger.isPending ? <Spinner size={12} /> : <Play size={12} />}
            Run Now
          </button>
          {isFetching && <Spinner size={14} />}
          <button className="btn-ghost" onClick={() => refetch()} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {trigger.data && (
        <GlassCard style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p style={{ fontSize: 12, color: 'var(--accent-green)' }}>Pipeline triggered for {trigger.data.market}. Check back in a few minutes.</p>
        </GlassCard>
      )}

      {isLoading ? <Spinner /> : jobs.length === 0 ? (
        <GlassCard style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          No job runs yet.
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Job', 'Started', 'Duration', 'Status', 'Error'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(j => {
                const dur = j.finished_at
                  ? ((new Date(j.finished_at).getTime() - new Date(j.started_at).getTime()) / 1000).toFixed(1) + 's'
                  : '—'
                return (
                  <tr key={j.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 13 }}>{j.job_name}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(j.started_at).toLocaleString()}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>{dur}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: STATUS_COLORS[j.status] ?? 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>{j.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--accent-red)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.error_message ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
