import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useTransferPrefs, type Urgency } from '../../context/TransferPrefs'
import { useFxRecommendation, useFxProfile } from '../../hooks/useRates'
import { reasonLabel } from './reasonLabels'

const DISMISS_KEY = 'transferAlert.dismissed'
const URGENCIES: Urgency[] = ['low', 'medium', 'high']

export default function TransferAlertBanner() {
  const { amount, urgency, setAmount, setUrgency } = useTransferPrefs()
  const { profileQuery, updateTargetRate } = useFxProfile()
  const [amountInput, setAmountInput] = useState(String(amount))
  const [targetInput, setTargetInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    setAmountInput(String(amount))
  }, [amount])

  // Seed the target input from the stored FX profile once loaded.
  const profileTarget = profileQuery.data?.target_rate
  useEffect(() => {
    setTargetInput(profileTarget != null ? String(profileTarget) : '')
  }, [profileTarget])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (targetDebounceRef.current) clearTimeout(targetDebounceRef.current)
    }
  }, [])

  function handleAmountChange(value: string) {
    setAmountInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const n = Number(value)
      if (isFinite(n) && n > 0) setAmount(n)
    }, 400)
  }

  function handleTargetChange(value: string) {
    setTargetInput(value)
    if (targetDebounceRef.current) clearTimeout(targetDebounceRef.current)
    const trimmed = value.trim()
    // Empty input is left as-is: the backend cannot clear a stored target to null.
    if (trimmed === '') return
    const n = Number(trimmed)
    if (!isFinite(n) || n <= 0) return
    if (n === profileTarget) return
    targetDebounceRef.current = setTimeout(() => {
      updateTargetRate.mutate(n)
    }, 500)
  }

  const query = useFxRecommendation()
  const rec = query.data?.recommendation

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rec?.decision === 'exchange_now' && !dismissed && (
        <GlassCard style={{
          padding: '18px 20px',
          border: '1px solid rgba(16,185,129,0.4)',
          background: 'rgba(16,185,129,0.08)',
          position: 'relative',
        }}>
          <button
            onClick={() => { setDismissed(true); sessionStorage.setItem(DISMISS_KEY, '1') }}
            style={{
              position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
          <p style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--accent-green)', marginBottom: 6 }}>
            Good time to transfer
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>
            Effective rate {rec.effective_rate.toFixed(4)}
            {rec.target_rate != null ? ` · target ${rec.target_rate.toFixed(4)}` : ''}
            {' · '}{rec.confidence}% confidence
          </p>
          {rec.reasons?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {rec.reasons.slice(0, 2).map((code) => {
                const label = reasonLabel(code)
                if (!label) return null
                return (
                  <span key={code} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)',
                  }}>
                    {label}
                  </span>
                )
              })}
            </div>
          )}
        </GlassCard>
      )}

      {rec && (rec.decision === 'wait' || rec.decision === 'split') && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 4px' }}>
          {rec.decision === 'wait'
            ? `Hold${reasonLabel(rec.reasons?.[0]) ? ` — ${reasonLabel(rec.reasons[0])!.toLowerCase()}` : ''}`
            : 'Mixed signal — consider splitting the transfer'}
        </p>
      )}

      <GlassCard style={{ padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Amount (SGD)
          <input
            type="number"
            min={1}
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
            style={{
              width: 100, padding: '6px 8px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg-surface)',
              color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          Target rate (MYR)
          <input
            type="number"
            min={0}
            step={0.0001}
            placeholder="e.g. 3.45"
            value={targetInput}
            onChange={(e) => handleTargetChange(e.target.value)}
            disabled={profileQuery.isLoading}
            style={{
              width: 110, padding: '6px 8px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg-surface)',
              color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
            }}
          />
          {updateTargetRate.isPending && <Spinner size={12} />}
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          {URGENCIES.map((u) => (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, textTransform: 'capitalize',
                border: `1px solid ${urgency === u ? 'var(--border-active)' : 'var(--border)'}`,
                background: urgency === u ? 'var(--accent-cyan-dim)' : 'transparent',
                color: urgency === u ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {u}
            </button>
          ))}
        </div>
        {query.isFetching && <Spinner size={14} />}
      </GlassCard>
    </div>
  )
}
