import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateCategory, useUpdateCategory } from '../../hooks/useExpenses'
import { PRESET_ICONS, PRESET_COLORS, getCategoryIcon } from './ionicons-map'
import type { ExpenseCategory } from '../../types/expenses'

function slugify(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

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

export default function CategoryFormModal({ category, onClose }: { category?: ExpenseCategory; onClose: () => void }) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const isEdit = !!category

  const [label, setLabel] = useState(category?.label ?? '')
  const [icon, setIcon] = useState(category?.icon ?? PRESET_ICONS[0])
  const [color, setColor] = useState(category?.color ?? PRESET_COLORS[0])

  const loading = create.isPending || update.isPending
  const valid = label.trim().length > 0
  const PreviewIcon = getCategoryIcon(icon)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    if (isEdit && category) {
      await update.mutateAsync({ id: category.id, data: { label: label.trim(), icon, color } })
    } else {
      await create.mutateAsync({ label: label.trim(), slug: slugify(label), icon, color })
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
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Category' : 'New Category'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${color}22`,
            }}>
              <PreviewIcon size={18} color={color} />
            </div>
            <input style={inputStyle} placeholder="Category name *" value={label} onChange={e => setLabel(e.target.value)} autoFocus />
          </div>

          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {PRESET_ICONS.map(name => {
                const Icon = getCategoryIcon(name)
                const active = icon === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${active ? 'var(--border-active)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={15} color={active ? color : 'var(--text-secondary)'} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c, cursor: 'pointer',
                    border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !valid}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
