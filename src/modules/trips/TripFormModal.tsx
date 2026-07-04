import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateTrip, useUpdateTrip } from '../../hooks/useTrips'
import type { CreateTripInput, TripListItem } from '../../types/trips'

const EMOJI_OPTIONS = ['✈️','🏖️','🏔️','🌏','🗺️','🚢','🏕️','🎌','🌴','🗼','🏰','🎡','🌺','🏄','🎿','🚂','🛵','🎭','🍜','🌃']

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', width: '100%', colorScheme: 'dark',
}

export default function TripFormModal({
  trip, onClose, onCreated,
}: {
  trip?: TripListItem
  onClose: () => void
  onCreated?: (id: number) => void
}) {
  const create = useCreateTrip()
  const update = useUpdateTrip()
  const isEdit = !!trip

  const [name, setName] = useState(trip?.name ?? '')
  const [emoji, setEmoji] = useState(trip?.cover_emoji ?? '✈️')
  const [city, setCity] = useState(trip?.destination_city ?? '')
  const [country, setCountry] = useState(trip?.destination_country ?? '')
  const [startDate, setStartDate] = useState(trip?.start_date?.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(trip?.end_date?.slice(0, 10) ?? '')
  const [budget, setBudget] = useState(trip?.budget_myr != null ? String(trip.budget_myr) : '')

  const loading = create.isPending || update.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !city.trim() || !startDate || !endDate) return
    const data: CreateTripInput = {
      name: name.trim(),
      cover_emoji: emoji,
      destination_city: city.trim(),
      destination_country: country.trim() || undefined,
      start_date: startDate,
      end_date: endDate,
      budget_myr: budget ? parseFloat(budget) : null,
    }
    if (isEdit && trip) {
      await update.mutateAsync({ id: trip.id, data: { ...data } })
      onClose()
    } else {
      const created = await create.mutateAsync(data)
      onCreated?.(created.id)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Trip' : 'New Trip'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Cover</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => setEmoji(e)} style={{
                  width: 36, height: 36, borderRadius: 8, fontSize: 18, cursor: 'pointer',
                  background: emoji === e ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                  border: `1px solid ${emoji === e ? 'var(--border-active)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <input style={inputStyle} placeholder="Trip name *" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input style={inputStyle} placeholder="City *" value={city} onChange={e => setCity(e.target.value)} />
            <input style={inputStyle} placeholder="Country" value={country} onChange={e => setCountry(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Start date *</label>
              <input type="date" style={inputStyle} value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value) }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>End date *</label>
              <input type="date" style={inputStyle} value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Budget (MYR)</label>
            <input type="number" style={inputStyle} placeholder="0.00" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !name.trim() || !city.trim() || !startDate || !endDate}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
