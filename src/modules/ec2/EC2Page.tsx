import { useEC2 } from '../../hooks/useEC2'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import StatusBadge from '../../components/StatusBadge'
import { Play, Square, RefreshCw, Clock, Cpu, HardDrive, MemoryStick } from 'lucide-react'
import { format, parseISO } from 'date-fns'

function GaugeBar({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.min(100, Math.max(0, value))
  const barColor = pct > 85 ? 'var(--accent-red)' : pct > 65 ? 'var(--accent-amber)' : color
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 16, fontWeight: 500, color: barColor }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: barColor,
          boxShadow: `0 0 8px ${barColor}`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

export default function EC2Page() {
  const { instanceQuery, utilizationQuery, schedulesQuery, startMutation, stopMutation, toggleScheduleMutation } = useEC2()

  const instance = instanceQuery.data
  const util = utilizationQuery.data
  const schedules = schedulesQuery.data ?? []

  const isTransitioning = instance?.state === 'pending' || instance?.state === 'stopping'
  const isRunning = instance?.state === 'running'
  const isStopped = instance?.state === 'stopped'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>EC2 Instance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>AWS Infrastructure Control</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {instanceQuery.isFetching && <Spinner size={16} />}
          <button className="btn-ghost" onClick={() => instanceQuery.refetch()} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Instance card */}
      <GlassCard style={{ padding: '24px 26px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -40, left: -40, width: 160, height: 160,
          background: `radial-gradient(circle, ${isRunning ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)'}, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        {instanceQuery.isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            <Spinner /> Fetching instance status...
          </div>
        ) : instance ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <StatusBadge status={instance.state} />
                {isTransitioning && <Spinner size={14} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 32px' }}>
                {[
                  { label: 'Instance ID', value: instance.instanceId },
                  { label: 'Type', value: instance.instanceType },
                  { label: 'Public IP', value: instance.publicIp ?? '—' },
                  { label: 'Private IP', value: instance.privateIp ?? '—' },
                  { label: 'Zone', value: instance.availabilityZone ?? '—' },
                ].map(row => (
                  <><span key={row.label + '-l'} style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label}</span>
                  <span key={row.label + '-v'} style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--text-secondary)' }}>{row.value}</span></>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                disabled={!isStopped || startMutation.isPending || isTransitioning}
                onClick={() => startMutation.mutate()}
                style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#10b981', padding: '10px 20px', fontSize: 14 }}
              >
                {startMutation.isPending ? <Spinner size={14} /> : <Play size={14} fill="currentColor" />}
                Start
              </button>
              <button
                className="btn-danger"
                disabled={!isRunning || stopMutation.isPending || isTransitioning}
                onClick={() => stopMutation.mutate()}
                style={{ padding: '10px 20px', fontSize: 14 }}
              >
                {stopMutation.isPending ? <Spinner size={14} /> : <Square size={14} fill="currentColor" />}
                Stop
              </button>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No instance data.</p>
        )}
      </GlassCard>

      {/* Utilization */}
      <GlassCard style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Live Utilization</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {utilizationQuery.isFetching && <Spinner size={12} />}
            {util?.reported_at && (
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                {format(parseISO(util.reported_at), 'HH:mm:ss')}
              </span>
            )}
            <button className="btn-ghost" onClick={() => utilizationQuery.refetch()} style={{ padding: '4px 8px' }}>
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
        {utilizationQuery.isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}><Spinner size={14} /> Loading metrics...</div>
        ) : util ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <GaugeBar value={parseFloat(util.cpu_percent)} color="var(--accent-cyan)" label="CPU" />
            <GaugeBar value={parseFloat(util.mem_percent)} color="#a78bfa" label="Memory" />
            <GaugeBar value={parseFloat(util.disk_percent)} color="var(--accent-amber)" label="Disk" />
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No metrics reported yet.</p>
        )}
      </GlassCard>

      {/* Schedules */}
      <GlassCard style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Schedules</p>
        </div>
        {schedulesQuery.isLoading ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}><Spinner size={14} /> Loading...</div>
        ) : schedules.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No schedules configured.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {schedules.map((s, i) => {
              const isEnabled = s.state === 'ENABLED'
              const isStart = s.name.toLowerCase().includes('on') || s.target.includes('start')
              return (
                <div key={s.name} style={{
                  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0',
                  borderBottom: i < schedules.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <button
                    onClick={() => toggleScheduleMutation.mutate({ group: s.groupName, name: s.name, state: isEnabled ? 'DISABLED' : 'ENABLED' })}
                    disabled={toggleScheduleMutation.isPending}
                    style={{
                      width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                      background: isEnabled ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${isEnabled ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      cursor: 'pointer', position: 'relative', transition: 'all 0.2s', padding: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: isEnabled ? 18 : 2,
                      width: 14, height: 14, borderRadius: '50%',
                      background: isEnabled ? '#10b981' : '#475569',
                      transition: 'left 0.2s, background 0.2s',
                      boxShadow: isEnabled ? '0 0 6px #10b981' : 'none',
                    }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: isEnabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', marginTop: 2 }}>{s.scheduleExpression}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontFamily: 'IBM Plex Mono', padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
                    background: isStart ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: isStart ? '#10b981' : '#ef4444',
                    border: `1px solid ${isStart ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {isStart ? 'start' : 'stop'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', whiteSpace: 'nowrap' }}>
                    {format(parseISO(s.lastModified), 'MMM d')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
