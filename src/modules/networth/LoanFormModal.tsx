import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateLoan, useUpdateLoan, useAssets } from '../../hooks/useNetworth'
import type { Loan, LoanType } from '../../types/networth'

const LOAN_TYPES: { value: LoanType; label: string }[] = [
  { value: 'home', label: 'Home Loan' },
  { value: 'car', label: 'Car Loan' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', width: '100%', colorScheme: 'dark',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono',
  textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4,
}

export default function LoanFormModal({ loan, onClose }: { loan?: Loan; onClose: () => void }) {
  const create = useCreateLoan()
  const update = useUpdateLoan()
  const { data: assets = [] } = useAssets()
  const isEdit = !!loan

  const [name, setName] = useState(loan?.name ?? '')
  const [loanType, setLoanType] = useState<LoanType>(loan?.loan_type ?? 'other')
  const [principal, setPrincipal] = useState(loan ? String(loan.principal) : '')
  const [outstanding, setOutstanding] = useState(loan ? String(loan.outstanding) : '')
  const [interestRate, setInterestRate] = useState(loan ? String(loan.interest_rate) : '')
  const [monthlyPayment, setMonthlyPayment] = useState(loan ? String(loan.monthly_payment) : '')
  const [startDate, setStartDate] = useState(loan?.start_date?.slice(0, 10) ?? '')
  const [dueDay, setDueDay] = useState(loan ? String(loan.due_day) : '1')
  const [linkedAssetId, setLinkedAssetId] = useState(loan?.linked_asset_id != null ? String(loan.linked_asset_id) : '')

  const loading = create.isPending || update.isPending
  const valid = name.trim() && principal && outstanding && interestRate !== '' && monthlyPayment && startDate && dueDay

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: Partial<Loan> = {
      name: name.trim(),
      loan_type: loanType,
      principal: parseFloat(principal),
      outstanding: parseFloat(outstanding),
      interest_rate: parseFloat(interestRate),
      monthly_payment: parseFloat(monthlyPayment),
      start_date: startDate,
      due_day: parseInt(dueDay, 10),
      linked_asset_id: linkedAssetId ? parseInt(linkedAssetId, 10) : null,
    }
    if (isEdit && loan) {
      await update.mutateAsync({ id: loan.id, data })
    } else {
      await create.mutateAsync(data)
    }
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Loan' : 'New Loan'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inputStyle} placeholder="Loan name *" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <div>
            <label style={labelStyle}>Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={loanType} onChange={e => setLoanType(e.target.value as LoanType)}>
              {LOAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Principal *</label>
              <input type="number" style={inputStyle} value={principal} onChange={e => setPrincipal(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Outstanding *</label>
              <input type="number" style={inputStyle} value={outstanding} onChange={e => setOutstanding(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Interest rate (annual, e.g. 0.045) *</label>
              <input type="number" step="0.0001" style={inputStyle} value={interestRate} onChange={e => setInterestRate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Monthly payment *</label>
              <input type="number" style={inputStyle} value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Start date *</label>
              <input type="date" style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Due day (1-31) *</label>
              <input type="number" min={1} max={31} style={inputStyle} value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Linked asset (optional)</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={linkedAssetId} onChange={e => setLinkedAssetId(e.target.value)}>
              <option value="">None</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !valid}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
