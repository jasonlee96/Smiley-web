import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2, Plus, Lightbulb, ArrowLeftRight } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import {
  useExpenseMonthDetail, useExpenseEntries, useUpdateMonthNotes, useMoveMonth, useGenerateInsight, useDeleteEntry,
} from '../../hooks/useExpenses'
import { getCategoryIcon } from './ionicons-map'
import EntryFormModal from './EntryFormModal'
import type { ExpenseEntry } from '../../types/expenses'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function MonthDetailPage() {
  const { year: yearParam, month: monthParam } = useParams<{ year: string; month: string }>()
  const year = parseInt(yearParam ?? '0')
  const month = parseInt(monthParam ?? '0')
  const navigate = useNavigate()

  const detailQuery = useExpenseMonthDetail(year, month)
  const entriesQuery = useExpenseEntries(year, month)
  const updateNotes = useUpdateMonthNotes(year, month)
  const moveMonth = useMoveMonth(year, month)
  const generateInsight = useGenerateInsight(year, month)
  const deleteEntry = useDeleteEntry(year, month)

  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveYear, setMoveYear] = useState(year)
  const [moveMonthNum, setMoveMonthNum] = useState(month)
  const [showEntryForm, setShowEntryForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | undefined>(undefined)

  const detail = detailQuery.data
  const entries = entriesQuery.data ?? []
  const incomeEntries = entries.filter(e => e.entry_type === 'income')
  const expenseEntries = entries.filter(e => e.entry_type === 'expense')
  const maxCatTotal = Math.max(1, ...(detail?.by_category ?? []).map(c => c.total))

  function startEditNotes() {
    setNotesInput(detail?.notes ?? '')
    setEditingNotes(true)
  }
  function saveNotes() {
    updateNotes.mutate(notesInput || null)
    setEditingNotes(false)
  }

  function shiftMoveMonth(delta: number) {
    let m = moveMonthNum + delta
    let y = moveYear
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setMoveMonthNum(m)
    setMoveYear(y)
  }

  async function confirmMove() {
    await moveMonth.mutateAsync({ toYear: moveYear, toMonth: moveMonthNum })
    navigate('/expenses')
  }

  function openEntry(e?: ExpenseEntry) {
    setEditingEntry(e)
    setShowEntryForm(true)
  }

  if (detailQuery.isLoading || !detail) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => navigate('/expenses')}>
          <ChevronLeft size={16} />
        </button>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>
          {MONTH_NAMES[month - 1]} {year}
        </h1>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }} onClick={() => setShowMoveModal(true)}>
          <ArrowLeftRight size={13} /> Move to month
        </button>
      </div>

      <GlassCard style={{ padding: '16px 18px' }}>
        {editingNotes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              autoFocus
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-active)', borderRadius: 8,
                padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', minHeight: 60, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setEditingNotes(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveNotes}>Save</button>
            </div>
          </div>
        ) : (
          <p
            onClick={startEditNotes}
            style={{ fontSize: 13, color: detail.notes ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: detail.notes ? 'normal' : 'italic', cursor: 'pointer' }}
          >
            {detail.notes || 'Tap to add a note...'}
          </p>
        )}
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <GlassCard style={{ padding: '16px 18px', background: 'rgba(16,185,129,0.06)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Income</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: 'var(--accent-green)', marginTop: 4 }}>RM {fmt(detail.total_income)}</p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 18px', background: 'rgba(239,68,68,0.06)' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expenses</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: '#ef4444', marginTop: 4 }}>RM {fmt(detail.total_expenses)}</p>
        </GlassCard>
        <GlassCard style={{ padding: '16px 18px' }}>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net</p>
          <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, color: detail.net_savings >= 0 ? 'var(--accent-green)' : '#ef4444', marginTop: 4 }}>
            RM {fmt(detail.net_savings)}
          </p>
        </GlassCard>
      </div>

      {detail.by_category.length > 0 && (
        <GlassCard style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Category Breakdown</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {detail.by_category.map(c => {
              const Icon = getCategoryIcon(c.icon)
              const pct = detail.total_expenses > 0 ? Math.round((c.total / detail.total_expenses) * 100) : 0
              const barWidth = Math.max(2, (c.total / maxCatTotal) * 100)
              return (
                <div key={c.category_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                      <Icon size={13} color={c.color} /> {c.label}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>RM {fmt(c.total)} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 3, background: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      <GlassCard style={{ padding: '16px 20px', borderLeft: '3px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Lightbulb size={15} color="#f59e0b" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Insight</span>
        </div>
        {generateInsight.isPending ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner size={14} /> <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating insight...</span></div>
        ) : detail.insight ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{detail.insight}</p>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '4px 0' }} onClick={() => generateInsight.mutate()}>Refresh insight</button>
          </>
        ) : (
          <button className="btn-primary" style={{ fontSize: 12 }} onClick={() => generateInsight.mutate()}>Generate Insight</button>
        )}
      </GlassCard>

      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Income</p>
        {incomeEntries.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No income entries.</p>
        ) : (
          <GlassCard style={{ padding: '8px' }}>
            {incomeEntries.map((e, i) => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                borderBottom: i < incomeEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.label}</p>
                  {e.entry_date && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.entry_date.slice(0, 10)}</p>}
                  {e.original_amount != null && (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>SGD {fmt(e.original_amount)} @ {e.exchange_rate?.toFixed(4)}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: 'var(--accent-green)' }}>+RM {fmt(e.amount)}</span>
                  <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEntry(e)}><Pencil size={13} /></button>
                  <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => { if (confirm(`Delete "${e.label}"?`)) deleteEntry.mutate(e.id) }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      <div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Expenses</p>
        {expenseEntries.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No expense entries.</p>
        ) : (
          <GlassCard style={{ padding: '8px' }}>
            {expenseEntries.map((e, i) => {
              const Icon = getCategoryIcon(e.category_icon ?? 'ellipsis-horizontal-circle-outline')
              return (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px',
                  borderBottom: i < expenseEntries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${e.category_color ?? '#95A5A6'}22`,
                    }}>
                      <Icon size={13} color={e.category_color ?? '#95A5A6'} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {e.category_label}{e.entry_date ? ` · ${e.entry_date.slice(0, 10)}` : ''}
                      </p>
                      {e.original_amount != null && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>SGD {fmt(e.original_amount)} @ {e.exchange_rate?.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: '#ef4444' }}>-RM {fmt(e.amount)}</span>
                    <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEntry(e)}><Pencil size={13} /></button>
                    <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => { if (confirm(`Delete "${e.label}"?`)) deleteEntry.mutate(e.id) }}><Trash2 size={13} /></button>
                  </div>
                </div>
              )
            })}
          </GlassCard>
        )}
      </div>

      <button
        className="btn-primary"
        style={{
          position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
        onClick={() => openEntry(undefined)}
      >
        <Plus size={20} />
      </button>

      {showEntryForm && <EntryFormModal year={year} month={month} entry={editingEntry} onClose={() => setShowEntryForm(false)} />}

      {showMoveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowMoveModal(false)}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14,
            padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Move all entries to</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              <button className="btn-ghost" onClick={() => shiftMoveMonth(-1)}>‹</button>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 15 }}>{MONTH_NAMES[moveMonthNum - 1]} {moveYear}</span>
              <button className="btn-ghost" onClick={() => shiftMoveMonth(1)}>›</button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowMoveModal(false)}>Cancel</button>
              <button
                className="btn-primary"
                disabled={moveYear === year && moveMonthNum === month || moveMonth.isPending}
                onClick={confirmMove}
              >
                {moveMonth.isPending ? 'Moving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
