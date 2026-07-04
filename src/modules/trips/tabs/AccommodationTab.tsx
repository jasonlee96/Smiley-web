import { useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, ExternalLink, X } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import {
  useTripAccommodations, useCreateAccommodation,
  useUpdateAccommodation, useDeleteAccommodation,
} from '../../../hooks/useTrips'
import type { Accommodation, AccommodationStatus, CreateAccommodationInput } from '../../../types/trips'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', width: '100%', colorScheme: 'dark',
}

function parseDay(s: string) { return new Date(s.split('T')[0] + 'T00:00:00') }

function fmtDate(s: string) {
  return parseDay(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightCount(checkIn: string, checkOut: string) {
  const nights = Math.round((parseDay(checkOut).getTime() - parseDay(checkIn).getTime()) / 86400000)
  return `${nights} night${nights !== 1 ? 's' : ''}`
}

function mapsUrl(acc: Accommodation) {
  if (acc.lat && acc.lng) return `https://www.google.com/maps?q=${acc.lat},${acc.lng}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acc.location ?? '')}`
}

function AccommodationForm({
  tripId, accommodation, onClose,
}: {
  tripId: number
  accommodation?: Accommodation
  onClose: () => void
}) {
  const create = useCreateAccommodation()
  const update = useUpdateAccommodation()
  const isEdit = !!accommodation

  const [hotelName, setHotelName] = useState(accommodation?.hotel_name ?? '')
  const [location, setLocation] = useState(accommodation?.location ?? '')
  const [checkIn, setCheckIn] = useState(accommodation?.check_in?.slice(0, 10) ?? '')
  const [checkOut, setCheckOut] = useState(accommodation?.check_out?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<AccommodationStatus>(accommodation?.status ?? 'confirmed')
  const [confirmRef, setConfirmRef] = useState(accommodation?.confirmation_ref ?? '')
  const [notes, setNotes] = useState(accommodation?.notes ?? '')

  const loading = create.isPending || update.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelName.trim() || !checkIn || !checkOut) return
    const data: CreateAccommodationInput = {
      hotel_name: hotelName.trim(),
      location: location.trim() || null,
      check_in: checkIn,
      check_out: checkOut,
      status,
      confirmation_ref: confirmRef.trim() || null,
      notes: notes.trim() || null,
    }
    if (isEdit && accommodation) {
      await update.mutateAsync({ tripId, accId: accommodation.id, data })
    } else {
      await create.mutateAsync({ tripId, data })
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Accommodation' : 'Add Accommodation'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inputStyle} placeholder="Hotel / property name *" value={hotelName} onChange={e => setHotelName(e.target.value)} autoFocus />
          <input style={inputStyle} placeholder="Address or location (used for Maps link)" value={location} onChange={e => setLocation(e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Check-in *</label>
              <input type="date" style={inputStyle} value={checkIn} onChange={e => { setCheckIn(e.target.value); if (!checkOut || e.target.value >= checkOut) setCheckOut('') }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Check-out *</label>
              <input type="date" style={inputStyle} value={checkOut} min={checkIn || undefined} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
            {(['suggested', 'confirmed'] as AccommodationStatus[]).map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)} style={{
                padding: '7px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: status === s ? (s === 'confirmed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)') : 'transparent',
                color: status === s ? (s === 'confirmed' ? '#10b981' : '#f59e0b') : 'var(--text-muted)',
                fontFamily: 'Inter', transition: 'all 0.15s', textTransform: 'capitalize',
              }}>
                {s === 'confirmed' ? '✓ Confirmed' : '~ Suggested'}
              </button>
            ))}
          </div>

          <input style={inputStyle} placeholder="Confirmation / booking ref" value={confirmRef} onChange={e => setConfirmRef(e.target.value)} />
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} placeholder="Notes (room type, amenities, etc.)" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !hotelName.trim() || !checkIn || !checkOut}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AccommodationTab({ tripId }: { tripId: number }) {
  const { data: items = [], isLoading } = useTripAccommodations(tripId)
  const deleteAcc = useDeleteAccommodation()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Accommodation | null>(null)

  function handleDelete(acc: Accommodation) {
    if (!confirm(`Remove "${acc.hotel_name}"?`)) return
    deleteAcc.mutate({ tripId, accId: acc.id })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 14px' }} onClick={() => setShowForm(true)}>
          <Plus size={13} /> Add Accommodation
        </button>
      </div>

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={20} /></div>}

      {!isLoading && items.length === 0 && (
        <GlassCard style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 32 }}>🏨</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No accommodations yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add hotels and stays for your trip</div>
        </GlassCard>
      )}

      {items.map(acc => {
        const nights = nightCount(acc.check_in, acc.check_out)
        return (
          <GlassCard key={acc.id} style={{ padding: '16px 18px' }}>
            <div className="acc-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              {/* Left */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    🏨 {acc.hotel_name}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: acc.status === 'confirmed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    color: acc.status === 'confirmed' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${acc.status === 'confirmed' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                    {acc.status === 'confirmed' ? '✓ Confirmed' : '~ Suggested'}
                  </span>
                </div>

                {/* Dates */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: 'var(--accent-cyan)' }}>
                    {fmtDate(acc.check_in)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: 'var(--accent-cyan)' }}>
                    {fmtDate(acc.check_out)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 10 }}>
                    {nights}
                  </span>
                </div>

                {/* Location */}
                {acc.location && (
                  <a
                    href={mapsUrl(acc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-cyan)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    <MapPin size={12} />
                    {acc.location}
                    <ExternalLink size={10} style={{ opacity: 0.6 }} />
                  </a>
                )}

                {/* Confirmation ref */}
                {acc.confirmation_ref && (
                  <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', marginTop: 2 }}>
                    Ref: {acc.confirmation_ref}
                  </div>
                )}

                {/* Notes */}
                {acc.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{acc.notes}</div>
                )}
              </div>

              {/* Actions */}
              <div className="acc-actions" style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
                <button className="btn-ghost" style={{ padding: '5px 7px' }} onClick={() => setEditing(acc)}><Pencil size={13} /></button>
                <button className="btn-ghost" style={{ padding: '5px 7px', color: '#ef4444' }} onClick={() => handleDelete(acc)}><Trash2 size={13} /></button>
              </div>
            </div>
          </GlassCard>
        )
      })}

      <style>{`.acc-row:hover .acc-actions { opacity: 1 !important; }`}</style>

      {showForm && <AccommodationForm tripId={tripId} onClose={() => setShowForm(false)} />}
      {editing && <AccommodationForm tripId={tripId} accommodation={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
