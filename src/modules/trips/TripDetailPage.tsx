import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pencil, FileDown, Sparkles } from 'lucide-react'
import Spinner from '../../components/Spinner'
import { useTrip, usePatchTripStatus, useAiEnrich } from '../../hooks/useTrips'
import TripFormModal from './TripFormModal'
import ItineraryTab from './tabs/ItineraryTab'
import AccommodationTab from './tabs/AccommodationTab'
import MapTab from './tabs/MapTab'
import BudgetTab from './tabs/BudgetTab'
import PackingTab from './tabs/PackingTab'
import BriefTab from './tabs/BriefTab'
import ChatTab from './tabs/ChatTab'
import type { Trip, TripStatus } from '../../types/trips'

type Tab = 'map' | 'itinerary' | 'accommodation' | 'budget' | 'packing' | 'brief' | 'chat'
const TABS: { id: Tab; label: string }[] = [
  { id: 'map',           label: 'Map' },
  { id: 'itinerary',     label: 'Itinerary' },
  { id: 'accommodation', label: 'Stay' },
  { id: 'budget',        label: 'Budget' },
  { id: 'packing',       label: 'Packing' },
  { id: 'brief',         label: 'Brief' },
  { id: 'chat',          label: 'Chat' },
]

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

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const tripId = parseInt(id ?? '0')
  const navigate = useNavigate()
  const { data: trip, isLoading, refetch } = useTrip(tripId)
  const patchStatus = usePatchTripStatus()
  const aiEnrich = useAiEnrich()
  const [tab, setTab] = useState<Tab>('itinerary')
  const [showEdit, setShowEdit] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)

  if (isLoading || !trip) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spinner size={28} />
      </div>
    )
  }

  const cfg = STATUS_CFG[trip.status] ?? STATUS_CFG.planning

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }} onClick={() => navigate('/internal/trips')}>
          <ChevronLeft size={16} /> Trips
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }}
            disabled={aiEnrich.isPending}
            onClick={() => aiEnrich.mutate(tripId)}
          >
            {aiEnrich.isPending ? <Spinner size={13} /> : <Sparkles size={13} />} Enrich Activities
          </button>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }} onClick={() => setShowEdit(true)}>
            <Pencil size={13} /> Edit
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 12px' }} onClick={() => setShowPdfModal(true)}>
            <FileDown size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Trip header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14, flexShrink: 0,
          background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 34,
        }}>
          {trip.cover_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {trip.name}
          </h1>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 3 }}>
            {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'IBM Plex Mono' }}>
            {fmtRange(trip.start_date, trip.end_date)} · {duration(trip.start_date, trip.end_date)}
          </div>
        </div>

        {/* Status badge (clickable dropdown) */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: cfg.color + '18', border: `1px solid ${cfg.color}44`,
              borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700,
              color: cfg.color, cursor: 'pointer',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
            {cfg.label}
          </button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 10, overflow: 'hidden', minWidth: 140,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }} onMouseLeave={() => setShowStatusMenu(false)}>
              {(Object.keys(STATUS_CFG) as TripStatus[]).map(s => (
                <button key={s} onClick={() => { patchStatus.mutate({ id: tripId, status: s }); setShowStatusMenu(false) }} style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                  fontSize: 13, color: STATUS_CFG[s].color, background: 'transparent', border: 'none',
                  cursor: 'pointer', fontWeight: trip.status === s ? 700 : 400,
                }}>
                  {STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 2, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'Inter',
            background: tab === t.id ? 'var(--accent-cyan-dim)' : 'transparent',
            color: tab === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'map'           && <MapTab trip={trip} />}
      {tab === 'itinerary'     && <ItineraryTab trip={trip} onRefetch={refetch} />}
      {tab === 'accommodation' && <AccommodationTab tripId={tripId} />}
      {tab === 'budget'        && <BudgetTab tripId={tripId} />}
      {tab === 'packing'       && <PackingTab tripId={tripId} />}
      {tab === 'brief'         && <BriefTab tripId={tripId} trip={trip} />}
      {tab === 'chat'          && <ChatTab tripId={tripId} />}

      {showEdit && (
        <TripFormModal trip={trip as any} onClose={() => { setShowEdit(false); refetch() }} />
      )}

      {showPdfModal && (
        <PdfExportModal trip={trip} onClose={() => setShowPdfModal(false)} />
      )}
    </div>
  )
}

function PdfExportModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [PdfLink, setPdfLink] = useState<any>(null)
  const [TripDoc, setTripDoc] = useState<any>(null)
  const [enrichedTrip, setEnrichedTrip] = useState<any>(null)

  async function prepare() {
    setState('loading')
    try {
      const { tripsApi } = await import('../../api/trips')
      const [{ PDFDownloadLink }, { TripPdfDocument }, packing, accommodations] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./TripPdfDocument'),
        tripsApi.getPacking(trip.id),
        tripsApi.getAccommodations(trip.id),
      ])
      let brief = null
      try { brief = await tripsApi.aiBrief(trip.id) } catch { /* brief is optional */ }
      setPdfLink(() => PDFDownloadLink)
      setTripDoc(() => TripPdfDocument)
      setEnrichedTrip({ ...trip, __packing: packing, __brief: brief, __accommodations: accommodations })
      setState('ready')
    } catch {
      setState('idle')
    }
  }

  const slug = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const filename = `${slug}-${trip.start_date.slice(0, 10)}.pdf`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 28, width: 360, textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{trip.cover_emoji}</div>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>{trip.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
          {state === 'idle' && 'PDF includes itinerary, AI brief, and packing list.'}
          {state === 'loading' && 'Fetching packing list and generating AI brief…'}
          {state === 'ready' && 'PDF ready to download.'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {state === 'idle' && (
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={prepare}>
              <FileDown size={14} /> Prepare PDF
            </button>
          )}
          {state === 'loading' && (
            <button className="btn-primary" disabled style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Spinner size={14} /> Preparing…
            </button>
          )}
          {state === 'ready' && PdfLink && TripDoc && enrichedTrip && (
            <PdfLink document={<TripDoc trip={enrichedTrip} />} fileName={filename} style={{ textDecoration: 'none' }}>
              {({ loading: pdfLoading }: { loading: boolean }) => (
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileDown size={14} /> {pdfLoading ? 'Building…' : 'Download PDF'}
                </button>
              )}
            </PdfLink>
          )}
        </div>
      </div>
    </div>
  )
}
