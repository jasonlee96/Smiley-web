import clsx from 'clsx'

type Status = 'not_started' | 'pending' | 'in_progress' | 'done' | 'running' | 'stopped' | 'stopping' | 'starting'

const CONFIG: Record<Status, { label: string; color: string; dot: string }> = {
  not_started:{ label: 'Pending',     color: 'rgba(148,163,184,0.15)', dot: '#94a3b8' },
  pending:    { label: 'Pending',     color: 'rgba(148,163,184,0.15)', dot: '#94a3b8' },
  in_progress:{ label: 'In Progress', color: 'rgba(6,182,212,0.15)',   dot: '#06b6d4' },
  done:       { label: 'Done',        color: 'rgba(16,185,129,0.15)',   dot: '#10b981' },
  running:    { label: 'Running',     color: 'rgba(16,185,129,0.15)',   dot: '#10b981' },
  stopped:    { label: 'Stopped',     color: 'rgba(239,68,68,0.15)',    dot: '#ef4444' },
  stopping:   { label: 'Stopping',    color: 'rgba(245,158,11,0.15)',   dot: '#f59e0b' },
  starting:   { label: 'Starting',    color: 'rgba(6,182,212,0.15)',    dot: '#06b6d4' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = CONFIG[status] ?? CONFIG.not_started
  return (
    <span style={{
      background: cfg.color,
      border: `1px solid ${cfg.dot}44`,
      color: cfg.dot,
      fontSize: 11,
      fontWeight: 500,
      fontFamily: 'IBM Plex Mono, monospace',
      padding: '3px 8px',
      borderRadius: 6,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: cfg.dot,
        boxShadow: `0 0 6px ${cfg.dot}`,
        animation: (status === 'in_progress' || status === 'running' || status === 'stopping') ? 'pulse 2s infinite' : undefined,
      }} />
      {cfg.label}
    </span>
  )
}
