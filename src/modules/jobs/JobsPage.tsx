import { useState } from 'react'
import { useJobs } from '../../hooks/useJobs'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { RefreshCw, Play, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import type { Job } from '../../api/jobs'

function StatusBadge({ status }: { status: Job['status'] }) {
  const map = {
    ok:      { color: 'var(--accent-green)',  bg: 'rgba(34,197,94,0.12)',  icon: CheckCircle,   label: 'OK' },
    stale:   { color: 'var(--accent-amber)',  bg: 'rgba(245,158,11,0.12)', icon: AlertCircle,   label: 'Stale' },
    unknown: { color: 'var(--text-muted)',    bg: 'rgba(100,116,139,0.12)',icon: HelpCircle,    label: 'Unknown' },
  }
  const { color, bg, icon: Icon, label } = map[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: bg, color, fontSize: 11, fontWeight: 600,
      fontFamily: 'IBM Plex Mono', letterSpacing: '0.05em',
    }}>
      <Icon size={11} />
      {label}
    </span>
  )
}

function RelativeTime({ iso }: { iso: string | null }) {
  if (!iso) return <span style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>Never</span>
  const date = parseISO(iso)
  return (
    <span title={format(date, 'MMM d, HH:mm:ss')} style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-secondary)', cursor: 'default' }}>
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  )
}

export default function JobsPage() {
  const { statusQuery, triggerMutation } = useJobs()
  const [triggering, setTriggering] = useState<string | null>(null)

  const jobs = statusQuery.data ?? []
  const okCount = jobs.filter(j => j.status === 'ok').length
  const staleCount = jobs.filter(j => j.status === 'stale').length
  const unknownCount = jobs.filter(j => j.status === 'unknown').length

  const handleTrigger = async (id: string) => {
    setTriggering(id)
    try {
      await triggerMutation.mutateAsync(id)
    } finally {
      setTriggering(null)
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Scheduled Jobs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Background tasks & cron status</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {statusQuery.isFetching && <Spinner size={16} />}
          <button className="btn-ghost" onClick={() => statusQuery.refetch()} style={{ padding: '6px 10px' }} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total',   value: jobs.length,  color: 'var(--text-secondary)' },
          { label: 'Healthy', value: okCount,       color: 'var(--accent-green)' },
          { label: 'Stale',   value: staleCount,    color: 'var(--accent-amber)' },
          { label: 'Unknown', value: unknownCount,  color: 'var(--text-muted)' },
        ].map(s => (
          <GlassCard key={s.label} style={{ padding: '12px 18px', flex: 1 }}>
            <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono', fontWeight: 500, color: s.color }}>
              {statusQuery.isLoading ? '—' : s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {s.label}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Jobs table */}
      <GlassCard style={{ padding: '20px 22px' }}>
        {statusQuery.isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            <Spinner size={14} /> Loading jobs...
          </div>
        ) : statusQuery.isError ? (
          <div style={{ color: 'var(--accent-red)', fontSize: 13 }}>Failed to load jobs.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Job', 'Schedule', 'Last Run', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px',
                      textAlign: h === '' ? 'center' : 'left',
                      fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr
                    key={job.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{job.name}</div>
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{job.id}</div>
                    </td>
                    <td style={{ padding: '12px 12px', fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {job.schedule}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <RelativeTime iso={job.lastRun} />
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <StatusBadge status={job.status} />
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClick={() => handleTrigger(job.id)}
                        disabled={triggering === job.id}
                        title="Run now"
                      >
                        {triggering === job.id ? <Spinner size={12} /> : <Play size={12} />}
                        Run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
