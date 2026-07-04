import { useState } from 'react'
import type { CreateTodoInput } from '../../types/todos'

export default function AddTodoForm({
  onSubmit, onCancel, loading, prefilledDate,
}: {
  onSubmit: (data: CreateTodoInput) => Promise<void>
  onCancel: () => void
  loading: boolean
  prefilledDate?: string
}) {
  const [title, setTitle] = useState('')
  const [workspace, setWorkspace] = useState<'work' | 'personal'>('work')
  const [startDate, setStartDate] = useState(prefilledDate ?? '')
  const [endDate, setEndDate] = useState(prefilledDate ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await onSubmit({
      title: title.trim(),
      workspace,
      planned_date: startDate || undefined,
      planned_date_end: endDate && endDate !== startDate ? endDate : undefined,
    })
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'Inter',
    transition: 'border-color 0.2s',
    width: '100%',
    colorScheme: 'dark',
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        New Task
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          style={inputStyle}
          placeholder="Task title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 10 }}>
          <select
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
            value={workspace}
            onChange={e => setWorkspace(e.target.value as 'work' | 'personal')}
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono' }}>
              Start date
            </label>
            <input
              type="date"
              style={{ ...inputStyle, width: '100%' }}
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value)
                if (!endDate || e.target.value > endDate) setEndDate(e.target.value)
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'IBM Plex Mono' }}>
              End date
            </label>
            <input
              type="date"
              style={{ ...inputStyle, width: '100%' }}
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={loading || !title.trim()}>
          {loading ? 'Adding...' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
