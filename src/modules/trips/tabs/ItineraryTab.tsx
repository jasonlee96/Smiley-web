import { useState } from 'react'
import { Plus, Pencil, Trash2, BedDouble, Car, UtensilsCrossed, Camera, Circle } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import ActivityFormModal from '../ActivityFormModal'
import { useDeleteActivity } from '../../../hooks/useTrips'
import type { Trip, TripDay, Activity, ActivityType } from '../../../types/trips'

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  accommodation: <BedDouble size={13} />,
  transport:     <Car size={13} />,
  meal:          <UtensilsCrossed size={13} />,
  attraction:    <Camera size={13} />,
  other:         <Circle size={13} />,
}

function parseDay(s: string) { return new Date(s.split('T')[0] + 'T00:00:00') }

export default function ItineraryTab({ trip, onRefetch }: { trip: Trip; onRefetch: () => void }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [addModal, setAddModal] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const deleteActivity = useDeleteActivity()

  const days = trip.days ?? []
  const day: TripDay | undefined = days[selectedIdx]

  const sorted = day
    ? [...(day.activities ?? [])].sort((a, b) => {
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
    : []

  function handleDelete(act: Activity) {
    if (!confirm(`Remove "${act.title}"?`)) return
    deleteActivity.mutate({ tripId: trip.id, actId: act.id }, { onSuccess: onRefetch })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {days.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {days.map((d, idx) => {
            const active = idx === selectedIdx
            const date = parseDay(d.day_date)
            return (
              <button key={d.id} onClick={() => setSelectedIdx(idx)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '8px 14px', borderRadius: 10, flexShrink: 0,
                border: `1px solid ${active ? 'var(--border-active)' : 'var(--border)'}`,
                background: active ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 700 }}>D{d.day_number}</span>
                <span style={{ fontSize: 10 }}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </button>
            )
          })}
        </div>
      )}

      {days.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          No days generated yet.
        </div>
      )}

      {day && (
        <GlassCard style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              Day {day.day_number} — {parseDay(day.day_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            {day.title && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{day.title}</div>}
          </div>

          {sorted.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0' }}>No activities yet.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sorted.map((act, idx) => (
              <div key={act.id} className="activity-row" style={{ display: 'flex', gap: 12, position: 'relative' }}>
                <div style={{ width: 40, flexShrink: 0, textAlign: 'right', paddingTop: 3 }}>
                  <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)' }}>
                    {act.start_time ? act.start_time.slice(0, 5) : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', marginTop: 5, flexShrink: 0 }} />
                  {idx < sorted.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 24 }} />
                  )}
                </div>

                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                  }}>
                    {act.activity_type === 'attraction' && act.image_url && (
                      <img
                        src={act.image_url}
                        alt=""
                        title={act.image_attribution ?? undefined}
                        style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: 'var(--accent-cyan)' }}>{TYPE_ICON[act.activity_type]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{act.title}</span>
                        {act.name_zh && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{act.name_zh}</span>
                        )}
                      </div>
                      {act.location && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📍 {act.location}</div>
                      )}
                      {act.notes && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{act.notes}</div>
                      )}
                      {act.estimated_cost_myr != null && (
                        <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', marginTop: 4 }}>
                          ~MYR {act.estimated_cost_myr.toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="activity-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                      <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setEditActivity(act)}><Pencil size={12} /></button>
                      <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => handleDelete(act)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}
            onClick={() => setAddModal(true)}
          >
            <Plus size={13} /> Add activity
          </button>
        </GlassCard>
      )}

      <style>{`.activity-row:hover .activity-actions { opacity: 1 !important; }`}</style>

      {addModal && day && (
        <ActivityFormModal tripId={trip.id} day={day} onClose={() => { setAddModal(false); onRefetch() }} />
      )}
      {editActivity && day && (
        <ActivityFormModal tripId={trip.id} day={day} activity={editActivity} onClose={() => { setEditActivity(null); onRefetch() }} />
      )}
    </div>
  )
}
