import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useLoans, useDeleteLoan, useLogLoanPayment, useLoanPayoff, useLoanAmortization } from '../../../hooks/useNetworth'
import LoanFormModal from '../LoanFormModal'
import type { Loan } from '../../../types/networth'

const LOAN_TYPE_LABELS: Record<string, string> = { home: 'Home Loan', car: 'Car Loan', personal: 'Personal', other: 'Other' }

function fmt(n: number) {
  return Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function LoanRow({ loan, onEdit, onDelete }: { loan: Loan; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [extraInput, setExtraInput] = useState('0')
  const [extraMonthly, setExtraMonthly] = useState(0)
  const [showSchedule, setShowSchedule] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logPayment = useLogLoanPayment()

  const payoffQuery = useLoanPayoff(loan.id, extraMonthly)
  const amortQuery = useLoanAmortization(loan.id, showSchedule)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleExtraChange(value: string) {
    setExtraInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const n = Number(value)
      setExtraMonthly(isFinite(n) && n >= 0 ? n : 0)
    }, 400)
  }

  function handleLogPayment() {
    const amountStr = prompt(`Log payment for "${loan.name}" (MYR):`, String(loan.monthly_payment))
    if (!amountStr) return
    const amount = parseFloat(amountStr)
    if (isFinite(amount) && amount > 0) logPayment.mutate({ id: loan.id, amount })
  }

  const payoff = payoffQuery.data

  return (
    <GlassCard style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{loan.name}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 999,
              background: loan.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
              color: loan.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
            }}>
              {loan.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {LOAN_TYPE_LABELS[loan.loan_type] ?? loan.loan_type} · {(loan.interest_rate * 100).toFixed(2)}% p.a.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>RM {fmt(loan.outstanding)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>RM {fmt(loan.monthly_payment)}/mo</div>
          </div>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={handleLogPayment}>Log Payment</button>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onEdit}><Pencil size={13} /></button>
          <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={onDelete}><Trash2 size={13} /></button>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Extra monthly payment (MYR)</label>
            <input
              type="number" min={0} value={extraInput} onChange={e => handleExtraChange(e.target.value)}
              style={{
                width: 100, padding: '6px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg-elevated)',
                color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
              }}
            />
            {payoffQuery.isFetching && <Spinner size={13} />}
          </div>

          {payoff && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Months to payoff</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: 'var(--text-primary)' }}>
                  {payoff.with_extra_months} {payoff.months_saved > 0 && <span style={{ color: 'var(--accent-green)', fontSize: 12 }}>(-{payoff.months_saved})</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interest saved</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 14, color: 'var(--accent-green)' }}>RM {fmt(payoff.interest_saved)}</div>
              </div>
            </div>
          )}

          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowSchedule(v => !v)}>
            {showSchedule ? 'Hide' : 'View'} Amortization Schedule
          </button>

          {showSchedule && (
            amortQuery.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner size={16} /></div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 10, maxHeight: 300, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Month', 'Date', 'Payment', 'Principal', 'Interest', 'Balance'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: h === 'Month' ? 'left' : 'right', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(amortQuery.data ?? []).map(row => (
                      <tr key={row.month_num} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '5px 10px', color: 'var(--text-secondary)' }}>{row.month_num}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)' }}>{row.payment_date}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>{fmt(row.payment)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--accent-green)' }}>{fmt(row.principal)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono', color: 'var(--accent-red)' }}>{fmt(row.interest)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </GlassCard>
  )
}

export default function LoansTab() {
  const { data: loans = [], isLoading } = useLoans()
  const deleteLoan = useDeleteLoan()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Loan | undefined>(undefined)

  function openCreate() { setEditing(undefined); setShowForm(true) }
  function openEdit(l: Loan) { setEditing(l); setShowForm(true) }
  function confirmDelete(l: Loan) {
    if (confirm(`Remove "${l.name}"?`)) deleteLoan.mutate(l.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={openCreate}>
          <Plus size={14} /> New Loan
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
      ) : loans.length === 0 ? (
        <GlassCard style={{ padding: '20px', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No loans yet. Click + New Loan to add one.</span>
        </GlassCard>
      ) : (
        loans.map(l => <LoanRow key={l.id} loan={l} onEdit={() => openEdit(l)} onDelete={() => confirmDelete(l)} />)
      )}

      {showForm && <LoanFormModal loan={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
