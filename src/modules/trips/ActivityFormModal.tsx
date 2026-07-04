import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateActivity, useUpdateActivity } from '../../hooks/useTrips'
import type { Activity, ActivityType, CreateActivityInput, TripDay } from '../../types/trips'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', width: '100%', colorScheme: 'dark',
}

const ACTIVITY_TYPES: ActivityType[] = ['accommodation','transport','meal','attraction','other']

export default function ActivityFormModal({
  tripId, day, activity, onClose,
}: {
  tripId: number
  day: TripDay
  activity?: Activity
  onClose: () => void
}) {
  const create = useCreateActivity()
  const update = useUpdateActivity()
  const isEdit = !!activity

  const [actType, setActType] = useState<ActivityType>(activity?.activity_type ?? 'other')
  const [title, setTitle] = useState(activity?.title ?? '')
  const [nameZh, setNameZh] = useState(activity?.name_zh ?? '')
  const [startTime, setStartTime] = useState(activity?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(activity?.end_time?.slice(0, 5) ?? '')
  const [notes, setNotes] = useState(activity?.notes ?? '')
  const [location, setLocation] = useState(activity?.location ?? '')
  const [cost, setCost] = useState(activity?.estimated_cost_myr != null ? String(activity.estimated_cost_myr) : '')

  const loading = create.isPending || update.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const data: CreateActivityInput = {
      activity_type: actType,
      title: title.trim(),
      name_zh: nameZh.trim() || null,
      start_time: startTime || null,
      end_time: endTime || null,
      notes: notes.trim() || null,
      location: location.trim() || null,
      estimated_cost_myr: cost ? parseFloat(cost) : null,
    }
    if (isEdit && activity) {
      await update.mutateAsync({ tripId, actId: activity.id, data })
    } else {
      await create.mutateAsync({ tripId, dayId: day.id, data })
    }
    onClose()
  }

  const parseDayDate = (s: string) => new Date(s.split('T')[0] + 'T00:00:00')
  const dayLabel = parseDayDate(day.day_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Activity' : 'Add Activity'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'IBM Plex Mono' }}>
              Day {day.day_number} · {dayLabel}
            </span>
          </div>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ACTIVITY_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setActType(t)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer', border: `1px solid ${actType === t ? 'var(--border-active)' : 'var(--border)'}`,
                background: actType === t ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                color: actType === t ? 'var(--accent-cyan)' : 'var(--text-muted)',
                transition: 'all 0.15s', textTransform: 'capitalize',
              }}>
                {t}
              </button>
            ))}
          </div>

          <input style={inputStyle} placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />

          <input style={inputStyle} placeholder="Chinese name (optional)" value={nameZh} onChange={e => setNameZh(e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Start time</label>
              <input type="time" style={inputStyle} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>End time</label>
              <input type="time" style={inputStyle} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <input style={inputStyle} placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />

          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

          <input type="number" style={inputStyle} placeholder="Estimated cost (MYR)" value={cost} onChange={e => setCost(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !title.trim()}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
