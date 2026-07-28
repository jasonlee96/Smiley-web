import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Receipt, Tag } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { publicSplitApi, type SplitExpense, type ParticipantContext, type PublicContext } from '../../api/splitwise'

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

// Build ordered list of day pills from tour dates
function buildDayPills(startDate: string | null, endDate: string | null): Array<{ label: string; date: string }> {
  if (!startDate) return []
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date(startDate)
  const pills: Array<{ label: string; date: string }> = []
  let d = new Date(start), day = 1
  while (d <= end && day <= 60) {
    pills.push({ label: `Day ${day}`, date: d.toISOString().slice(0, 10) })
    d.setDate(d.getDate() + 1)
    day++
  }
  return pills
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function AddExpenseForm({
  token,
  allowedCurrencies,
  allowedCategories,
  allParticipants,
  myName,
  baseCurrency,
  startDate,
  endDate,
  onDone,
}: {
  token: string
  allowedCurrencies: string[]
  allowedCategories: string[]
  allParticipants: string[]
  myName: string
  baseCurrency: string
  startDate: string | null
  endDate: string | null
  onDone: () => void
}) {
  const qc = useQueryClient()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(allowedCurrencies[0] ?? baseCurrency)
  const [category, setCategory] = useState('')
  const [splitWith, setSplitWith] = useState<string[]>(allParticipants)

  // Date: pills if tour has dates, otherwise manual input. A "Day 0" pill
  // covers pre-tour costs (flights, visas, insurance) paid on any real date
  // before startDate — it opens a free date field instead of a fixed pill date.
  const dayPills = buildDayPills(startDate, endDate)
  const today = todayStr()
  const dayBeforeStart = startDate ? addDays(startDate, -1) : null
  const isPreTour = !!startDate && today < startDate
  const defaultIsDayZero = dayPills.length > 0 && isPreTour
  const defaultDate = defaultIsDayZero
    ? today
    : dayPills.find(p => p.date === today)?.date
      ?? (dayPills.length > 0 ? dayPills[dayPills.length - 1].date : today)
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [dayZeroSelected, setDayZeroSelected] = useState(defaultIsDayZero)

  const todayPillRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    todayPillRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, inline: 'center', block: 'nearest' })
  }, [])

  const togglePax = (name: string) =>
    setSplitWith(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name])

  const add = useMutation({
    mutationFn: () =>
      publicSplitApi.addExpense(token, {
        description,
        amount: parseFloat(amount),
        currency,
        category: category || undefined,
        split_with: splitWith.length === allParticipants.length ? [] : splitWith,
        expense_date: selectedDate,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['split-public', token] })
      onDone()
    },
  })

  return (
    <GlassCard style={{ padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14 }}>New Expense</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input"
          placeholder="What did you pay for?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="number"
            placeholder="Amount"
            min={0}
            step={0.01}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ flex: 1 }}
          />
          <select className="input" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 100 }}>
            {allowedCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Date — pills if tour has dates, else manual picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
          {dayPills.length > 0 ? (
            <>
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                scrollbarWidth: 'none', msOverflowStyle: 'none',
              }}>
                <button
                  key="day-0"
                  type="button"
                  onClick={() => {
                    setDayZeroSelected(true)
                    if (!(startDate && selectedDate < startDate)) {
                      setSelectedDate(dayBeforeStart ?? today)
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${dayZeroSelected ? 'var(--accent-cyan)' : 'var(--border)'}`,
                    background: dayZeroSelected ? 'var(--accent-cyan-dim)' : 'transparent',
                    color: dayZeroSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Day 0</span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>Pre-Tour</span>
                </button>
                {dayPills.map((p, i) => {
                  const dateLabel = new Date(p.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
                  const isSelected = !dayZeroSelected && selectedDate === p.date
                  const isToday = p.date === today
                  return (
                    <button
                      key={p.date}
                      ref={isToday || (p.date === selectedDate && !dayZeroSelected && !dayPills.some(x => x.date === today)) ? todayPillRef : undefined}
                      type="button"
                      onClick={() => { setDayZeroSelected(false); setSelectedDate(p.date) }}
                      style={{
                        flexShrink: 0,
                        padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--accent-cyan)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--accent-cyan-dim)' : 'transparent',
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700 }}>Day {i + 1}</span>
                      <span style={{ fontSize: 10, opacity: 0.8 }}>{dateLabel}</span>
                      {isToday && <span style={{ fontSize: 8, color: 'var(--accent-cyan)', fontWeight: 700, marginTop: 1 }}>TODAY</span>}
                    </button>
                  )
                })}
              </div>
              {dayZeroSelected && (
                <input
                  className="input"
                  type="date"
                  value={selectedDate}
                  max={dayBeforeStart ?? undefined}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              )}
            </>
          ) : (
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          )}
        </div>

        {/* Category selector */}
        {allowedCategories.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allowedCategories.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c === category ? '' : c)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${category === c ? catColor(c) : 'var(--border)'}`,
                    background: category === c ? `${catColor(c)}20` : 'transparent',
                    color: category === c ? catColor(c) : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {category === c && <span style={{ width: 5, height: 5, borderRadius: '50%', background: catColor(c) }} />}
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Split with */}
        {allParticipants.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Split with ({splitWith.length === allParticipants.length ? 'everyone' : `${splitWith.length} of ${allParticipants.length}`})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allParticipants.map(name => {
                const isMe = name === myName
                const selected = splitWith.includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => !isMe && togglePax(name)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: isMe ? 'default' : 'pointer',
                      border: `1px solid ${selected ? 'var(--accent-cyan)' : 'var(--border)'}`,
                      background: selected ? 'var(--accent-cyan-dim)' : 'transparent',
                      color: selected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      opacity: isMe && !selected ? 0.5 : 1,
                    }}
                  >
                    {name}{isMe ? ' (you)' : ''}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onDone}>Cancel</button>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={!description || !amount || parseFloat(amount) <= 0 || splitWith.length === 0 || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'Saving…' : 'Add'}
          </button>
        </div>
        {add.isError && (
          <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>
            {(add.error as any)?.response?.data?.error ?? 'Failed to add expense'}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

function ExpenseRow({ expense, token, baseCurrency }: { expense: SplitExpense; token: string; baseCurrency: string }) {
  const qc = useQueryClient()
  const del = useMutation({
    mutationFn: () => publicSplitApi.deleteExpense(token, expense.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['split-public', token] }),
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)',
    }}>
      {expense.category && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          background: catColor(expense.category),
        }} />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{expense.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {new Date(expense.created_at).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
          {expense.split_with?.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              split w/ {expense.split_with.join(', ')}
            </span>
          )}
          {expense.category && (
            <span style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
              background: `${catColor(expense.category)}18`,
              border: `1px solid ${catColor(expense.category)}44`,
              color: catColor(expense.category),
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <Tag size={9} />{expense.category}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', marginRight: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(expense.amount, expense.currency)}</div>
        {expense.amount_base && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {expense.currency !== baseCurrency ? '≈ ' : ''}{fmt(expense.amount_base, baseCurrency)}
          </div>
        )}
      </div>
      <button
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}
        onClick={() => { if (confirm('Delete this expense?')) del.mutate() }}
        disabled={del.isPending}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function ParticipantPage() {
  const { token } = useParams<{ token: string }>()
  const [tab, setTab] = useState<'dashboard' | 'expenses'>('dashboard')
  const [adding, setAdding] = useState(false)

  const { data, isLoading, isError } = useQuery<PublicContext>({
    queryKey: ['split-public', token],
    queryFn: () => publicSplitApi.getContext(token!),
    enabled: !!token,
  })

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  if (isError || !data) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <Receipt size={32} style={{ color: 'var(--text-muted)' }} />
      <p style={{ color: 'var(--text-muted)' }}>This link is invalid or has expired.</p>
    </div>
  )

  const { participant, expenses, summary, my_transactions, my_settlements } = data
  const isClosed = participant.tour_status === 'closed'
  const base = participant.base_currency

  // Adjust balance by settled payments
  // settled from=me → I paid out → balance goes up (less debt / more credit)
  // settled to=me   → I received  → balance goes down (less credit)
  let adjustedBalance = summary.balance
  for (const r of my_settlements) {
    if (!r.settled) continue
    if (r.from_name === participant.name) adjustedBalance = parseFloat((adjustedBalance + r.amount).toFixed(4))
    else if (r.to_name === participant.name) adjustedBalance = parseFloat((adjustedBalance - r.amount).toFixed(4))
  }
  const fullySettled = Math.abs(adjustedBalance) < 0.005

  // Category breakdown from own expenses
  const byCat: Record<string, number> = {}
  for (const e of expenses) {
    const cat = e.category ?? 'Uncategorised'
    byCat[cat] = (byCat[cat] ?? 0) + parseFloat(e.amount as string)
  }
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const maxCat = catEntries[0]?.[1] ?? 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,11,18,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '14px 20px',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {participant.tour_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Hi, {participant.name}</div>
            {isClosed && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                CLOSED
              </span>
            )}
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 10 }}>
            {(['dashboard', 'expenses'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500,
                background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t ? 'var(--accent-cyan)' : 'transparent'}`,
                color: tab === t ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px' }}>

        {/* ── Dashboard tab ── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Balance card */}
            <GlassCard style={{ padding: '20px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>You Paid</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{base} {summary.my_paid.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Your Share</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{base} {summary.my_share.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Outstanding</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {!fullySettled && Math.abs(adjustedBalance - summary.balance) > 0.005 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {summary.balance >= 0 ? '+' : ''}{base} {summary.balance.toFixed(2)}
                      </div>
                    )}
                    <div style={{
                      fontSize: 18, fontWeight: 700,
                      color: fullySettled ? 'var(--accent-green)' : adjustedBalance >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)',
                    }}>
                      {fullySettled ? 'Settled' : `${adjustedBalance >= 0 ? '+' : ''}${base} ${adjustedBalance.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: fullySettled ? 'rgba(16,185,129,0.08)' : adjustedBalance >= 0 ? 'rgba(6,182,212,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${fullySettled ? 'rgba(16,185,129,0.25)' : adjustedBalance >= 0 ? 'rgba(6,182,212,0.25)' : 'rgba(239,68,68,0.25)'}`,
                color: fullySettled ? 'var(--accent-green)' : adjustedBalance >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)',
              }}>
                {fullySettled
                  ? 'You are fully settled'
                  : adjustedBalance > 0.005
                  ? `You are still owed ${base} ${adjustedBalance.toFixed(2)}`
                  : `You still owe ${base} ${Math.abs(adjustedBalance).toFixed(2)}`}
              </div>
            </GlassCard>

            {/* Settlement breakdown — two separate sections: remaining vs paid */}
            {(my_transactions.length > 0 || my_settlements.length > 0) && (
              <GlassCard style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Settlement
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Remaining transfers — never shows "settled" badge, amount is already adjusted */}
                  {my_transactions.length === 0 ? (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: 'var(--accent-green)' }}>
                      Nothing left to transfer.
                    </div>
                  ) : my_transactions.map((t, i) => {
                    const isOwe = t.from === participant.name
                    return (
                      <div key={`txn-${i}`} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 8,
                        background: isOwe ? 'rgba(239,68,68,0.06)' : 'rgba(6,182,212,0.06)',
                        border: `1px solid ${isOwe ? 'rgba(239,68,68,0.2)' : 'rgba(6,182,212,0.2)'}`,
                      }}>
                        <div style={{ flex: 1 }}>
                          {isOwe
                            ? <span style={{ fontSize: 13, fontWeight: 600 }}>You owe <span style={{ color: 'var(--accent-cyan)' }}>{t.to}</span></span>
                            : <span style={{ fontSize: 13, fontWeight: 600 }}><span style={{ color: 'var(--accent-cyan)' }}>{t.from}</span> owes you</span>}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Outstanding</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: isOwe ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
                          {base} {t.amount.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}

                  {/* Payment history — actual records, with their own amounts and paid dates */}
                  {my_settlements.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 2 }}>Payment history</div>
                      {my_settlements.map((r, i) => {
                        const isOwe = r.from_name === participant.name
                        return (
                          <div key={`rec-${i}`} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', borderRadius: 8,
                            background: r.settled ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)',
                            border: `1px solid ${r.settled ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                          }}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                                {isOwe
                                  ? <>You → <span style={{ color: 'var(--text-primary)' }}>{r.to_name}</span></>
                                  : <><span style={{ color: 'var(--text-primary)' }}>{r.from_name}</span> → You</>}
                              </span>
                              {r.settled && r.settled_at && (
                                <div style={{ fontSize: 11, color: 'var(--accent-green)', marginTop: 2 }}>
                                  Paid {new Date(r.settled_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, color: r.settled ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                              {r.currency} {r.amount.toFixed(2)}
                            </span>
                            {r.settled
                              ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>Paid</span>
                              : <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Pending</span>}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Tour total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Total tour spend</span>
              <span style={{ fontWeight: 700 }}>{base} {summary.total_tour_base.toFixed(2)}</span>
            </div>

            {/* Day-by-day chart */}
            {expenses.length > 0 && (() => {
              const byDate: Record<string, number> = {}
              for (const e of expenses) {
                const d = e.created_at.slice(0, 10)
                byDate[d] = (byDate[d] ?? 0) + parseFloat(e.amount as string)
              }
              const dayData = Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, total], i) => ({
                  label: `D${i + 1}`,
                  total: parseFloat(total.toFixed(2)),
                  date,
                }))
              if (dayData.length < 2) return null
              const maxVal = Math.max(...dayData.map(d => d.total), 0.01)
              const currency = expenses[0]?.currency ?? base
              return (
                <GlassCard style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    Your Spend by Day ({currency})
                  </div>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={dayData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '0' : v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
                      <Tooltip
                        cursor={{ fill: 'rgba(6,182,212,0.06)' }}
                        contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                        formatter={(val: number) => [`${currency} ${val.toFixed(2)}`, 'Spend']}
                      />
                      <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                        {dayData.map((d, i) => (
                          <Cell key={i} fill={d.total >= maxVal * 0.8 ? '#06b6d4' : 'rgba(6,182,212,0.4)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              )
            })()}

            {/* Category breakdown */}
            {catEntries.length > 0 && (
              <GlassCard style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Your Spend by Category
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {catEntries.map(([cat, amt]) => {
                    const color = catColor(cat)
                    const currency = expenses.find(e => (e.category ?? 'Uncategorised') === cat)?.currency ?? base
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />{cat}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{currency} {amt.toFixed(2)}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(amt / maxCat) * 100}%`, background: color, borderRadius: 2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            )}

            {expenses.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No expenses yet.{!isClosed && ' Go to Expenses tab to add one.'}
              </div>
            )}
          </div>
        )}

        {/* ── Expenses tab ── */}
        {tab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!isClosed && (
              adding ? (
                <AddExpenseForm
                  token={token!}
                  allowedCurrencies={participant.allowed_currencies}
                  allowedCategories={participant.allowed_categories ?? []}
                  allParticipants={data.all_participants}
                  myName={participant.name}
                  baseCurrency={base}
                  startDate={participant.start_date ?? null}
                  endDate={participant.end_date ?? null}
                  onDone={() => setAdding(false)}
                />
              ) : (
                <button
                  className="btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => setAdding(true)}
                >
                  <Plus size={14} /> Add Expense
                </button>
              )
            )}
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                No expenses yet.{!isClosed && ' Tap "Add Expense" above.'}
              </div>
            ) : (
              expenses.map(e => <ExpenseRow key={e.id} expense={e} token={token!} baseCurrency={base} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
