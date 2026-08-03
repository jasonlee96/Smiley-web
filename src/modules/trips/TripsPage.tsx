import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plane, Plus } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import TripFormModal from './TripFormModal'
import { useTrips } from '../../hooks/useTrips'
import type { TripListItem, TripStatus } from '../../types/trips'

const STATUS_ORDER: TripStatus[] = ['active', 'upcoming', 'planning', 'completed', 'cancelled']

const STATUS_CFG: Record<TripStatus, { label: string; color: string }> = {
  active:    { label: 'Active',    color: '#10b981' },
  upcoming:  { label: 'Upcoming',  color: '#06b6d4' },
  planning:  { label: 'Planning',  color: '#f59e0b' },
  completed: { label: 'Completed', color: 'var(--text-muted)' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
}

function parseDay(s: string) { return new Date(s.split('T')[0] + 'T00:00:00') }

function fmtRange(start: string, end: string) {
  const s = parseDay(start), e = parseDay(end)
  const o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('en-GB', o)} – ${e.toLocaleDateString('en-GB', { ...o, year: 'numeric' })}`
}

function duration(start: string, end: string) {
  const d = Math.round((parseDay(end).getTime() - parseDay(start).getTime()) / 86400000) + 1
  return d > 1 ? `${d}D · ${d - 1}N` : `${d}D`
}

function countdown(start: string, end: string, status: TripStatus): string | null {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const s = parseDay(start), e = parseDay(end)
  if (status === 'active') {
    const left = Math.ceil((e.getTime() - now.getTime()) / 86400000)
    return left > 0 ? `${left}d left` : 'Last day'
  }
  if (status === 'completed' || status === 'cancelled') return null
  const away = Math.ceil((s.getTime() - now.getTime()) / 86400000)
  if (away > 0) return `${away}d away`
  if (away === 0) return 'Departs today!'
  return null
}

function TripCard({ trip }: { trip: TripListItem }) {
  const navigate = useNavigate()
  const cfg = STATUS_CFG[trip.status] ?? STATUS_CFG.planning
  const budgetPct = trip.budget_myr && trip.actual_spend_myr != null
    ? Math.min(100, (trip.actual_spend_myr / trip.budget_myr) * 100) : null
  const barColor = budgetPct == null ? '#06b6d4'
    : budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#f59e0b' : '#10b981'
  const cd = countdown(trip.start_date, trip.end_date, trip.status)

  return (
    <GlassCard
      style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 8 }}
      onClick={() => navigate(`/internal/trips/${trip.id}`)}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        {trip.cover_emoji}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ''}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'IBM Plex Mono' }}>
          {fmtRange(trip.start_date, trip.end_date)} · {duration(trip.start_date, trip.end_date)}
        </div>
        {budgetPct !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: 3, borderRadius: 2, width: `${budgetPct}%`, background: barColor, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: barColor, minWidth: 32 }}>
              {Math.round(budgetPct)}%
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: cfg.color + '18', borderRadius: 20,
          padding: '3px 10px', fontSize: 11, fontWeight: 700, color: cfg.color,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
          {cfg.label}
        </span>
        {cd && (
          <span style={{
            background: cfg.color + '12', borderRadius: 20,
            padding: '2px 8px', fontSize: 11, fontWeight: 600, color: cfg.color,
            fontFamily: 'IBM Plex Mono',
          }}>
            {cd}
          </span>
        )}
      </div>
    </GlassCard>
  )
}

export default function TripsPage() {
  const { data: trips = [], isLoading } = useTrips()
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  const groups: Partial<Record<TripStatus, TripListItem[]>> = {}
  for (const t of trips) {
    if (!groups[t.status]) groups[t.status] = []
    groups[t.status]!.push(t)
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
            Trips
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoading && <Spinner size={16} />}
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={() => setShowForm(true)}>
            <Plus size={14} /> New Trip
          </button>
        </div>
      </div>

      {trips.length === 0 && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plane size={32} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>No trips yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click + New Trip to plan your first adventure</div>
        </div>
      )}

      {STATUS_ORDER.filter(s => groups[s]?.length).map(status => {
        const cfg = STATUS_CFG[status]
        return (
          <div key={status}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: cfg.color }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 11, background: cfg.color + '18', color: cfg.color, borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
                {groups[status]!.length}
              </span>
            </div>
            {groups[status]!.map(t => <TripCard key={t.id} trip={t} />)}
          </div>
        )
      })}

      {showForm && (
        <TripFormModal
          onClose={() => setShowForm(false)}
          onCreated={(id) => { setShowForm(false); navigate(`/internal/trips/${id}`) }}
        />
      )}
    </div>
  )
}
