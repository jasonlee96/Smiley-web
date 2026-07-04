import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useAiBrief } from '../../../hooks/useTrips'
import type { AiBrief, Trip } from '../../../types/trips'

export default function BriefTab({ tripId, trip }: { tripId: number; trip: Trip }) {
  const aiBrief = useAiBrief()
  const [brief, setBrief] = useState<AiBrief | null>(null)

  async function generate() {
    const result = await aiBrief.mutateAsync(tripId)
    setBrief(result)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          onClick={generate}
          disabled={aiBrief.isPending}
        >
          {aiBrief.isPending ? <Spinner size={13} /> : <RefreshCw size={13} />}
          {brief ? 'Regenerate Brief' : 'Generate Brief'}
        </button>
      </div>

      {aiBrief.isPending && (
        <GlassCard style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spinner size={24} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Generating travel brief for {trip.destination_city}…</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>This may take 30–60 seconds</div>
        </GlassCard>
      )}

      {!aiBrief.isPending && !brief && (
        <GlassCard style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 32 }}>✈️</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No brief yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click Generate Brief to create an AI travel brief</div>
        </GlassCard>
      )}

      {brief && !aiBrief.isPending && (
        <>
          {brief.weather_summary && (
            <GlassCard style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-cyan)', marginBottom: 10 }}>Weather</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{brief.weather_summary}</p>
            </GlassCard>
          )}

          {brief.budget_notes && (
            <GlassCard style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', marginBottom: 10 }}>Budget Notes</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{brief.budget_notes}</p>
            </GlassCard>
          )}

          {brief.activity_suggestions?.length > 0 && (
            <GlassCard style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: 10 }}>Activity Suggestions</div>
              {brief.activity_suggestions.map((s, i) => (
                <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-muted)', fontSize: 11, marginRight: 8 }}>D{s.day}</span>
                  {s.suggestion}
                </div>
              ))}
            </GlassCard>
          )}

          {brief.packing_list?.length > 0 && (
            <GlassCard style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#10b981', marginBottom: 10 }}>Suggested Packing</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {brief.packing_list.map((p, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20,
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    color: 'var(--text-secondary)',
                  }}>
                    {p.item}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}

          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>
            Generated {new Date(brief.generated_at).toLocaleString()}
          </div>
        </>
      )}
    </div>
  )
}
