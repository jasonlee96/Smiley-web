import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateAsset, useUpdateAsset } from '../../hooks/useNetworth'
import type { Asset, AssetType, DepreciationType } from '../../types/networth'

const CURRENCIES = ['MYR', 'SGD', 'USD', 'GBP', 'EUR', 'JPY', 'AUD'] as const
const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'property', label: 'Property' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'epf', label: 'EPF / KWSP' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'other', label: 'Other' },
]
const DEPRECIATION_TYPES: { value: DepreciationType; label: string }[] = [
  { value: 'manual', label: 'Manual (I update value myself)' },
  { value: 'straight_line', label: 'Straight-line' },
  { value: 'declining_balance', label: 'Declining balance' },
]

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

export default function AssetFormModal({ asset, onClose }: { asset?: Asset; onClose: () => void }) {
  const create = useCreateAsset()
  const update = useUpdateAsset()
  const isEdit = !!asset

  const [name, setName] = useState(asset?.name ?? '')
  const [assetType, setAssetType] = useState<AssetType>(asset?.asset_type ?? 'cash')
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>((asset?.currency as any) ?? 'MYR')
  const [value, setValue] = useState(asset ? String(asset.value) : '')
  const [institution, setInstitution] = useState(asset?.institution ?? '')
  const [notes, setNotes] = useState(asset?.notes ?? '')
  const [purchasePrice, setPurchasePrice] = useState(asset?.purchase_price != null ? String(asset.purchase_price) : '')
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchase_date?.slice(0, 10) ?? '')
  const [depreciationType, setDepreciationType] = useState<DepreciationType>(asset?.depreciation_type ?? 'manual')

  const loading = create.isPending || update.isPending
  const valid = name.trim() && value !== '' && !isNaN(parseFloat(value))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const data: Partial<Asset> = {
      name: name.trim(),
      asset_type: assetType,
      currency,
      value: parseFloat(value),
      institution: institution.trim() || null,
      notes: notes.trim() || null,
      purchase_price: assetType === 'vehicle' && purchasePrice ? parseFloat(purchasePrice) : null,
      purchase_date: assetType === 'vehicle' && purchaseDate ? purchaseDate : null,
      depreciation_type: assetType === 'vehicle' ? depreciationType : null,
    }
    if (isEdit && asset) {
      await update.mutateAsync({ id: asset.id, data })
    } else {
      await create.mutateAsync(data)
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
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Asset' : 'New Asset'}
          </span>
          <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input style={inputStyle} placeholder="Asset name *" value={name} onChange={e => setName(e.target.value)} autoFocus />

          <div>
            <label style={labelStyle}>Type</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={assetType} onChange={e => setAssetType(e.target.value as AssetType)}>
              {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Currency</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={currency} onChange={e => setCurrency(e.target.value as any)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Value *</label>
              <input type="number" style={inputStyle} placeholder="0.00" value={value} onChange={e => setValue(e.target.value)} />
            </div>
          </div>

          <input style={inputStyle} placeholder="Institution" value={institution} onChange={e => setInstitution(e.target.value)} />

          {assetType === 'vehicle' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Purchase price</label>
                  <input type="number" style={inputStyle} placeholder="0.00" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Purchase date</label>
                  <input type="date" style={inputStyle} value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Depreciation</label>
                <select style={{ ...inputStyle, cursor: 'pointer' }} value={depreciationType} onChange={e => setDepreciationType(e.target.value as DepreciationType)}>
                  {DEPRECIATION_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </>
          )}

          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || !valid}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
