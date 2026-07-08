import { useState } from 'react'
import { useGmailDigest, useGmailAttention, useGmailStatus, useGmailRefresh, useGmailDisconnect } from '../../hooks/useGmail'
import { GMAIL_AUTH_URL, type GmailEmail, type AttentionEmail } from '../../api/gmail'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { RefreshCw, Mail, CheckCircle, XCircle, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const CATEGORY_CONFIG: Record<GmailEmail['category'], { label: string; color: string }> = {
  urgent:    { label: 'Urgent',    color: '#DC2626' },
  important: { label: 'Important', color: '#D97706' },
  routine:   { label: 'Routine',   color: '#6B7280' },
}

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</)
  return match ? match[1].trim() : from.replace(/<.*>/, '').trim() || from
}

function CategoryBadge({ category }: { category: GmailEmail['category'] }) {
  const cfg = CATEGORY_CONFIG[category]
  return (
    <span style={{
      fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700,
      color: cfg.color, background: `${cfg.color}1a`,
      border: `1px solid ${cfg.color}44`, borderRadius: 6,
      padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function EmailRow({ email }: { email: GmailEmail }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 3 }}>
          {senderName(email.from)}
        </span>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{email.subject}</p>
        {email.reason && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>{email.reason}</p>
        )}
      </div>
      <CategoryBadge category={email.category} />
    </div>
  )
}

const ATTN_COLOR: Record<AttentionEmail['category'], string> = { urgent: '#DC2626', important: '#D97706' }

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

function AttentionRow({ email }: { email: AttentionEmail }) {
  const color = ATTN_COLOR[email.category]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{senderName(email.from)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>{dayLabel(email.date)}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{email.subject}</p>
        {email.reason && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0', fontStyle: 'italic' }}>{email.reason}</p>
        )}
      </div>
      <span style={{
        fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700,
        color, background: `${color}1a`, border: `1px solid ${color}44`, borderRadius: 6,
        padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>
        {email.category}
      </span>
    </div>
  )
}

// Merged urgent + important across the last 7 days — one listing
function AttentionList({ items }: { items: AttentionEmail[] }) {
  if (items.length === 0) return null
  const urgentCount = items.filter(i => i.category === 'urgent').length
  return (
    <GlassCard style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Needs attention</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· last 7 days</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)' }}>
          {urgentCount > 0 ? `${urgentCount} urgent · ` : ''}{items.length} total
        </span>
      </div>
      <div>
        {items.map((e, i) => <AttentionRow key={e.id ?? `${e.date}-${i}`} email={e} />)}
      </div>
    </GlassCard>
  )
}

// Today's routine — collapsed by default (low-priority, same-day only)
function RoutineSection({ emails }: { emails: GmailEmail[] }) {
  const [open, setOpen] = useState(false)
  if (emails.length === 0) return null
  return (
    <GlassCard style={{ padding: '16px 18px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
      >
        {open ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: '#6B7280' }}>Routine · Today</span>
        <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: '#6B7280', background: '#6B72801a', borderRadius: 10, padding: '1px 8px' }}>{emails.length}</span>
      </button>
      {open && <div style={{ marginTop: 4 }}>{emails.map(e => <EmailRow key={e.index} email={e} />)}</div>}
    </GlassCard>
  )
}

export default function MailPage() {
  const digestQuery = useGmailDigest()
  const attentionQuery = useGmailAttention(7)
  const statusQuery = useGmailStatus()
  const refreshMutation = useGmailRefresh()
  const disconnectMutation = useGmailDisconnect()
  const [refreshing, setRefreshing] = useState(false)

  const digest = digestQuery.data
  const attention = attentionQuery.data ?? []
  const connected = statusQuery.data?.connected ?? false

  async function handleRefresh() {
    setRefreshing(true)
    try { await refreshMutation.mutateAsync() } finally { setRefreshing(false) }
  }

  function handleDisconnect() {
    if (!window.confirm('Disconnect Gmail? This removes the stored connection.')) return
    disconnectMutation.mutate()
  }

  const routine = digest?.emails.filter(e => e.category === 'routine') ?? []

  const loading = digestQuery.isLoading || statusQuery.isLoading
  const errored = digestQuery.isError || statusQuery.isError

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Mail</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {digest
              ? `${digest.email_count} emails · ${format(parseISO(digest.digest_date), 'MMM d, yyyy')}`
              : 'No digest yet'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {digestQuery.isFetching && <Spinner size={16} />}
          <button className="btn-ghost" onClick={() => digestQuery.refetch()} style={{ padding: '6px 10px' }} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button
            className="btn-primary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {refreshing ? <Spinner size={13} /> : <RefreshCw size={13} />}
            Fetch Now
          </button>
        </div>
      </div>

      {refreshMutation.isError && (
        <GlassCard style={{ padding: '10px 16px', color: 'var(--accent-red)', fontSize: 12 }}>
          Failed to refresh Gmail digest.
        </GlassCard>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, color: 'var(--text-muted)' }}>
          <Spinner /> Loading mail…
        </div>
      ) : errored ? (
        <GlassCard style={{ padding: '20px 22px', color: 'var(--accent-red)', fontSize: 13 }}>
          Failed to load Gmail data.
        </GlassCard>
      ) : (
        <>
          {/* Connection status card */}
          <GlassCard style={{
            padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
            borderLeft: `3px solid ${connected ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          }}>
            {connected
              ? <CheckCircle size={22} color="var(--accent-green)" style={{ flexShrink: 0, marginTop: 2 }} />
              : <XCircle size={22} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: 2 }} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {connected ? 'Gmail connected' : 'Gmail not connected'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                {connected ? 'Daily digest fetches your inbox at 9 AM MYT' : 'Connect to enable the AI email digest'}
              </p>
              {connected ? (
                <div style={{ marginTop: 10 }}>
                  <button className="btn-danger" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                    {disconnectMutation.isPending ? <Spinner size={13} /> : null}
                    Disconnect
                  </button>
                  {disconnectMutation.isError && (
                    <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 6 }}>Failed to disconnect. Try again.</p>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={GMAIL_AUTH_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ExternalLink size={13} />
                    Connect Google Account
                  </a>
                  <button className="btn-ghost" onClick={() => statusQuery.refetch()} style={{ padding: '7px 16px' }}>
                    Refresh status
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Approve access in the new tab, then click Refresh status.
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Digest body */}
          {!digest && attention.length === 0 ? (
            <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Mail size={48} color="var(--text-muted)" style={{ margin: '0 auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12 }}>
                No digest yet. Click "Fetch Now" to run the digest.
              </p>
            </GlassCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {digest?.summary && (
                <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    background: 'rgba(6,182,212,0.05)', borderLeft: '3px solid var(--accent-cyan)',
                    padding: '14px 18px',
                  }}>
                    <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      AI Summary · Today
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '6px 0 0' }}>{digest.summary}</p>
                  </div>
                </GlassCard>
              )}

              {/* Merged urgent + important across the last 7 days */}
              <AttentionList items={attention} />

              {/* Today's routine, collapsed */}
              <RoutineSection emails={routine} />

              {attention.length === 0 && routine.length === 0 && (
                <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <CheckCircle size={48} color="var(--accent-green)" style={{ margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12 }}>
                    Nothing needs attention — no urgent or important mail in the last 7 days.
                  </p>
                </GlassCard>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
