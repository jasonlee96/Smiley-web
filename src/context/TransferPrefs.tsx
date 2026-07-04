import { createContext, useContext, useState, ReactNode } from 'react'

export type Urgency = 'low' | 'medium' | 'high'

interface TransferPrefsValue {
  amount: number
  urgency: Urgency
  setAmount: (n: number) => void
  setUrgency: (u: Urgency) => void
}

const TransferPrefsContext = createContext<TransferPrefsValue | null>(null)

const AMOUNT_KEY = 'transferPrefs.amount'
const URGENCY_KEY = 'transferPrefs.urgency'
const DEFAULT_AMOUNT = 5000
const DEFAULT_URGENCY: Urgency = 'medium'

function readAmount(): number {
  const raw = localStorage.getItem(AMOUNT_KEY)
  const n = raw ? Number(raw) : NaN
  return isFinite(n) && n > 0 ? n : DEFAULT_AMOUNT
}

function readUrgency(): Urgency {
  const raw = localStorage.getItem(URGENCY_KEY)
  return raw === 'low' || raw === 'medium' || raw === 'high' ? raw : DEFAULT_URGENCY
}

export function TransferPrefsProvider({ children }: { children: ReactNode }) {
  const [amount, setAmountState] = useState<number>(readAmount)
  const [urgency, setUrgencyState] = useState<Urgency>(readUrgency)

  function setAmount(n: number) {
    setAmountState(n)
    localStorage.setItem(AMOUNT_KEY, String(n))
  }

  function setUrgency(u: Urgency) {
    setUrgencyState(u)
    localStorage.setItem(URGENCY_KEY, u)
  }

  return (
    <TransferPrefsContext.Provider value={{ amount, urgency, setAmount, setUrgency }}>
      {children}
    </TransferPrefsContext.Provider>
  )
}

export function useTransferPrefs(): TransferPrefsValue {
  const ctx = useContext(TransferPrefsContext)
  if (!ctx) throw new Error('useTransferPrefs must be used within TransferPrefsProvider')
  return ctx
}
