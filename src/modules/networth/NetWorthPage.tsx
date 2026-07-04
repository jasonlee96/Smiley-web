import { useState } from 'react'
import DashboardTab from './tabs/DashboardTab'
import AssetsTab from './tabs/AssetsTab'
import LoansTab from './tabs/LoansTab'

type Tab = 'dashboard' | 'assets' | 'loans'
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'assets', label: 'Assets' },
  { id: 'loans', label: 'Loans' },
]

export default function NetWorthPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Net Worth</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Assets, loans, and your overall position</p>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, gap: 2, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, fontFamily: 'Inter',
            background: tab === t.id ? 'var(--accent-cyan-dim)' : 'transparent',
            color: tab === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'assets' && <AssetsTab />}
      {tab === 'loans' && <LoansTab />}
    </div>
  )
}
