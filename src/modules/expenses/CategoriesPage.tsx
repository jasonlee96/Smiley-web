import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { useExpenseCategories, useDeleteCategory, useReorderCategories } from '../../hooks/useExpenses'
import { getCategoryIcon } from './ionicons-map'
import CategoryFormModal from './CategoryFormModal'
import type { ExpenseCategory } from '../../types/expenses'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { data: categories = [], isLoading } = useExpenseCategories()
  const deleteCategory = useDeleteCategory()
  const reorder = useReorderCategories()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExpenseCategory | undefined>(undefined)

  function openCreate() { setEditing(undefined); setShowForm(true) }
  function openEdit(c: ExpenseCategory) { setEditing(c); setShowForm(true) }
  function confirmDelete(c: ExpenseCategory) {
    if (confirm(`Remove "${c.label}"?`)) deleteCategory.mutate(c.id)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return
    const reordered = [...categories]
    const tmp = reordered[index]
    reordered[index] = reordered[target]
    reordered[target] = tmp
    reorder.mutate(reordered.map((c, i) => ({ id: c.id, sort_order: i + 1 })))
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={() => navigate('/internal/expenses')}>
          <ChevronLeft size={16} />
        </button>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, letterSpacing: '-0.03em' }}>Expense Categories</h1>
        <div style={{ flex: 1 }} />
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={openCreate}>
          <Plus size={14} /> Add
        </button>
      </div>

      <GlassCard style={{ padding: '8px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
        ) : categories.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No categories yet.
          </div>
        ) : (
          categories.map((c, i) => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderBottom: i < categories.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${c.color}22`,
                }}>
                  <Icon size={15} color={c.color} />
                </div>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{c.label}</span>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronUp size={13} />
                </button>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} disabled={i === categories.length - 1} onClick={() => move(i, 1)}>
                  <ChevronDown size={13} />
                </button>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => openEdit(c)}><Pencil size={13} /></button>
                <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => confirmDelete(c)}><Trash2 size={13} /></button>
              </div>
            )
          })
        )}
      </GlassCard>

      {showForm && <CategoryFormModal category={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
