import { useState } from 'react'
import { useWeather, useWeatherHistory } from '../../hooks/useWeather'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { RefreshCw, Droplets, Wind, Eye, Thermometer, ChevronDown, ChevronUp, Sparkles, Calendar } from 'lucide-react'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import type { WeatherSnapshot, ForecastSlot } from '../../api/weather'

// ── helpers ──────────────────────────────────────────────────────────────────

function weatherEmoji(main: string): string {
  switch (main?.toLowerCase()) {
    case 'clear':       return '☀️'
    case 'clouds':      return '☁️'
    case 'rain':        return '🌧️'
    case 'drizzle':     return '🌦️'
    case 'thunderstorm':return '⛈️'
    case 'snow':        return '❄️'
    case 'mist':
    case 'fog':
    case 'haze':        return '🌫️'
    default:            return '🌤️'
  }
}

function rainColor(pct: number): string {
  if (pct >= 60) return 'var(--accent-red)'
  if (pct >= 30) return 'var(--accent-amber)'
  return 'var(--accent-green)'
}

function parseForecast(data: WeatherSnapshot['forecast_data']): { today: ForecastSlot[]; tomorrow: ForecastSlot[] } {
  if (!data) return { today: [], tomorrow: [] }
  if (Array.isArray(data)) return { today: [], tomorrow: data as ForecastSlot[] }
  return { today: data.today ?? [], tomorrow: data.tomorrow ?? [] }
}

function maxPop(slots: ForecastSlot[]): number | null {
  if (!slots.length) return null
  return Math.round(Math.max(...slots.map(s => s.pop ?? 0)) * 100)
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '4px 9px', fontSize: 12,
      fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)',
    }}>
      {icon} {value}
    </span>
  )
}

