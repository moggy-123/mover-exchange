import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const REGIONS = ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia']

export default function Profile() {
  const { company, refreshCompany } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false) // false | 'logo' | 'photo'

  const [form, setForm] = useState({
    companyName: '', region: [], yearsTrading: '',
    fleetSize: '', staffCount: '', memberships: '',
    hasWarehouse: false, warehouseSqft: '', contactEmail: '', logoUrl: '', photoUrl: '',
  })

  useEffect(() => {
    if (company) {
      setForm({
        companyName: company.name || '',
        region: company.region || [],
        yearsTrading: company.years_trading ?? '',
        fleetSize: company.fleet_size ?? '',
        staffCount: company.staff_count ?? '',
        memberships: (company.memberships || []).join(', '),
        hasWarehouse: !!company.warehouse_sqft,
        warehouseSqft: company.warehouse_sqft ?? '',
        contactEmail: company.contact_email || '',
        logoUrl: company.logo_url || '',
        photoUrl: company.photo_url || '',
      })
    }
  }, [company])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function toggleRegion(r) {
    setForm(f => ({
      ...f,
      region: f.region.includes(r) ? f.region.filter(x => x !== r) : [...f.region, r]
    }))
    setSaved(false)
  }

  async function handleImageUpload(e, kind) {
    // kind is 'logo' or 'photo'
    const file = e.target.files?.[0]
    if (!file || !company) return

    setUploading(kind)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${company.id}/${kind}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage
      .from('company-logos')
      .getPublicUrl(path)

    // Cache-bust so the new image shows immediately instead of a stale cached one
    const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`
    const dbField = kind === 'logo' ? 'logo_url' : 'photo_url'

    const { error: updateError } = await supabase
      .from('companies')
      .update({ [dbField]: freshUrl })
      .eq('id', company.id)

    setUploading(false)
    if (updateError) { setError(updateError.message); return }

    update(kind === 'logo' ? 'logoUrl' : 'photoUrl', freshUrl)
    refreshCompany()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase
      .from('companies')
      .update({
        name: form.companyName,
        region: form.region,
        years_trading: parseInt(form.yearsTrading) || null,
        fleet_size: parseInt(form.fleetSize) || 0,
        staff_count: parseInt(form.staffCount) || 0,
        memberships: form.memberships ? form.memberships.split(',').map(s => s.trim()).filter(Boolean) : [],
        warehouse_sqft: form.hasWarehouse ? (parseInt(form.warehouseSqft) || null) : null,
        contact_email: form.contactEmail,
      })
      .eq('id', company.id)

    setSaving(false)
    if (error) { setError(error.message); return }

    setSaved(true)
    refreshCompany()
  }

  if (!company) {
    return <div className="container"><p>Loading your profile…</p></div>
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1>Edit profile</h1>
      <p style={{ color: 'var(--slate)' }}>These details show up on your trading card for other members to see.</p>

      <form onSubmit={handleSubmit} className="card">
        <label>Company logo (shown top-left on your card)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 10, background: 'var(--ice-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            border: '1px solid var(--line)', flexShrink: 0,
          }}>
            {form.logoUrl
              ? <img src={form.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 11, color: 'var(--slate)', textAlign: 'center' }}>No logo</span>}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={e => handleImageUpload(e, 'logo')}
              disabled={!!uploading}
              style={{ marginBottom: 0 }}
            />
            {uploading === 'logo' && <p style={{ fontSize: 12, color: 'var(--slate)', margin: '4px 0 0' }}>Uploading…</p>}
          </div>
        </div>

        <label>Company photo (main image on your card, e.g. your fleet)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 110, height: 72, borderRadius: 10, background: 'var(--ice-tint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            border: '1px solid var(--line)', flexShrink: 0,
          }}>
            {form.photoUrl
              ? <img src={form.photoUrl} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 11, color: 'var(--slate)', textAlign: 'center' }}>No photo</span>}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={e => handleImageUpload(e, 'photo')}
              disabled={!!uploading}
              style={{ marginBottom: 0 }}
            />
            {uploading === 'photo' && <p style={{ fontSize: 12, color: 'var(--slate)', margin: '4px 0 0' }}>Uploading…</p>}
          </div>
        </div>

        <label>Company name</label>
        <input required value={form.companyName} onChange={e => update('companyName', e.target.value)} />

        <label>Regions covered</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {REGIONS.map(r => (
            <span
              key={r}
              onClick={() => toggleRegion(r)}
              className="badge"
              style={{
                cursor: 'pointer',
                background: form.region.includes(r) ? 'var(--sky)' : 'var(--ice-tint)',
                color: form.region.includes(r) ? 'white' : 'var(--navy)',
              }}
            >
              {r}
            </span>
          ))}
        </div>

        <label>Years trading</label>
        <input type="number" min="0" value={form.yearsTrading} onChange={e => update('yearsTrading', e.target.value)} />

        <label>Fleet size (number of vehicles)</label>
        <input type="number" min="0" value={form.fleetSize} onChange={e => update('fleetSize', e.target.value)} />

        <label>Staff count</label>
        <input type="number" min="0" value={form.staffCount} onChange={e => update('staffCount', e.target.value)} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={form.hasWarehouse}
            onChange={e => update('hasWarehouse', e.target.checked)}
          />
          We have warehouse or storage space
        </label>

        {form.hasWarehouse && (
          <>
            <label>Warehouse size (sq ft)</label>
            <input type="number" min="0" value={form.warehouseSqft} onChange={e => update('warehouseSqft', e.target.value)} />
          </>
        )}

        <label>Memberships (comma separated, e.g. BAR, RHA)</label>
        <input value={form.memberships} onChange={e => update('memberships', e.target.value)} />

        <label>Contact email</label>
        <input type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} />

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {saved && <p style={{ color: 'var(--ok)' }}>Saved.</p>}

        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  )
}
