import { useNavigate } from 'react-router-dom'
import { FileText, Upload, Download, X } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { usePendingStatements, useUpdatePendingStatement } from '../../hooks/useExpenses'
import type { PendingStatement } from '../../types/expenses'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function monthLabel(ym: string | null): string | null {
  if (!ym) return null
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return ym
  return `${MONTH_NAMES[m - 1]} ${y}`
}

function title(s: PendingStatement): string {
  const parts = [s.bank, monthLabel(s.statement_month)].filter(Boolean)
  return parts.length ? parts.join(' · ') : s.email_subject
}

export default function PendingStatementsCard() {
  const navigate = useNavigate()
  const { data: pending = [], isLoading } = usePendingStatements()
  const updateStatement = useUpdatePendingStatement()

  // Only surface actionable rows; hide entirely when there are none.
  if (isLoading || pending.length === 0) return null

  return (
    <GlassCard style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <FileText size={15} color="var(--accent-cyan)" />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Statements to import
        </p>
        <span style={{
          fontSize: 11, padding: '1px 8px', borderRadius: 999,
          background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)',
        }}>
          {pending.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map((s, i) => {
          const dismissing = updateStatement.isPending && updateStatement.variables?.id === s.id
          const ready = s.state === 'ready'
          return (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '10px 4px',
                borderBottom: i < pending.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                opacity: dismissing ? 0.4 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{title(s)}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {ready
                    ? `PDF attached${s.attachment_filename ? ` · ${s.attachment_filename}` : ''}`
                    : 'No attachment — upload the PDF from the bank'}
                </p>
              </div>

              <span style={{
                fontSize: 10, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                background: ready ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: ready ? 'var(--accent-green)' : '#f59e0b',
              }}>
                {ready ? 'Ready' : 'Needs PDF'}
              </span>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}
                  disabled={dismissing}
                  onClick={() => navigate(`/internal/expenses/import?pending=${s.id}`)}
                >
                  {ready ? <Download size={13} /> : <Upload size={13} />}
                  {ready ? 'Extract & Import' : 'Upload PDF'}
                </button>
                <button
                  className="btn-ghost"
                  title="Not a statement — skip"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', fontSize: 12, color: 'var(--text-muted)' }}
                  disabled={dismissing}
                  onClick={() => updateStatement.mutate({ id: s.id, state: 'dismissed' })}
                >
                  {dismissing ? <Spinner size={12} /> : <X size={13} />}
                  Skip
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
