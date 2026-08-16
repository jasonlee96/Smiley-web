import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Receipt, Users, ChevronRight, Lock, Unlock, X, Tag, Calendar } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { splitwiseApi, type SplitTour } from '../../api/splitwise'

const COMMON_CURRENCIES = ['SGD', 'MYR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'THB', 'IDR', 'HKD', 'CHF', 'HUF']
const SUGGESTED_CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Drinks', 'Tickets', 'Misc']

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border)'}`,
      background: active ? 'var(--accent-cyan-dim)' : 'transparent',
      color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
    }}>
      {label}
    </button>
  )
}

interface TourFormModalProps {
  mode: 'create'
  onClose: () => void
  existing?: undefined
}
interface TourEditModalProps {
  mode: 'edit'
  existing: SplitTour
  onClose: () => void
}

export function TourFormModal({ mode, existing, onClose }: TourFormModalProps | TourEditModalProps) {
  const qc = useQueryClient()
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [baseCurrency, setBaseCurrency] = useState(existing?.base_currency ?? 'SGD')
  const [allowedCurrencies, setAllowedCurrencies] = useState<string[]>(existing?.allowed_currencies ?? ['SGD', 'MYR'])
  const [categories, setCategories] = useState<string[]>(existing?.allowed_categories ?? [...SUGGESTED_CATEGORIES])
  const [startDate, setStartDate] = useState(existing?.start_date?.slice(0, 10) ?? '')
  const [endDate, setEndDate] = useState(existing?.end_date?.slice(0, 10) ?? '')
  const [customCat, setCustomCat] = useState('')

  const create = useMutation({
    mutationFn: () => splitwiseApi.createTour({
      name, description: description || undefined,
      base_currency: baseCurrency,
      allowed_currencies: allowedCurrencies,
      allowed_categories: categories,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['split-tours'] }); onClose() },
  })

  const update = useMutation({
    mutationFn: () => splitwiseApi.updateTour(existing!.id, {
      name, description: description || undefined,
      base_currency: baseCurrency,
      allowed_currencies: allowedCurrencies,
      allowed_categories: categories,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['split-tours'] })
      qc.invalidateQueries({ queryKey: ['split-tour', existing!.id] })
      onClose()
    },
  })

  const isPending = create.isPending || update.isPending

  const addCustomCat = () => {
    const v = customCat.trim()
    if (v && !categories.includes(v)) setCategories(p => [...p, v])
    setCustomCat('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      overflowY: 'auto',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <GlassCard style={{ width: '100%', maxWidth: 520, padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
            {mode === 'create' ? 'New Tour' : `Edit — ${existing!.name}`}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tour Name</span>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Japan Trip 2026" autoFocus />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</span>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
            </label>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</span>
                <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</span>
                <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Currency</span>
              <select className="input" value={baseCurrency} onChange={e => { setBaseCurrency(e.target.value); if (!allowedCurrencies.includes(e.target.value)) setAllowedCurrencies(p => [...p, e.target.value]) }}>
                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allowed Currencies</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {COMMON_CURRENCIES.map(c => (
                  <ChipToggle key={c} label={c} active={allowedCurrencies.includes(c)}
                    onClick={() => setAllowedCurrencies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expense Categories</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTED_CATEGORIES.map(c => (
                  <ChipToggle key={c} label={c} active={categories.includes(c)}
                    onClick={() => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} />
                ))}
              </div>
              {categories.filter(c => !SUGGESTED_CATEGORIES.includes(c)).map(c => (
                <span key={c} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: 600, background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.4)', color: 'var(--accent-amber)', width: 'fit-content',
                }}>
                  <Tag size={10} />{c}
                  <button onClick={() => setCategories(prev => prev.filter(x => x !== c))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, marginLeft: 2 }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Add custom category…" value={customCat}
                  onChange={e => setCustomCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomCat()} />
                <button className="btn-ghost" onClick={addCustomCat} disabled={!customCat.trim()}>Add</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }}
                disabled={!name || allowedCurrencies.length === 0 || isPending}
                onClick={() => mode === 'create' ? create.mutate() : update.mutate()}>
                {isPending ? (mode === 'create' ? 'Creating…' : 'Saving…') : (mode === 'create' ? 'Create Tour' : 'Save Changes')}
              </button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

function TourCard({ tour }: { tour: SplitTour }) {
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)

  return (
    <>
      <GlassCard
        className="hover-lift"
        style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
        onClick={() => navigate(`/internal/splitwise/${tour.id}`)}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: tour.status === 'active' ? 'var(--accent-cyan-dim)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${tour.status === 'active' ? 'var(--border-active)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {tour.status === 'active'
            ? <Unlock size={18} style={{ color: 'var(--accent-cyan)' }} />
            : <Lock size={18} style={{ color: 'var(--text-muted)' }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{tour.name}</div>
          {tour.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{tour.description}</div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            {(tour.start_date || tour.end_date) && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} />
                {fmtDate(tour.start_date)}{tour.end_date ? ` – ${fmtDate(tour.end_date)}` : ''}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={11} /> {tour.participant_count ?? 0} pax
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Receipt size={11} /> {tour.expense_count ?? 0} expenses
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Base: {tour.base_currency}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn-ghost"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); setShowEdit(true) }}
          >
            Edit
          </button>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
            background: tour.status === 'active' ? 'var(--accent-cyan-dim)' : 'rgba(255,255,255,0.04)',
            color: tour.status === 'active' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: `1px solid ${tour.status === 'active' ? 'var(--border-active)' : 'var(--border)'}`,
            textTransform: 'uppercase',
          }}>
            {tour.status}
          </span>
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </GlassCard>

      {showEdit && <TourFormModal mode="edit" existing={tour} onClose={() => setShowEdit(false)} />}
    </>
  )
}

export default function SplitWisePage() {
  const [showCreate, setShowCreate] = useState(false)
  const { data: tours, isLoading } = useQuery({ queryKey: ['split-tours'], queryFn: splitwiseApi.listTours })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Tour Splitter</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Create tours, invite pax, track shared expenses</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Tour
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : !tours?.length ? (
        <GlassCard style={{ padding: 48, textAlign: 'center' }}>
          <Receipt size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-muted)' }}>No tours yet. Create one to get started.</p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tours.map(t => <TourCard key={t.id} tour={t} />)}
        </div>
      )}

      {showCreate && <TourFormModal mode="create" onClose={() => setShowCreate(false)} />}
    </div>
  )
}
