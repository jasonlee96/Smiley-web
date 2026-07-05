import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  CheckSquare, TrendingUp, Server, Activity, Cloud, Mail, Plane, LogOut,
  SplitSquareVertical, BarChart2, Wrench, Wallet, Receipt, LayoutGrid,
} from 'lucide-react'
import { useFxRecommendation } from '../hooks/useRates'

const PRIMARY_NAV = [
  { to: '/todos',      label: 'Todos',     icon: CheckSquare },
  { to: '/rates',      label: 'Rates',     icon: TrendingUp },
  { to: '/net-worth',  label: 'Net Worth', icon: Wallet },
  { to: '/expenses',   label: 'Expenses',  icon: Receipt },
]

const OVERFLOW_NAV = [
  { to: '/ec2',        label: 'EC2',      icon: Server },
  { to: '/jobs',       label: 'Jobs',     icon: Activity },
  { to: '/weather',    label: 'Weather',  icon: Cloud },
  { to: '/mail',       label: 'Mail',     icon: Mail },
  { to: '/trips',      label: 'Trips',    icon: Plane },
  { to: '/splitwise',  label: 'Splitter', icon: SplitSquareVertical },
  { to: '/quant',      label: 'Quant',    icon: BarChart2 },
  { to: '/tools',      label: 'Tools',    icon: Wrench },
]

const ALL_NAV = [...PRIMARY_NAV, ...OVERFLOW_NAV]

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const currentModule = ALL_NAV.find(n => location.pathname.startsWith(n.to))
  const fxQuery = useFxRecommendation()
  const showTransferDot = fxQuery.data?.recommendation.decision === 'exchange_now'

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const isOverflowActive = OVERFLOW_NAV.some(n => location.pathname.startsWith(n.to))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,11,18,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 54,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, flexShrink: 0,
            background: 'var(--accent-cyan-dim)',
            border: '1px solid var(--border-active)',
            borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>⌘</div>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800, fontSize: 15,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}>
            Smiley<span style={{ color: 'var(--accent-cyan)' }}> Web</span>
          </span>
          {currentModule && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
              / {currentModule.label}
            </span>
          )}
        </div>

        {/* Icon-only nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {PRIMARY_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              style={({ isActive }) => ({
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'all 0.15s',
                background: isActive ? 'var(--accent-cyan-dim)' : 'transparent',
                border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              })}
            >
              <Icon size={15} />
              {to === '/rates' && showTransferDot && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--accent-green)',
                  boxShadow: '0 0 0 2px var(--bg-base)',
                  animation: 'pulse-dot 1.6s ease-in-out infinite',
                }} />
              )}
            </NavLink>
          ))}

          {/* More overflow */}
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button
              title="More"
              onClick={() => setMoreOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                borderRadius: 8,
                border: `1px solid ${(moreOpen || isOverflowActive) ? 'var(--border-active)' : 'transparent'}`,
                background: (moreOpen || isOverflowActive) ? 'var(--accent-cyan-dim)' : 'transparent',
                color: (moreOpen || isOverflowActive) ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={15} />
            </button>

            {moreOpen && (
              <div className="glass-card" style={{
                position: 'absolute', top: 44, right: 0, zIndex: 60,
                width: 280, padding: 10,
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              }}>
                {OVERFLOW_NAV.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname.startsWith(to)
                  return (
                    <Link
                      key={to}
                      to={to}
                      className="hover-lift"
                      onClick={() => setMoreOpen(false)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '10px 6px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        background: active ? 'var(--accent-cyan-dim)' : 'transparent',
                        border: `1px solid ${active ? 'var(--border-active)' : 'transparent'}`,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(6,182,212,0.13)',
                      }}>
                        <Icon size={15} color={active ? 'var(--accent-cyan)' : 'var(--text-secondary)'} />
                      </div>
                      <span style={{ fontSize: 11, color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                        {label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Sign out */}
        <button
          className="btn-ghost"
          style={{ padding: '6px 8px', flexShrink: 0 }}
          title="Sign out"
          onClick={() => {
            localStorage.removeItem('smiley_token')
            window.dispatchEvent(new Event('token-cleared'))
          }}
        >
          <LogOut size={14} />
        </button>
      </header>

      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