function ForecastRow({ slots }: { slots: ForecastSlot[] }) {
  if (!slots.length) return null
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {slots.map((slot, i) => {
        const pop = slot.pop != null ? Math.round(slot.pop * 100) : 0
        const time = slot.dt_txt?.slice(11, 16) ?? ''
        const emoji = weatherEmoji(slot.weather?.[0]?.main ?? '')
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            minWidth: 52, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>{time}</span>
            <span style={{ fontSize: 18 }}>{emoji}</span>
            <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--text-primary)' }}>
              {slot.main?.temp != null ? `${Math.round(slot.main.temp)}°` : '—'}
            </span>
            {pop > 0 && (
              <span style={{ fontSize: 10, color: rainColor(pop), fontFamily: 'IBM Plex Mono' }}>{pop}%</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AiBox({ label, color, summary, suggestion }: { label: string; color: string; summary: string; suggestion?: string | null }) {
  return (
    <div style={{
      background: `${color}0d`, borderLeft: `3px solid ${color}`, borderRadius: '0 8px 8px 0',
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fontWeight: 700, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{summary}</p>
      {suggestion && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>{suggestion}</p>
      )}
    </div>
  )
}

function HistoryPanel({ locationId }: { locationId: number }) {
  const { data, isLoading } = useWeatherHistory(locationId)
  if (isLoading) return <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: 12 }}><Spinner size={12} /> Loading history...</div>
  if (!data?.length) return null
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
      <p style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>7-Day History</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map(snap => (
          <div key={snap.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
              {format(parseISO(snap.fetched_at), 'MMM d')}
            </span>
            <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
              {snap.owm_data?.main?.temp != null ? `${Math.round(snap.owm_data.main.temp)}°C` : '—'}
            </span>
            {snap.summary && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, flex: 1 }}>{snap.summary.slice(0, 160)}{snap.summary.length > 160 ? '…' : ''}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CityCard({ snap }: { snap: WeatherSnapshot }) {
  const [expanded, setExpanded] = useState(false)
  const owm = snap.owm_data
  const temp = owm?.main?.temp != null ? Math.round(owm.main.temp) : null
  const feelsLike = owm?.main?.feels_like != null ? Math.round(owm.main.feels_like) : null
  const condition = owm?.weather?.[0]?.description ?? ''
  const weatherMain = owm?.weather?.[0]?.main ?? ''
  const humidity = owm?.main?.humidity
  const windKph = owm?.wind?.speed != null ? Math.round(owm.wind.speed * 3.6) : null
  const visKm = owm?.visibility != null ? (owm.visibility / 1000).toFixed(1) : null
  const emoji = weatherEmoji(weatherMain)

  const { today: todaySlots, tomorrow: tomorrowSlots } = parseForecast(snap.forecast_data)
  const todayRain = maxPop(todaySlots)
  const tomorrowRain = maxPop(tomorrowSlots)
  const updatedAgo = formatDistanceToNow(parseISO(snap.fetched_at), { addSuffix: true })

  return (
    <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '20px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 48, lineHeight: 1 }}>{emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{snap.location_name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'capitalize' }}>{condition}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              {temp !== null && (
                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 36, fontWeight: 500, color: 'var(--accent-cyan)', lineHeight: 1 }}>{temp}°C</span>
              )}
              {feelsLike !== null && temp !== feelsLike && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>feels {feelsLike}°</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {humidity != null && <StatChip icon={<Droplets size={11} />} value={`${humidity}%`} />}
              {windKph != null && <StatChip icon={<Wind size={11} />} value={`${windKph} km/h`} />}
              {todayRain != null && <StatChip icon={<span style={{ fontSize: 11 }}>🌧</span>} value={<span style={{ color: rainColor(todayRain) }}>{todayRain}%</span> as any} />}
              {visKm && parseFloat(visKm) < 10 && <StatChip icon={<Eye size={11} />} value={`${visKm} km`} />}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', alignSelf: 'center' }}>Updated {updatedAgo}</span>
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="animate-slide-up" style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Today forecast slots */}
          {todaySlots.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Later Today</p>
              <ForecastRow slots={todaySlots} />
            </div>
          )}

          {/* Tomorrow forecast slots */}
          {tomorrowSlots.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Tomorrow {tomorrowRain != null ? `· ${tomorrowRain}% rain` : ''}
              </p>
              <ForecastRow slots={tomorrowSlots} />
            </div>
          )}

          {/* AI summaries */}
          {snap.summary && (
            <AiBox
              label="Today · AI Insight"
              color="var(--accent-cyan)"
              summary={snap.summary}
              suggestion={snap.suggestion}
            />
          )}
          {snap.forecast_summary && (
            <AiBox
              label="Tomorrow · Forecast"
              color="#a78bfa"
              summary={snap.forecast_summary}
              suggestion={snap.forecast_suggestion}
            />
          )}

          <HistoryPanel locationId={snap.location_id} />
        </div>
      )}
    </GlassCard>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { latestQuery, locationsQuery, refreshMutation } = useWeather()
  const [refreshing, setRefreshing] = useState(false)

  const snapshots = latestQuery.data ?? []

  async function handleRefresh() {
    setRefreshing(true)
    try { await refreshMutation.mutateAsync() } finally { setRefreshing(false) }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Weather</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {locationsQuery.data?.filter(l => l.active).map(l => l.name).join(' · ') || 'Loading locations…'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {latestQuery.isFetching && <Spinner size={16} />}
          <button className="btn-ghost" onClick={() => latestQuery.refetch()} style={{ padding: '6px 10px' }} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button
            className="btn-primary"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {refreshing ? <Spinner size={13} /> : <RefreshCw size={13} />}
            Fetch Now
          </button>
        </div>
      </div>

      {/* Content */}
      {latestQuery.isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, color: 'var(--text-muted)' }}>
          <Spinner /> Loading weather…
        </div>
      ) : latestQuery.isError ? (
        <GlassCard style={{ padding: '20px 22px', color: 'var(--accent-red)', fontSize: 13 }}>
          Failed to load weather data.
        </GlassCard>
      ) : snapshots.length === 0 ? (
        <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>🌤️</span>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 12 }}>No weather data yet. Click "Fetch Now" to pull the latest.</p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {snapshots.map(snap => <CityCard key={snap.location_id} snap={snap} />)}
        </div>
      )}
    </div>
  )
}
