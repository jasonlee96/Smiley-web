import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import Spinner from '../../../components/Spinner'
import { useAssets, useDeleteAsset, useUpdateAssetValue } from '../../../hooks/useNetworth'
import AssetFormModal from '../AssetFormModal'
import type { Asset } from '../../../types/networth'

const ASSET_TYPE_LABELS: Record<string, string> = {
  property: 'Property', vehicle: 'Vehicle', cash: 'Cash', investment: 'Investment',
  epf: 'EPF / KWSP', fd: 'Fixed Deposit', crypto: 'Crypto', other: 'Other',
}

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AssetsTab() {
  const { data: assets = [], isLoading } = useAssets()
  const deleteAsset = useDeleteAsset()
  const updateValue = useUpdateAssetValue()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Asset | undefined>(undefined)
  const [editingValueId, setEditingValueId] = useState<number | null>(null)
  const [valueInput, setValueInput] = useState('')

  function openCreate() { setEditing(undefined); setShowForm(true) }
  function openEdit(a: Asset) { setEditing(a); setShowForm(true) }

  function startValueEdit(a: Asset) {
    setEditingValueId(a.id)
    setValueInput(String(a.value))
  }

  function saveValueEdit(id: number) {
    const n = parseFloat(valueInput)
    if (isFinite(n) && n >= 0) {
      updateValue.mutate({ id, value: n })
    }
    setEditingValueId(null)
  }

  function confirmDelete(a: Asset) {
    if (confirm(`Remove "${a.name}"?`)) deleteAsset.mutate(a.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }} onClick={openCreate}>
          <Plus size={14} /> New Asset
        </button>
      </div>

      <GlassCard style={{ padding: '12px 8px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner /></div>
        ) : assets.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No assets yet. Click + New Asset to add one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Name', 'Type', 'Value', 'Institution', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: h === 'Name' ? 'left' : h === 'Actions' ? 'center' : 'right',
                      fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{a.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'IBM Plex Mono' }}>
                      {editingValueId === a.id ? (
                        <input
                          autoFocus
                          type="number"
                          value={valueInput}
                          onChange={e => setValueInput(e.target.value)}
                          onBlur={() => saveValueEdit(a.id)}
                          onKeyDown={e => { if (e.key === 'Enter') saveValueEdit(a.id) }}
                          style={{
                            width: 100, padding: '4px 6px', borderRadius: 6, textAlign: 'right',
                            border: '1px solid var(--border-active)', background: 'var(--bg-elevated)',
                            color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono', fontSize: 13,
                          }}
                        />
                      ) : (
                        <span style={{ cursor: 'pointer' }} title="Click to edit" onClick={() => startValueEdit(a)}>
                          {a.currency !== 'MYR' && `${a.currency} ${fmt(a.current_value_local)} · `}
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>RM {fmt(a.current_value_myr)}</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>{a.institution ?? '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button className="btn-ghost" style={{ padding: '4px 6px', marginRight: 4 }} onClick={() => openEdit(a)}><Pencil size={13} /></button>
                      <button className="btn-ghost" style={{ padding: '4px 6px', color: '#ef4444' }} onClick={() => confirmDelete(a)}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {showForm && <AssetFormModal asset={editing} onClose={() => setShowForm(false)} />}
    </div>
  )
}
