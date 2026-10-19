import { CalendarDays, MapPin } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useUpcomingCalendar } from '../../hooks/useCalendar'
import type { CalendarEvent } from '../../api/calendar'

const CAL_COLOR = '#f472b6'
const MYT = 'Asia/Kuala_Lumpur'

function mytDay(offsetDays = 0) {
  return new Date(Date.now() + 8 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

function dayLabel(day: string) {
  if (day === mytDay(0)) return 'Today'
  if (day === mytDay(1)) return 'Tomorrow'
  return new Date(`${day}T00:00:00+08:00`).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: MYT })
}

function eventTime(e: CalendarEvent) {
  if (e.allDay) return 'All day'
  return new Date(e.start).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', timeZone: MYT })
}

export default function UpcomingCalendar() {
  const { data, isLoading, isError, isFetching } = useUpcomingCalendar(3)
  if (data && !data.configured) return null

  const events = data?.events ?? []
  const days = [...new Set(events.map(e => e.day))]

  return (
    <GlassCard style={{ padding: '14px 18px', borderLeft: `3px solid ${CAL_COLOR}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <CalendarDays size={14} style={{ color: CAL_COLOR }} />
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Next 3 Days
        </span>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-muted)' }}>
          {data ? events.length : ''}
        </span>
        {isFetching && <Spinner size={12} />}
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading Apple Calendar…</div>
      ) : isError ? (
        <div style={{ color: 'var(--accent-red)', fontSize: 13 }}>Couldn't reach Apple Calendar.</div>
      ) : events.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nothing scheduled.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 16 }}>
          {days.map(day => (
            <div key={day}>
              <div style={{ fontSize: 11, fontWeight: 600, color: CAL_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {dayLabel(day)}
              </div>
              {events.filter(e => e.day === day).map((e, i) => (
                <div key={`${e.start}-${e.title}-${i}`} style={{ display: 'flex', gap: 10, padding: '4px 0', fontSize: 13 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-muted)', width: 64, flexShrink: 0 }}>
                    {eventTime(e)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.title}>
                      {e.title}
                    </div>
                    {e.location && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <MapPin size={10} style={{ flexShrink: 0 }} /> {e.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
