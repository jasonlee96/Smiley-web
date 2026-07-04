import { useEffect, useRef, Component, type ReactNode } from 'react'
import 'leaflet/dist/leaflet.css'
import GlassCard from '../../../components/GlassCard'
import { useTripAccommodations } from '../../../hooks/useTrips'
import type { Trip } from '../../../types/trips'

const DAY_COLORS = [
  '#06b6d4', '#f59e0b', '#a78bfa', '#10b981',
  '#ef4444', '#f97316', '#ec4899', '#3b82f6',
  '#84cc16', '#14b8a6', '#8b5cf6', '#f43f5e',
]

function parseDay(s: string) { return new Date(s.split('T')[0] + 'T00:00:00') }

class MapErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <GlassCard style={{ padding: 24, color: '#ef4444', fontSize: 13 }}>
          Map error: {this.state.error}
        </GlassCard>
      )
    }
    return this.props.children
  }
}

function LeafletMap({ dayLayers, accWithCoords, allPoints }: {
  dayLayers: Array<{ day: any; color: string; acts: any[] }>
  accWithCoords: any[]
  allPoints: [number, number][]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((mod) => {
      const L = (mod as any).default ?? mod

      const map = L.map(containerRef.current, {
        center: allPoints[0] ?? [48.5, 10],
        zoom: 6,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Draw per-day polylines + circle markers
      dayLayers.forEach(({ day, color, acts }) => {
        if (acts.length > 1) {
          L.polyline(
            acts.map((a: any) => [a.lat, a.lng]),
            { color, weight: 2.5, opacity: 0.75, dashArray: '6 5' }
          ).addTo(map)
        }
        acts.forEach((act: any, i: number) => {
          const marker = L.circleMarker([act.lat, act.lng], {
            radius: i === 0 ? 9 : 7,
            color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: 2,
          })
          const dayLabel = parseDay(day.day_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          marker.bindPopup(`
            <div style="min-width:160px">
              <div style="font-weight:700;font-size:13px;margin-bottom:3px">${act.title}</div>
              <div style="font-size:11px;color:#555">Day ${day.day_number} · ${dayLabel}</div>
              ${act.start_time ? `<div style="font-size:11px;color:#777;margin-top:2px">${act.start_time.slice(0, 5)}</div>` : ''}
              ${act.location ? `<div style="font-size:11px;color:#777;margin-top:2px">📍 ${act.location}</div>` : ''}
            </div>
          `)
          marker.addTo(map)
        })
      })

      // Accommodation markers
      accWithCoords.forEach((acc: any) => {
        const color = acc.status === 'confirmed' ? '#10b981' : '#f59e0b'
        const marker = L.circleMarker([acc.lat, acc.lng], {
          radius: 10,
          color: '#fff',
          fillColor: color,
          fillOpacity: 0.95,
          weight: 2.5,
        })
        const checkIn = parseDay(acc.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const checkOut = parseDay(acc.check_out).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        marker.bindPopup(`
          <div style="min-width:160px">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">🏨 ${acc.hotel_name}</div>
            <div style="font-size:11px;color:#555">${checkIn} → ${checkOut}</div>
            ${acc.location ? `<div style="font-size:11px;color:#777;margin-top:2px">📍 ${acc.location}</div>` : ''}
            <div style="font-size:11px;font-weight:600;margin-top:4px;color:${color}">${acc.status === 'confirmed' ? '✓ Confirmed' : '~ Suggested'}</div>
          </div>
        `)
        marker.addTo(map)
      })

      // Fit bounds to all points
      if (allPoints.length > 1) {
        const bounds = L.latLngBounds(allPoints)
        map.fitBounds(bounds, { padding: [40, 40] })
      }

      mapRef.current = map
    }).catch((err) => {
      console.error('Leaflet load error:', err)
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // run once on mount

  return <div ref={containerRef} style={{ height: '520px', width: '100%' }} />
}

export default function MapTab({ trip }: { trip: Trip }) {
  const { data: accommodations = [] } = useTripAccommodations(trip.id)
  const days = trip.days ?? []

  const dayLayers = days.map((day, idx) => {
    const acts = [...(day.activities ?? [])]
      .filter(a => a.lat != null && a.lng != null)
      .map(a => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) }))
      .sort((a, b) => {
        if (!a.start_time && !b.start_time) return 0
        if (!a.start_time) return 1
        if (!b.start_time) return -1
        return a.start_time.localeCompare(b.start_time)
      })
    return { day, color: DAY_COLORS[idx % DAY_COLORS.length], acts }
  }).filter(l => l.acts.length > 0)

  const accWithCoords = accommodations
    .filter(a => a.lat != null && a.lng != null)
    .map(a => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) }))

  const allPoints: [number, number][] = [
    ...dayLayers.flatMap(l => l.acts.map((a): [number, number] => [a.lat, a.lng])),
    ...accWithCoords.map((a): [number, number] => [a.lat, a.lng]),
  ]

  const totalActs = days.reduce((s, d) => s + (d.activities ?? []).length, 0)

  if (!allPoints.length) {
    return (
      <GlassCard style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 36 }}>🗺️</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No coordinates yet</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {totalActs} activities · {allPoints.length} with coordinates
        </div>
      </GlassCard>
    )
  }

  return (
    <MapErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
          {allPoints.length - accWithCoords.length}/{totalActs} activities · {accWithCoords.length}/{accommodations.length} stays mapped
        </div>

        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <LeafletMap
            dayLayers={dayLayers}
            accWithCoords={accWithCoords}
            allPoints={allPoints}
          />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {dayLayers.map(({ day, color }) => (
            <div key={day.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
              D{day.day_number}
              <span style={{ color: 'var(--text-muted)' }}>
                {parseDay(day.day_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              {day.title && <span style={{ color: 'var(--text-muted)' }}>· {day.title}</span>}
            </div>
          ))}
          {accWithCoords.length > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '4px 10px',
              fontSize: 11, fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid white', flexShrink: 0, display: 'inline-block' }} />
              Stays
            </div>
          )}
        </div>
      </div>
    </MapErrorBoundary>
  )
}
