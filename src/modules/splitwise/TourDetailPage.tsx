import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, Plus, Trash2, Copy, Check, ArrowRight, Lock, Unlock, Users, Receipt, TrendingUp, LayoutDashboard, Tag, X, Settings2, Pencil, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { splitwiseApi, type SplitParticipant, type SplitExpense, type TourDetail } from '../../api/splitwise'
import { TourFormModal } from './SplitWisePage'

const PUBLIC_APP_ORIGIN = 'https://jasonlee96.github.io/Smiley-web'

function usePublicBase() {
  return PUBLIC_APP_ORIGIN
}

const SUGGESTED_CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Drinks', 'Tickets', 'Misc']

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#f59e0b', Transport: '#06b6d4', Accommodation: '#8b5cf6',
  Activities: '#10b981', Shopping: '#ec4899', Drinks: '#f97316',
  Tickets: '#3b82f6', Misc: '#6b7280',
}
function catColor(cat: string) { return CATEGORY_COLORS[cat] ?? '#94a3b8' }

function fmt(amount: number | string, currency?: string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${currency ?? ''} ${n.toFixed(2)}`.trim()
}

function fallbackCopy(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
        color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
      }}
      title="Copy URL"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ParticipantRow({ p, tourId, baseCurrency }: { p: SplitParticipant; tourId: number; baseCurrency: string }) {
  const qc = useQueryClient()
  const publicBase = usePublicBase()
  const remove = useMutation({
    mutationFn: () => splitwiseApi.removeParticipant(tourId, p.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['split-tour', tourId] }),
  })
  const url = `${publicBase}/#/public/split/${p.token}`
  const paid = parseFloat(p.total_paid_base ?? '0')

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--accent-cyan-dim)', border: '1px solid var(--border-active)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--accent-cyan)',
      }}>
        {p.name[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
            {url}
          </span>
          <CopyButton text={url} />
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: paid > 0 ? 'var(--accent-green)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {baseCurrency} {paid.toFixed(2)}
      </span>
      <button
        className="btn-ghost"
        style={{ padding: '4px 8px', color: 'var(--accent-red)' }}
        onClick={() => { if (confirm(`Remove ${p.name}?`)) remove.mutate() }}
        disabled={remove.isPending}
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function ExpenseRow({ e, baseCurrency, showDate = false }: { e: SplitExpense; baseCurrency: string; showDate?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)',
    }}>
      {e.category && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: catColor(e.category),
        }} />
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>{e.description}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>by {e.participant_name}</span>
        {showDate && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
            {new Date(expenseDay(e)).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
        {e.category && (
          <span style={{
            marginLeft: 8, fontSize: 11, padding: '1px 7px', borderRadius: 4,
            background: `${catColor(e.category)}18`,
            border: `1px solid ${catColor(e.category)}44`,
            color: catColor(e.category),
          }}>{e.category}</span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{fmt(e.amount, e.currency)}</div>
        {e.amount_base && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {e.currency !== baseCurrency ? '≈ ' : ''}{fmt(e.amount_base, baseCurrency)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Categories config panel ───────────────────────────────────────────────────

function CategoriesPanel({ tour }: { tour: TourDetail }) {
  const qc = useQueryClient()
  const [newCat, setNewCat] = useState('')

  const save = (cats: string[]) => {
    splitwiseApi.updateTour(tour.id, { allowed_categories: cats })
      .then(() => { qc.invalidateQueries({ queryKey: ['split-tour', tour.id] }); qc.invalidateQueries({ queryKey: ['split-tours'] }) })
  }

  const toggle = (c: string) => {
    const cats = tour.allowed_categories ?? []
    save(cats.includes(c) ? cats.filter(x => x !== c) : [...cats, c])
  }

  const addCustom = () => {
    const v = newCat.trim()
    if (v && !(tour.allowed_categories ?? []).includes(v)) {
      save([...(tour.allowed_categories ?? []), v])
    }
    setNewCat('')
  }

  const cats = tour.allowed_categories ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Preset Categories
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUGGESTED_CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => toggle(c)}
              style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${cats.includes(c) ? catColor(c) : 'var(--border)'}`,
                background: cats.includes(c) ? `${catColor(c)}18` : 'transparent',
                color: cats.includes(c) ? catColor(c) : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {cats.includes(c) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: catColor(c), flexShrink: 0 }} />}
              {c}
            </button>
          ))}
        </div>
      </div>

      {cats.filter(c => !SUGGESTED_CATEGORIES.includes(c)).length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Custom Categories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cats.filter(c => !SUGGESTED_CATEGORIES.includes(c)).map(c => (
              <span key={c} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--accent-amber)',
              }}>
                <Tag size={11} />{c}
                <button onClick={() => save(cats.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Add custom category…"
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
        />
        <button className="btn-ghost" onClick={addCustom} disabled={!newCat.trim()}>Add</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -4 }}>
        {cats.length === 0 ? 'No categories configured — participants can free-type or leave blank.' : `${cats.length} categories active. Participants will choose from these when adding expenses.`}
      </div>
    </div>
  )
}

function SettlementPanel({ tourId, baseCurrency, participants }: { tourId: number; baseCurrency: string; participants: SplitParticipant[] }) {
  const qc = useQueryClient()
  const paxNames = participants.map(p => p.name)

  // Manual record payment form state
  const [showForm, setShowForm] = useState(false)
  const [formFrom, setFormFrom] = useState(paxNames[0] ?? '')
  const [formTo, setFormTo] = useState(paxNames[1] ?? paxNames[0] ?? '')
  const [formAmount, setFormAmount] = useState('')

  const { data: calc, isLoading: calcLoading } = useQuery({
    queryKey: ['split-settlement', tourId],
    queryFn: () => splitwiseApi.getSettlement(tourId),
  })
  const { data: records = [], isLoading: recLoading } = useQuery({
    queryKey: ['split-settlement-records', tourId],
    queryFn: () => splitwiseApi.listSettlements(tourId),
  })

  const createRec = useMutation({
    mutationFn: (t: { from: string; to: string; amount: number }) =>
      splitwiseApi.createSettlement(tourId, { from_name: t.from, to_name: t.to, amount: t.amount, currency: baseCurrency }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['split-settlement-records', tourId] }),
  })
  const markRec = useMutation({
    mutationFn: ({ sid, settled }: { sid: number; settled: boolean }) =>
      splitwiseApi.markSettlement(tourId, sid, settled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['split-settlement-records', tourId] }),
  })
  const deleteRec = useMutation({
    mutationFn: (sid: number) => splitwiseApi.deleteSettlement(tourId, sid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['split-settlement-records', tourId] }),
  })

  if (calcLoading || recLoading) return <div style={{ padding: 20, textAlign: 'center' }}><Spinner /></div>
  if (!calc) return null

  // Adjust balances by settled payments — each settled record shifts balance between payer/receiver
  const adjustedBalances = calc.balances.map(b => ({ ...b }))
  for (const r of records) {
    if (!r.settled) continue
    const amt = parseFloat(r.amount)
    const from = adjustedBalances.find(b => b.name === r.from_name)
    const to   = adjustedBalances.find(b => b.name === r.to_name)
    if (from) from.balance = parseFloat((from.balance + amt).toFixed(4))
    if (to)   to.balance   = parseFloat((to.balance   - amt).toFixed(4))
  }

  // Re-run greedy settlement on adjusted balances to get remaining transfers
  const adjCred = adjustedBalances.filter(b => b.balance > 0.005).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance)
  const adjDebt = adjustedBalances.filter(b => b.balance < -0.005).map(b => ({ ...b })).sort((a, b) => a.balance - b.balance)
  const remainingTxns: Array<{ from: string; to: string; amount: number }> = []
  let _ci = 0, _di = 0
  while (_ci < adjCred.length && _di < adjDebt.length) {
    const c = adjCred[_ci], d = adjDebt[_di]
    const amt = parseFloat(Math.min(c.balance, -d.balance).toFixed(4))
    remainingTxns.push({ from: d.name, to: c.name, amount: amt })
    c.balance -= amt; d.balance += amt
    if (c.balance < 0.005) _ci++
    if (d.balance > -0.005) _di++
  }

  const settledAmount = records.filter(r => r.settled).reduce((s, r) => s + parseFloat(r.amount), 0)
  const recordedKeys = new Set(records.map(r => `${r.from_name}→${r.to_name}`))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Record Payment — top, always visible */}
      {paxNames.length >= 2 && (
        showForm ? (
          <GlassCard style={{ padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Record Payment</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>FROM (payer)</span>
                  <select className="input" value={formFrom} onChange={e => setFormFrom(e.target.value)}>
                    {paxNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 18 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>TO (receiver)</span>
                  <select className="input" value={formTo} onChange={e => setFormTo(e.target.value)}>
                    {paxNames.filter(n => n !== formFrom).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AMOUNT ({baseCurrency})</span>
                  <input className="input" type="number" min={0} step={0.01} placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
                </div>
                <button
                  className="btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                  disabled={!formFrom || !formTo || formFrom === formTo || !formAmount || parseFloat(formAmount) <= 0 || createRec.isPending}
                  onClick={() => { createRec.mutate({ from: formFrom, to: formTo, amount: parseFloat(formAmount) }); setFormAmount(''); setShowForm(false) }}
                >
                  Save
                </button>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </GlassCard>
        ) : (
          <button
            className="btn-primary"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowForm(true)}
          >
            <Plus size={13} /> Record Payment
          </button>
        )
      )}

      {/* Balances — adjusted by settled payments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Outstanding Balances
          </div>
          {settledAmount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>
              {baseCurrency} {settledAmount.toFixed(2)} settled
            </span>
          )}
        </div>
        {adjustedBalances.map(b => {
          const original = calc.balances.find(x => x.id === b.id)
          const changed = original && Math.abs(original.balance - b.balance) > 0.005
          return (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                  paid {baseCurrency} {b.paid.toFixed(2)} · share {baseCurrency} {b.share.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {changed && original && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                    {original.balance >= 0 ? '+' : ''}{original.balance.toFixed(2)}
                  </span>
                )}
                <span style={{ fontWeight: 700, fontSize: 14, color: Math.abs(b.balance) < 0.005 ? 'var(--accent-green)' : b.balance >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>
                  {Math.abs(b.balance) < 0.005 ? 'Settled' : `${b.balance >= 0 ? '+' : ''}${baseCurrency} ${b.balance.toFixed(2)}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Remaining transfers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remaining Transfers</div>
        {remainingTxns.length === 0 ? (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: 'var(--accent-green)' }}>
            All settled — no transfers needed.
          </div>
        ) : remainingTxns.map((t, i) => {
          const key = `${t.from}→${t.to}`
          const alreadyTracked = recordedKeys.has(key)
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-red)' }}>{t.from}</span>
              <ArrowRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-green)' }}>{t.to}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 14, color: 'var(--accent-amber)', marginRight: 8 }}>
                {baseCurrency} {t.amount.toFixed(2)}
              </span>
              {!alreadyTracked && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '3px 10px', whiteSpace: 'nowrap' }}
                  onClick={() => createRec.mutate({ from: t.from, to: t.to, amount: t.amount })}
                  disabled={createRec.isPending}
                >
                  Track
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Tracked payment records */}
      {records.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Records</div>
          {records.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 8,
              background: r.settled ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)',
              border: `1px solid ${r.settled ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
              opacity: r.settled ? 0.8 : 1,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: r.settled ? 'var(--text-muted)' : 'var(--accent-red)', textDecoration: r.settled ? 'line-through' : 'none' }}>{r.from_name}</span>
                  <ArrowRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: r.settled ? 'var(--text-muted)' : 'var(--accent-green)', textDecoration: r.settled ? 'line-through' : 'none' }}>{r.to_name}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: r.settled ? 'var(--text-muted)' : 'var(--accent-amber)' }}>
                    {r.currency} {parseFloat(r.amount).toFixed(2)}
                  </span>
                </div>
                {r.settled && r.settled_at && (
                  <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 3 }}>
                    Paid {new Date(r.settled_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
              <button
                className={r.settled ? 'btn-ghost' : 'btn-primary'}
                style={{ fontSize: 11, padding: '4px 12px', whiteSpace: 'nowrap' }}
                onClick={() => markRec.mutate({ sid: r.id, settled: !r.settled })}
                disabled={markRec.isPending}
              >
                {r.settled ? 'Undo' : '✓ Mark Paid'}
              </button>
              <button
                className="btn-ghost"
                style={{ padding: '4px 8px', color: 'var(--accent-red)', borderColor: 'transparent' }}
                onClick={() => deleteRec.mutate(r.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// ── Dashboard Panel ───────────────────────────────────────────────────────────

function expenseDay(e: SplitExpense) {
  return e.expense_date ? e.expense_date.slice(0, 10) : e.created_at.slice(0, 10)
}

function buildDayData(expenses: SplitExpense[], startDate: string | null, endDate: string | null) {
  const startKey = startDate ? new Date(startDate).toISOString().slice(0, 10) : null
  const byDate: Record<string, number> = {}
  let preTourTotal = 0
  for (const e of expenses) {
    const d = expenseDay(e)
    const amt = e.amount_base ? parseFloat(e.amount_base) : 0
    if (startKey && d < startKey) {
      preTourTotal += amt
    } else {
      byDate[d] = (byDate[d] ?? 0) + amt
    }
  }

  if (startDate) {
    // Generate full day range even for zero-spend days
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(Math.max(...Object.keys(byDate).map(d => new Date(d).getTime()), start.getTime()))
    const days: { label: string; total: number; date: string }[] = []
    if (preTourTotal > 0) {
      days.push({ label: 'D0', total: parseFloat(preTourTotal.toFixed(2)), date: 'Pre-Tour' })
    }
    let d = new Date(start), day = 1
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ label: `D${day}`, total: parseFloat((byDate[dateStr] ?? 0).toFixed(2)), date: dateStr })
      d.setDate(d.getDate() + 1)
      day++
      if (day > 60) break
    }
    return days
  }

  // No dates — just use what expenses exist
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total], i) => ({
      label: `D${i + 1}`,
      total: parseFloat(total.toFixed(2)),
      date,
    }))
}

function DashboardPanel({ tour }: { tour: TourDetail }) {
  const { base_currency: base, participants, expenses } = tour

  const { data: settlementRecords = [] } = useQuery({
    queryKey: ['split-settlement-records', tour.id],
    queryFn: () => splitwiseApi.listSettlements(tour.id),
  })

  const totalBase = participants.reduce((s, p) => s + parseFloat(p.total_paid_base ?? '0'), 0)
  const share = participants.length > 0 ? totalBase / participants.length : 0
  const maxPaid = Math.max(...participants.map(p => parseFloat(p.total_paid_base ?? '0')), share, 0.01)

  // Currency breakdown
  const byCurrency: Record<string, number> = {}
  for (const e of expenses) {
    byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + parseFloat(e.amount as string)
  }
  const currencyEntries = Object.entries(byCurrency).sort((a, b) => b[1] - a[1])

  // Settlement-adjusted balances
  const rawBalances = participants.map(p => ({
    name: p.name,
    balance: parseFloat((parseFloat(p.total_paid_base ?? '0') - share).toFixed(4)),
  }))
  for (const r of settlementRecords) {
    if (!r.settled) continue
    const amt = parseFloat(r.amount)
    const from = rawBalances.find(b => b.name === r.from_name)
    const to   = rawBalances.find(b => b.name === r.to_name)
    if (from) from.balance = parseFloat((from.balance + amt).toFixed(4))
    if (to)   to.balance   = parseFloat((to.balance   - amt).toFixed(4))
  }
  const creditors = rawBalances.filter(b => b.balance > 0.005).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance)
  const debtors   = rawBalances.filter(b => b.balance < -0.005).map(b => ({ ...b })).sort((a, b) => a.balance - b.balance)
  const txns: Array<{ from: string; to: string; amount: number }> = []
  let ci = 0, di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci], d = debtors[di]
    const amt = parseFloat(Math.min(c.balance, -d.balance).toFixed(4))
    txns.push({ from: d.name, to: c.name, amount: amt })
    c.balance -= amt; d.balance += amt
    if (c.balance < 0.005) ci++
    if (d.balance > -0.005) di++
  }

  const statStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '16px 20px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={statStyle}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Spend</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--text-primary)' }}>{base} {totalBase.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{expenses.length} expenses</div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Per Person</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--accent-cyan)' }}>{base} {share.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{participants.length} participants</div>
        </div>
        <div style={statStyle}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transfers Needed</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: txns.length === 0 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
            {txns.length === 0 ? 'All clear' : `${txns.length} txn${txns.length > 1 ? 's' : ''}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>to settle up</div>
        </div>
      </div>

      {/* Day-by-day bar chart */}
      {expenses.length > 0 && (() => {
        const dayData = buildDayData(expenses, tour.start_date, tour.end_date)
        if (dayData.length === 0) return null
        const maxVal = Math.max(...dayData.map(d => d.total), 0.01)
        return (
          <GlassCard style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Spend by Day ({base})
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dayData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                <Tooltip
                  cursor={{ fill: 'rgba(6,182,212,0.06)' }}
                  contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                  formatter={(val: number) => [`${base} ${val.toFixed(2)}`, 'Spend']}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {dayData.map((d, i) => (
                    <Cell key={i} fill={d.total >= maxVal * 0.8 ? '#06b6d4' : d.total === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(6,182,212,0.45)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Day legend */}
            {dayData.length <= 14 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 10 }}>
                {dayData.map(d => (
                  <span key={d.date} style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {d.label}: {d.date === 'Pre-Tour' ? 'Pre-Tour' : new Date(d.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>
        )
      })()}

      {/* Per-participant bars */}
      {participants.length > 0 && (
        <GlassCard style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Paid vs Fair Share
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {participants.map(p => {
              const paid = parseFloat(p.total_paid_base ?? '0')
              const bal = paid - share
              const barPct = Math.min((paid / maxPaid) * 100, 100)
              const sharePct = Math.min((share / maxPaid) * 100, 100)
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{base} {paid.toFixed(2)} paid</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: bal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {bal >= 0 ? '+' : ''}{base} {bal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    {/* paid bar */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, height: '100%',
                      width: `${barPct}%`,
                      background: bal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      borderRadius: 4, transition: 'width 0.4s ease',
                    }} />
                    {/* share marker */}
                    <div style={{
                      position: 'absolute', top: 0, height: '100%',
                      left: `${sharePct}%`,
                      width: 2, background: 'var(--accent-cyan)', opacity: 0.8,
                    }} />
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 2, background: 'var(--accent-cyan)' }} />
              Fair share line
            </div>
          </div>
        </GlassCard>
      )}

      {/* Currency breakdown */}
      {currencyEntries.length > 0 && (
        <GlassCard style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Expenses by Currency
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {currencyEntries.map(([currency, amount]) => {
              const pct = expenses.length > 0
                ? (expenses.filter(e => e.currency === currency).length / expenses.length) * 100
                : 0
              return (
                <div key={currency}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{currency}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {currency} {amount.toFixed(2)}
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                        {expenses.filter(e => e.currency === currency).length} expense{expenses.filter(e => e.currency === currency).length !== 1 ? 's' : ''}
                      </span>
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: 'var(--accent-cyan)', borderRadius: 3,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* Category breakdown */}
      {expenses.some(e => e.category) && (() => {
        const byCat: Record<string, { count: number; baseTotal: number }> = {}
        for (const e of expenses) {
          const cat = e.category ?? 'Uncategorised'
          if (!byCat[cat]) byCat[cat] = { count: 0, baseTotal: 0 }
          byCat[cat].count++
          byCat[cat].baseTotal += e.amount_base ? parseFloat(e.amount_base) : 0
        }
        const catEntries = Object.entries(byCat).sort((a, b) => b[1].baseTotal - a[1].baseTotal)
        const maxBase = catEntries[0]?.[1].baseTotal ?? 1
        return (
          <GlassCard style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Spend by Category
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {catEntries.map(([cat, { count, baseTotal }]) => {
                const color = catColor(cat)
                const pct = (baseTotal / maxBase) * 100
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        {cat}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {base} {baseTotal.toFixed(2)}
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{count} item{count !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )
      })()}

      {/* Quick settlement */}
      {txns.length > 0 && (
        <GlassCard style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Settlement
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {txns.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-red)' }}>{t.from}</span>
                <ArrowRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-green)' }}>{t.to}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 14, color: 'var(--accent-amber)' }}>
                  {base} {t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {totalBase === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No expenses yet — add participants and share their unique links.
        </div>
      )}
    </div>
  )
}

// ── Expenses grouped by date ─────────────────────────────────────────────────

function ExpensesGrouped({ expenses, baseCurrency, startDate, endDate }: {
  expenses: SplitExpense[]; baseCurrency: string; startDate: string | null; endDate: string | null
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (expenses.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No expenses recorded yet.</div>
  )

  // Build day labels from tour date range if available
  const dayMap = new Map<string, number>()  // date → day number
  if (startDate) {
    const start = new Date(startDate)
    let d = new Date(start)
    let day = 1
    const end = endDate ? new Date(endDate) : null
    while (!end || d <= end) {
      dayMap.set(d.toISOString().slice(0, 10), day++)
      d.setDate(d.getDate() + 1)
      if (!end && day > 60) break  // safety limit
    }
  }

  // Normalize startDate to YYYY-MM-DD for comparison (API returns full ISO timestamp)
  const startKey = startDate ? new Date(startDate).toISOString().slice(0, 10) : null

  // Group expenses by expense_date (fallback to created_at); any date before
  // startDate collapses into one "Day 0" bucket regardless of its real date
  const DAY_ZERO_KEY = '__day_zero__'
  const grouped = new Map<string, SplitExpense[]>()
  for (const e of expenses) {
    const day = expenseDay(e)
    const key = startKey && day < startKey ? DAY_ZERO_KEY : day
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(e)
  }
  const sortedDates = [...grouped.keys()].sort((a, b) => {
    if (a === DAY_ZERO_KEY) return -1
    if (b === DAY_ZERO_KEY) return 1
    return a.localeCompare(b)
  })

  const toggle = (d: string) => setCollapsed(prev => {
    const next = new Set(prev)
    next.has(d) ? next.delete(d) : next.add(d)
    return next
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sortedDates.map(date => {
        const dayExpenses = grouped.get(date)!
        const dayTotal = dayExpenses.reduce((s, e) => s + (e.amount_base ? parseFloat(e.amount_base) : 0), 0)
        const isDayZero = date === DAY_ZERO_KEY
        const dayNum = isDayZero ? null : dayMap.get(date)
        const label = isDayZero
          ? 'Day 0 · Pre-Tour'
          : dayNum
          ? `Day ${dayNum} — ${new Date(date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}`
          : new Date(date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
        const isCollapsed = collapsed.has(date)

        return (
          <div key={date}>
            <button
              onClick={() => toggle(date)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isCollapsed ? <ChevronRightIcon size={13} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />}
                <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dayExpenses.length} expense{dayExpenses.length !== 1 ? 's' : ''}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {baseCurrency} {dayTotal.toFixed(2)}
              </span>
            </button>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
                {dayExpenses.map(e => <ExpenseRow key={e.id} e={e} baseCurrency={baseCurrency} showDate={isDayZero} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

type Tab = 'dashboard' | 'participants' | 'expenses' | 'settlement' | 'categories'

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const tourId = parseInt(id!)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [newPax, setNewPax] = useState('')
  const [addingPax, setAddingPax] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: tour, isLoading } = useQuery({
    queryKey: ['split-tour', tourId],
    queryFn: () => splitwiseApi.getTour(tourId),
  })

  const addPax = useMutation({
    mutationFn: () => splitwiseApi.addParticipant(tourId, newPax.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['split-tour', tourId] }); setNewPax(''); setAddingPax(false) },
  })

  const toggleStatus = useMutation({
    mutationFn: () => splitwiseApi.updateTour(tourId, { status: tour?.status === 'active' ? 'closed' : 'active' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['split-tour', tourId] }); qc.invalidateQueries({ queryKey: ['split-tours'] }) },
  })

  const deleteTour = useMutation({
    mutationFn: () => splitwiseApi.deleteTour(tourId),
    onSuccess: () => navigate('/splitwise'),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
  if (!tour) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Tour not found.</div>

  const TABS: Array<{ key: Tab; label: string; icon: typeof Users }> = [
    { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
    { key: 'participants', label: 'Participants',  icon: Users },
    { key: 'expenses',     label: 'Expenses',      icon: Receipt },
    { key: 'settlement',   label: 'Settlement',    icon: TrendingUp },
    { key: 'categories',   label: 'Categories',    icon: Settings2 },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate('/splitwise')}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{tour.name}</h1>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
              background: tour.status === 'active' ? 'var(--accent-cyan-dim)' : 'rgba(255,255,255,0.04)',
              color: tour.status === 'active' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: `1px solid ${tour.status === 'active' ? 'var(--border-active)' : 'var(--border)'}`,
              textTransform: 'uppercase',
            }}>
              {tour.status}
            </span>
          </div>
          {tour.description && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{tour.description}</p>}
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            {(tour.start_date || tour.end_date) && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {tour.start_date ? new Date(tour.start_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
                {' – '}
                {tour.end_date ? new Date(tour.end_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'}
              </span>
            )}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Base: <strong style={{ color: 'var(--text-secondary)' }}>{tour.base_currency}</strong></span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Currencies: <strong style={{ color: 'var(--text-secondary)' }}>{tour.allowed_currencies.join(', ')}</strong></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={() => setShowEdit(true)}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={() => toggleStatus.mutate()}
            disabled={toggleStatus.isPending}
          >
            {tour.status === 'active' ? <><Lock size={13} /> Close</> : <><Unlock size={13} /> Reopen</>}
          </button>
          <button
            className="btn-ghost"
            style={{ color: 'var(--accent-red)' }}
            onClick={() => { if (confirm('Delete this tour and all data?')) deleteTour.mutate() }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showEdit && <TourFormModal mode="edit" existing={tour} onClose={() => setShowEdit(false)} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 18px',
              fontSize: 13, fontWeight: 500,
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${tab === key ? 'var(--accent-cyan)' : 'transparent'}`,
              color: tab === key ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Dashboard tab */}
      {tab === 'dashboard' && <DashboardPanel tour={tour} />}

      {/* Participants tab */}
      {tab === 'participants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tour.participants.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No participants yet.</div>
          )}
          {tour.participants.map(p => (
            <ParticipantRow key={p.id} p={p} tourId={tourId} baseCurrency={tour.base_currency} />
          ))}

          {tour.status === 'active' && (
            addingPax ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Participant name (becomes their link)"
                    value={newPax}
                    onChange={e => { setNewPax(e.target.value); }}
                    onKeyDown={e => e.key === 'Enter' && newPax.trim() && addPax.mutate()}
                    autoFocus
                  />
                  <button className="btn-primary" disabled={!newPax.trim() || addPax.isPending} onClick={() => addPax.mutate()}>
                    {addPax.isPending ? '…' : 'Add'}
                  </button>
                  <button className="btn-ghost" onClick={() => { setAddingPax(false); setNewPax(''); }}>Cancel</button>
                </div>
                {newPax.trim() && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>
                    Link will be: <span style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                      /public/split/{newPax.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}
                    </span>
                  </div>
                )}
                {addPax.isError && (
                  <div style={{ fontSize: 12, color: 'var(--accent-red)', paddingLeft: 2 }}>
                    {(addPax.error as any)?.response?.data?.error ?? 'Failed to add participant'}
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, alignSelf: 'flex-start' }}
                onClick={() => setAddingPax(true)}
              >
                <Plus size={13} /> Add Participant
              </button>
            )
          )}
        </div>
      )}

      {/* Expenses tab — grouped by date */}
      {tab === 'expenses' && <ExpensesGrouped expenses={tour.expenses} baseCurrency={tour.base_currency} startDate={tour.start_date} endDate={tour.end_date} />}

      {/* Settlement tab */}
      {tab === 'settlement' && (
        <SettlementPanel tourId={tourId} baseCurrency={tour.base_currency} participants={tour.participants} />
      )}

      {/* Categories tab */}
      {tab === 'categories' && <CategoriesPanel tour={tour} />}
    </div>
  )
}
