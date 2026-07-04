import { useState } from 'react'
import { Trash2, CalendarDays, X } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import type { Todo } from '../../types/todos'
import { format, parseISO, isSameDay } from 'date-fns'

const dateInputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '4px 7px',
  fontSize: 11,
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'IBM Plex Mono',
  colorScheme: 'dark',
}

export default function TodoItem({
  todo,
  onToggle,
  onDelete,
  onDateChange,
}: {
  todo: Todo
  onToggle: (id: number, status: 'not_started' | 'in_progress' | 'done') => void
  onDelete: (id: number) => void
  onDateChange: (id: number, planned_date: string | null, planned_date_end?: string | null) => void
}) {
  const [showDelete, setShowDelete] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const isDone = todo.status === 'done'

  const nextStatus = (): 'not_started' | 'in_progress' | 'done' => {
    if (todo.status === 'not_started') return 'in_progress'
    if (todo.status === 'in_progress') return 'done'
    return 'not_started'
  }

  const openDateEdit = () => {
    const start = todo.planned_date?.slice(0, 10) ?? todo.due_date?.slice(0, 10) ?? ''
    const end = todo.planned_date_end?.slice(0, 10) ?? start
    setEditStart(start)
    setEditEnd(end)
    setEditingDate(true)
  }

  const saveDates = () => {
    const endVal = editEnd && editEnd !== editStart ? editEnd : null
    onDateChange(todo.id, editStart || null, endVal)
    setEditingDate(false)
  }

  const clearDates = () => {
    onDateChange(todo.id, null, null)
    setEditingDate(false)
  }

  const displayDate = todo.planned_date || todo.due_date
  const hasRange = !!(todo.planned_date && todo.planned_date_end &&
    !isSameDay(parseISO(todo.planned_date.slice(0, 10)), parseISO(todo.planned_date_end.slice(0, 10))))

  const dateLabel = displayDate
    ? hasRange
      ? `${format(parseISO(todo.planned_date!.slice(0, 10)), 'MMM d')} → ${format(parseISO(todo.planned_date_end!.slice(0, 10)), 'MMM d')}`
      : `${format(parseISO(displayDate.slice(0, 10)), 'MMM d')}`
    : null

  return (
    <div
      className="glass-card animate-slide-up"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: editingDate ? 'flex-start' : 'center',
        gap: 12,
        opacity: isDone ? 0.6 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id, nextStatus())}
        style={{
          width: 20, height: 20, flexShrink: 0,
          border: `2px solid ${isDone ? 'var(--accent-green)' : 'var(--border)'}`,
          borderRadius: 6,
          background: isDone ? 'rgba(16,185,129,0.15)' : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          color: 'var(--accent-green)',
          fontSize: 11,
          marginTop: editingDate ? 2 : 0,
        }}
      >
        {isDone && '✓'}
      </button>

      {/* Title + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14,
          fontWeight: 500,
          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 0.2s',
        }}>
          {todo.title}
        </p>

        {/* Date display / editor */}
        {editingDate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <input
              type="date"
              value={editStart}
              onChange={e => {
                setEditStart(e.target.value)
                if (!editEnd || e.target.value > editEnd) setEditEnd(e.target.value)
              }}
              style={dateInputStyle}
              autoFocus
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
            <input
              type="date"
              value={editEnd}
              min={editStart || undefined}
              onChange={e => setEditEnd(e.target.value)}
              style={dateInputStyle}
            />
            <button
              onClick={saveDates}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                background: 'var(--accent-cyan-dim)', border: '1px solid var(--accent-cyan)',
                color: 'var(--accent-cyan)', cursor: 'pointer', fontFamily: 'Inter',
              }}
            >
              Save
            </button>
            <button
              onClick={clearDates}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
              title="Clear dates"
            >
              <X size={10} />
            </button>
            <button
              onClick={() => setEditingDate(false)}
              style={{
                fontSize: 11, padding: '4px 8px', borderRadius: 6,
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 2 }}>
            {dateLabel ? (
              <button
                onClick={openDateEdit}
                title="Edit dates"
                style={{
                  fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 4,
                  textDecoration: 'underline dotted',
                }}
              >
                {dateLabel}
              </button>
            ) : (
              <button
                onClick={openDateEdit}
                title="Set date"
                style={{
                  opacity: showDelete ? 1 : 0,
                  transition: 'opacity 0.15s',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}
              >
                <CalendarDays size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status */}
      <div style={{ marginTop: editingDate ? 2 : 0, flexShrink: 0 }}>
        <StatusBadge status={todo.status} />
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className="btn-danger"
        style={{
          padding: '5px 8px',
          opacity: showDelete && !editingDate ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: showDelete && !editingDate ? 'auto' : 'none',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          marginTop: editingDate ? 2 : 0,
          flexShrink: 0,
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
