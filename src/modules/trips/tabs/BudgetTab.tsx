import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useTripBudget, useTripExpenses, useCreateExpense, useDeleteExpense } from '../../../hooks/useTrips'

const EXPENSE_CATS = ['accommodation','transport','food','activities','shopping','other']

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', colorScheme: 'dark',
}

function fmt(n: number) { return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function BudgetTab({ tripId }: { tripId: number }) {
  const { data: budget, isLoading: budgetLoading } = useTripBudget(tripId)
  const { data: expenses = [], isLoading: expLoading } = useTripExpenses(tripId)
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'MYR' | 'SGD'>('MYR')
  const [category, setCategory] = useState('food')

  const loading = budgetLoading || expLoading

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim() || !amount) return
    await createExpense.mutateAsync({ tripId, data: { description: desc.trim(), amount: parseFloat(amount), currency, category } })
    setDesc(''); setAmount('')
  }

  const budgetPct = budget?.planned_budget_myr && budget.actual_spend_myr != null
    ? Math.min(100, (budget.actual_spend_myr / budget.planned_budget_myr) * 100) : null
  const barColor = budgetPct == null ? '#06b6d4' : budgetPct > 90 ? '#ef4444' : budgetPct > 70 ? '#f59e0b' : '#10b981'

  const byCategory: Record<string, typeof expenses> = {}
  for (const e of expenses) {
    if (!byCategory[e.category]) byCategory[e.category] = []
    byCategory[e.category].push(e)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={20} /></div>}

      {budget && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {[
              { label: 'Budget', value: budget.planned_budget_myr != null ? `MYR ${fmt(budget.planned_budget_myr)}` : '—' },
              { label: 'Spent', value: `MYR ${fmt(budget.actual_spend_myr)}` },
              { label: 'Remaining', value: budget.remaining_myr != null ? `MYR ${fmt(budget.remaining_myr)}` : '—' },
              { label: 'Spend %', value: budgetPct != null ? `${Math.round(budgetPct)}%` : '—' },
            ].map(({ label, value }) => (
              <GlassCard key={label} style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{value}</div>
              </GlassCard>
            ))}
          </div>

          {budgetPct !== null && (
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: 6, borderRadius: 3, width: `${budgetPct}%`, background: barColor, transition: 'width 0.4s' }} />
            </div>
          )}
        </>
      )}

      <GlassCard style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Add Expense</div>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input style={{ ...inputStyle, flex: '1 1 160px' }} placeholder="Description *" value={desc} onChange={e => setDesc(e.target.value)} />
          <input type="number" style={{ ...inputStyle, width: 100 }} placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['MYR','SGD'] as const).map(c => (
              <button key={c} type="button" onClick={() => setCurrency(c)} style={{
                padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: currency === c ? 'var(--accent-cyan-dim)' : 'transparent',
                color: currency === c ? 'var(--accent-cyan)' : 'var(--text-muted)',
                fontFamily: 'IBM Plex Mono',
              }}>
                {c}
              </button>
            ))}
          </div>
          <select style={{ ...inputStyle, cursor: 'pointer', width: 130 }} value={category} onChange={e => setCategory(e.target.value)}>
            {EXPENSE_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={createExpense.isPending || !desc.trim() || !amount} style={{ flexShrink: 0 }}>
            {createExpense.isPending ? 'Adding...' : 'Add'}
          </button>
        </form>
      </GlassCard>

      {Object.entries(byCategory).map(([cat, items]) => (
        <GlassCard key={cat} style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)} — MYR {fmt(items.reduce((s, e) => s + (e.amount_myr ?? 0), 0))}
          </div>
          {items.map(exp => (
            <div key={exp.id} className="expense-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{exp.description}</span>
                {exp.currency !== 'MYR' && exp.amount_myr != null && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'IBM Plex Mono' }}>
                    ({exp.currency} {fmt(exp.amount)})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)', fontWeight: 600 }}>
                  MYR {fmt(exp.amount_myr ?? exp.amount)}
                </span>
                <button className="btn-ghost expense-del" style={{ padding: '3px 5px', opacity: 0, color: '#ef4444', transition: 'opacity 0.15s' }}
                  onClick={() => deleteExpense.mutate({ tripId, expId: exp.id })}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </GlassCard>
      ))}

      {expenses.length === 0 && !loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No expenses recorded yet.</div>
      )}

      <style>{`.expense-row:hover .expense-del { opacity: 1 !important; }`}</style>
    </div>
  )
}
