import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, AlertTriangle } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useImportPreview, useImportConfirm, useExpenseCategories } from '../../hooks/useExpenses'
import type { DraftTransaction } from '../../types/expenses'

type Stage = 'idle' | 'uploading' | 'reviewing' | 'confirming' | 'done' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  NO_FILE: 'No file uploaded',
  WRONG_PASSWORD: 'Incorrect PDF password. Please check and try again.',
  ENCRYPTED_PDF: 'This PDF is password-protected. Enter the password and try again.',
  EXTRACT_FAILED: 'Failed to extract text from PDF',
  SCAN_PDF: 'This PDF appears to be image-scanned. Please use a text-based statement export.',
  CLAUDE_FAILED: 'AI parsing failed. Please try again.',
  PARSE_FAILED: 'Could not parse AI output as JSON',
  NO_TRANSACTIONS: 'No transactions were found in this statement',
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: categories = [] } = useExpenseCategories()
  const preview = useImportPreview()
  const confirmImport = useImportConfirm()

  const [stage, setStage] = useState<Stage>('idle')
  const [password, setPassword] = useState('')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<DraftTransaction[]>([])
  const [meta, setMeta] = useState<{ total_parsed: number; text_truncated: boolean; skipped_rows: number } | null>(null)
  const [overrideYear, setOverrideYear] = useState<number | null>(null)
  const [overrideMonth, setOverrideMonth] = useState<number | null>(null)
  const [result, setResult] = useState<{ inserted: number; skipped: number; months_touched: string[] } | null>(null)

  async function handleFileSelected(file: File) {
    setStage('uploading')
    setErrorCode(null)
    try {
      const res = await preview.mutateAsync({ file, password: password || undefined })
      setTransactions(res.transactions)
      setMeta({ total_parsed: res.total_parsed, text_truncated: res.text_truncated, skipped_rows: res.skipped_rows })
      if (res.statement_month) {
        const [y, m] = res.statement_month.split('-').map(Number)
        setOverrideYear(y)
        setOverrideMonth(m)
      }
      setStage('reviewing')
    } catch (err: any) {
      const code = err?.response?.data?.error ?? 'EXTRACT_FAILED'
      setErrorCode(code)
      setStage('error')
    }
  }

  function updateTransaction(id: string, patch: Partial<DraftTransaction>) {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  async function handleConfirm() {
    setStage('confirming')
    try {
      const res = await confirmImport.mutateAsync({
        transactions,
        overrideYear: overrideYear ?? undefined,
        overrideMonth: overrideMonth ?? undefined,
      })
      setResult(res)
      setStage('done')
    } catch (err: any) {
      const code = err?.response?.data?.error ?? 'EXTRACT_FAILED'
      setErrorCode(code)
      setStage('error')
    }
  }

  function reset() {
    setStage('idle')
    setTransactions([])
    setMeta(null)
    setResult(null)
    setErrorCode(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => navigate('/expenses')}>
          <ChevronLeft size={16} />
        </button>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Import Statement</h1>
      </div>

      {(stage === 'idle' || stage === 'error') && (
        <GlassCard style={{ padding: '24px' }}>
          {stage === 'error' && errorCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', marginBottom: 16 }}>
              <AlertTriangle size={15} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#ef4444' }}>{ERROR_MESSAGES[errorCode] ?? 'Import failed'}</span>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Upload a PDF credit card statement. AI will extract and categorize transactions for review before import.
          </p>
          {(errorCode === 'ENCRYPTED_PDF' || errorCode === 'WRONG_PASSWORD') && (
            <input
              type="password"
              placeholder="PDF password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 12px', fontSize: 13, color: 'var(--text-primary)', width: '100%', marginBottom: 12,
              }}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f) }}
          />
        </GlassCard>
      )}

      {stage === 'uploading' && (
        <GlassCard style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spinner size={24} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Parsing statement...</span>
        </GlassCard>
      )}

      {stage === 'reviewing' && meta && (
        <>
          <GlassCard style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {meta.total_parsed} transactions parsed{meta.skipped_rows > 0 ? `, ${meta.skipped_rows} rows skipped` : ''}
              {meta.text_truncated ? ' — statement was long, only part of it was parsed' : ''}
            </p>
          </GlassCard>

          <GlassCard style={{ padding: '14px 18px' }}>
            <label style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Import all into month</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="btn-ghost" onClick={() => {
                let m = (overrideMonth ?? new Date().getMonth() + 1) - 1
                let y = overrideYear ?? new Date().getFullYear()
                if (m < 1) { m = 12; y -= 1 }
                setOverrideMonth(m); setOverrideYear(y)
              }}>‹</button>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 14 }}>
                {MONTH_NAMES[(overrideMonth ?? new Date().getMonth() + 1) - 1]} {overrideYear ?? new Date().getFullYear()}
              </span>
              <button className="btn-ghost" onClick={() => {
                let m = (overrideMonth ?? new Date().getMonth() + 1) + 1
                let y = overrideYear ?? new Date().getFullYear()
                if (m > 12) { m = 1; y += 1 }
                setOverrideMonth(m); setOverrideYear(y)
              }}>›</button>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: '8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['', 'Date', 'Label', 'Amount', 'Currency', 'Category', ''].map(h => (
                    <th key={h} style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: t.excluded ? 0.4 : 1 }}>
                    <td style={{ padding: '6px 8px' }}>
                      <input type="checkbox" checked={!t.excluded} onChange={e => updateTransaction(t.id, { excluded: !e.target.checked })} />
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>{t.entry_date ?? '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        value={t.label}
                        onChange={e => updateTransaction(t.id, { label: e.target.value })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 12, width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'IBM Plex Mono' }}>{fmt(t.amount)}</td>
                    <td style={{ padding: '6px 8px' }}>{t.currency}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        value={t.category_slug}
                        onChange={e => {
                          const cat = categories.find(c => c.slug === e.target.value)
                          updateTransaction(t.id, {
                            category_slug: e.target.value,
                            category_id: cat?.id ?? null,
                            category_label: cat?.label ?? t.category_label,
                            category_color: cat?.color ?? t.category_color,
                          })
                        }}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '3px 6px' }}
                      >
                        {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {t.parse_confidence === 'low' && (
                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>low confidence</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={reset}>Cancel</button>
            <button className="btn-primary" onClick={handleConfirm} disabled={transactions.every(t => t.excluded)}>
              Import {transactions.filter(t => !t.excluded).length} Transactions
            </button>
          </div>
        </>
      )}

      {stage === 'confirming' && (
        <GlassCard style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Spinner size={24} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Importing transactions...</span>
        </GlassCard>
      )}

      {stage === 'done' && result && (
        <GlassCard style={{ padding: '24px' }}>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>
            {result.inserted} entries added{result.skipped > 0 ? `, ${result.skipped} duplicates skipped` : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {result.months_touched.map(ym => {
              const [y, m] = ym.split('-').map(Number)
              return (
                <button key={ym} className="btn-ghost" style={{ textAlign: 'left', fontSize: 12 }} onClick={() => navigate(`/expenses/${y}/${m}`)}>
                  View {MONTH_NAMES[m - 1]} {y}
                </button>
              )
            })}
          </div>
          <button className="btn-primary" onClick={() => navigate('/expenses')}>Back to Expenses</button>
        </GlassCard>
      )}
    </div>
  )
}
