import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useCreateEntry, useUpdateEntry, useDeleteEntry, useExpenseCategories } from '../../hooks/useExpenses'
import { getCategoryIcon } from './ionicons-map'
import { ratesApi } from '../../api/rates'
import type { ExpenseEntry, EntryType, Currency } from '../../types/expenses'

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

export default function EntryFormModal({
  year, month, entry, onClose,
}: { year: number; month: number; entry?: ExpenseEntry; onClose: () => void }) {
  const create = useCreateEntry(year, month)
  const update = useUpdateEntry(year, month)
  const del = useDeleteEntry(year, month)
  const { data: categories = [] } = useExpenseCategories()
  const isEdit = !!entry

  const [entryType, setEntryType] = useState<EntryType>(entry?.entry_type ?? 'expense')
  const [amount, setAmount] = useState(entry ? String(entry.original_amount ?? entry.amount) : '')
  const [currency, setCurrency] = useState<Currency>(entry?.currency ?? 'MYR')
  const [label, setLabel] = useState(entry?.label ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(entry?.category_id ?? null)
  const [entryDate, setEntryDate] = useState(entry?.entry_date?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [sgdRate, setSgdRate] = useState(3.4)

  useEffect(() => {
    if (currency !== 'SGD') return
    ratesApi.getLatest()
      .then(latest => setSgdRate(parseFloat(String(latest.buy_rate)) || 3.4))
      .catch(() => setSgdRate(3.4))
  }, [currency])

  const loading = create.isPending || update.isPending || del.isPending
  const amountNum = parseFloat(amount)
  const valid = label.trim().length > 0 && !isNaN(amountNum) && amountNum > 0 &&
    (entryType === 'income' || categoryId != null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data = {
      entry_type: entryType,
      category_id: entryType === 'expense' ? categoryId : null,
      label: label.trim(),
      amount: amountNum,
      currency,
      entry_date: entryDate || null,
      notes: notes.trim() || null,
    }
    if (isEdit && entry) {
      await update.mutateAsync({ id: entry.id, data })
    } else {
      await create.mutateAsync(data)
    }
    onClose()
  }

  async function handleDelete() {
    if (!entry) return
    if (!confirm(`Delete "${entry.label}"?`)) return
    await del.mutateAsync(entry.id)
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
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Entry' : 'New Entry'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-elevated)', borderRadius: 8, padding: 4 }}>
            {(['expense', 'income'] as EntryType[]).map(t => (
              <button
                key={t} type="button" onClick={() => setEntryType(t)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  background: entryType === t ? (t === 'expense' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)') : 'transparent',
                  color: entryType === t ? (t === 'expense' ? '#ef4444' : 'var(--accent-green)') : 'var(--text-muted)',
                }}
              >
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Amount *</label>
              <input type="number" step="0.01" style={inputStyle} placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
                <option value="MYR">MYR</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
          </div>
          {currency === 'SGD' && !isNaN(amountNum) && amountNum > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -6 }}>
              Rate: 1 SGD = {sgdRate.toFixed(4)} MYR (RM {(amountNum * sgdRate).toFixed(2)})
            </p>
          )}

          <input
            style={inputStyle}
            placeholder={entryType === 'expense' ? 'e.g. Grab to office' : 'e.g. Salary'}
            value={label} onChange={e => setLabel(e.target.value)}
          />

          {entryType === 'expense' && (
            <div>
              <label style={labelStyle}>Category *</label>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                {categories.map(c => {
                  const Icon = getCategoryIcon(c.icon)
                  const active = categoryId === c.id
                  return (
                    <button
                      key={c.id} type="button" onClick={() => setCategoryId(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                        border: `1px solid ${c.color}`,
                        background: active ? c.color : 'transparent',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        fontSize: 12, whiteSpace: 'nowrap',
                      }}
                    >
                      <Icon size={13} color={active ? '#fff' : c.color} />
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Date</label>
            <input type="text" placeholder="YYYY-MM-DD" style={inputStyle} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>

          <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
            {isEdit ? (
              <button type="button" className="btn-ghost" style={{ color: '#ef4444' }} onClick={handleDelete} disabled={loading}>Delete</button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading || !valid}>
                {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
