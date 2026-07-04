import { useState } from 'react'
import { Trash2, Sparkles, X } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import {
  useTripPacking, useTogglePackingItem, useCreatePackingItem,
  useDeletePackingItem, useClearPacking, useAiPacking,
} from '../../../hooks/useTrips'

const PACKING_CATS = ['general','documents','clothing','electronics','toiletries','health','food','other']

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 13,
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'Inter', colorScheme: 'dark',
}

export default function PackingTab({ tripId }: { tripId: number }) {
  const { data: items = [], isLoading } = useTripPacking(tripId)
  const toggle = useTogglePackingItem()
  const addItem = useCreatePackingItem()
  const deleteItem = useDeletePackingItem()
  const clearAll = useClearPacking()
  const aiPacking = useAiPacking()

  const [newItem, setNewItem] = useState('')
  const [newCat, setNewCat] = useState('general')

  const packed = items.filter(i => i.packed).length
  const total = items.length
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0

  const byCategory: Record<string, typeof items> = {}
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim()) return
    await addItem.mutateAsync({ tripId, item: newItem.trim(), category: newCat })
    setNewItem('')
  }

  function handleClearAll() {
    if (!confirm('Clear all packing items?')) return
    clearAll.mutate(tripId)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={20} /></div>}

      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: 6, borderRadius: 3, width: `${pct}%`, background: '#10b981', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono', color: 'var(--text-secondary)', minWidth: 80, textAlign: 'right' }}>
            {packed}/{total} packed ({pct}%)
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          onClick={() => aiPacking.mutate(tripId)}
          disabled={aiPacking.isPending}
        >
          {aiPacking.isPending ? <Spinner size={12} /> : <Sparkles size={12} />}
          AI Suggest
        </button>
        {total > 0 && (
          <button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef4444' }}
            onClick={handleClearAll}
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <GlassCard key={cat} style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)} ({catItems.filter(i => i.packed).length}/{catItems.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {catItems.map(item => (
              <div key={item.id} className="pack-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <input
                  type="checkbox"
                  checked={item.packed}
                  onChange={() => toggle.mutate({ tripId, itemId: item.id })}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent-cyan)', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{
                  flex: 1, fontSize: 13,
                  color: item.packed ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: item.packed ? 'line-through' : 'none',
                }}>
                  {item.item}
                </span>
                <button className="btn-ghost pack-del" style={{ padding: '3px 5px', opacity: 0, color: '#ef4444', transition: 'opacity 0.15s' }}
                  onClick={() => deleteItem.mutate({ tripId, itemId: item.id })}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}

      <GlassCard style={{ padding: 16 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="New item..." value={newItem} onChange={e => setNewItem(e.target.value)} />
          <select style={{ ...inputStyle, width: 130, cursor: 'pointer' }} value={newCat} onChange={e => setNewCat(e.target.value)}>
            {PACKING_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <button type="submit" className="btn-primary" disabled={addItem.isPending || !newItem.trim()}>Add</button>
        </form>
      </GlassCard>

      {items.length === 0 && !isLoading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
          No items yet. Click AI Suggest or add items manually.
        </div>
      )}

      <style>{`.pack-row:hover .pack-del { opacity: 1 !important; }`}</style>
    </div>
  )
}
