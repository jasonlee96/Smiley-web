import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Upload, Settings, Calendar } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useExpenseMonthDetail, useExpenseMonths } from '../../hooks/useExpenses'
import EntryFormModal from './EntryFormModal'
import PendingStatementsCard from './PendingStatementsCard'

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function ExpensesHubPage() {
  const navigate = useNavigate()
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  const [showEntryForm, setShowEntryForm] = useState(false)

  const monthQuery = useExpenseMonthDetail(curYear, curMonth)
  const historyQuery = useExpenseMonths(12)

  const detail = monthQuery.data
  const months = historyQuery.data ?? []
  const netSavings = detail?.net_savings ?? 0
  const totalIncome = detail?.total_income ?? 0
  const totalExpenses = detail?.total_expenses ?? 0
  const savingsRate = detail?.savings_rate ?? 0

  const donutData = (detail?.by_category ?? []).map(c => ({ name: c.label, value: c.total, color: c.color }))

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Expenses</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Monthly income, spending, and savings</p>
      </div>

      <GlassCard style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {MONTH_NAMES[curMonth - 1]} {curYear} · Net Savings
            </p>
            {monthQuery.isLoading ? <Spinner /> : (
              <p style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 30, color: netSavings >= 0 ? 'var(--accent-green)' : '#ef4444', marginTop: 6 }}>
                RM {fmt(netSavings)}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px' }} onClick={() => navigate('/internal/expenses/import')}>
              <Upload size={14} /> Import
            </button>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={() => setShowEntryForm(true)}>
              <Plus size={14} /> Add Entry
            </button>
          </div>
        </div>
        {!monthQuery.isLoading && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--accent-green)' }}>↑ RM {fmt(totalIncome)}</span>
            <span style={{ fontSize: 13, color: '#ef4444' }}>↓ RM {fmt(totalExpenses)}</span>
            {totalIncome > 0 && (
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 999,
                background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)',
              }}>
                {savingsRate}% savings rate
              </span>
            )}
          </div>
        )}
      </GlassCard>

      <PendingStatementsCard />

      {donutData.length > 0 && (
        <GlassCard style={{ padding: '20px 22px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Spending by Category</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(v: number) => `RM ${fmt(v)}`} contentStyle={{ background: '#131929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {donutData.map((d, i) => {
                const pct = totalExpenses > 0 ? Math.round((d.value / totalExpenses) * 100) : 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.name}</span>
                    <span style={{ fontFamily: 'IBM Plex Mono', color: 'var(--text-primary)' }}>RM {fmt(d.value)}</span>
                    <span style={{ color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Month History</p>
        <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px' }} onClick={() => navigate('/internal/expenses/categories')}>
          <Settings size={13} /> Categories
        </button>
      </div>

      {historyQuery.isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
      ) : months.length === 0 ? (
        <GlassCard style={{ padding: '30px', textAlign: 'center' }}>
          <Calendar size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No expense data yet. Add an entry to get started.</p>
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: '8px' }}>
          {months.map((m, i) => {
            const rate = m.total_income > 0 ? Math.round((m.net_savings / m.total_income) * 100) : 0
            return (
              <div
                key={m.id}
                onClick={() => navigate(`/internal/expenses/${m.year}/${m.month}`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px', cursor: 'pointer',
                  borderBottom: i < months.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{MONTH_NAMES[m.month - 1]} {m.year}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>RM {fmt(m.total_expenses)} spent · {m.entry_count} entries</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, color: m.net_savings >= 0 ? 'var(--accent-green)' : '#ef4444' }}>
                    {m.net_savings >= 0 ? '+' : ''}RM {fmt(m.net_savings)}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rate}% savings rate</p>
                </div>
              </div>
            )
          })}
        </GlassCard>
      )}

      {showEntryForm && <EntryFormModal year={curYear} month={curMonth} onClose={() => setShowEntryForm(false)} />}
    </div>
  )
}
