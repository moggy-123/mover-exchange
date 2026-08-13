import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const REGIONS = ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia']

function DepotsSection({ company }) {
  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [newDepot, setNewDepot] = useState({ name: '', address: '', region: '', postcode: '' })

  async function loadDepots() {
    setLoading(true)
    const { data } = await supabase
      .from('depots')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
    setDepots(data || [])
    setLoading(false)
  }

  useEffect(() => { loadDepots() }, [company.id])

  async function addDepot(e) {
    e.preventDefault()
    setError('')
    if (!newDepot.address || !newDepot.region) { setError('Address and region are required.'); return }
    setAdding(true)

    const { error } = await supabase.from('depots').insert({
      company_id: company.id,
      name: newDepot.name || null,
      address: newDepot.address,
      region: newDepot.region,
      postcode: newDepot.postcode || null,
    })

    setAdding(false)
    if (error) { setError(error.message); return }

    setNewDepot({ name: '', address: '', region: '', postcode: '' })
    loadDepots()
  }

  async function removeDepot(id) {
    const { error } = await supabase.from('depots').delete().eq('id', id)
    if (error) { alert(error.message); return }
    loadDepots()
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Depots</h3>
      <p style={{ color: 'var(--slate)', fontSize: 13.5, marginTop: 0, marginBottom: 14 }}>
        Add every location you operate from — this helps other movers find capacity near them.
      </p>

      {loading && <p style={{ fontSize: 13, color: 'var(--slate)' }}>Loading…</p>}

      {!loading && depots.map(d => (
        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
          <div>
            <strong style={{ fontSize: 14 }}>{d.name || d.region}</strong>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--slate)' }}>{d.address}{d.postcode ? `, ${d.postcode}` : ''} · {d.region}</p>
          </div>
          <button className="secondary" onClick={() => removeDepot(d.id)} style={{ fontSize: 12, padding: '6px 10px' }}>Remove</button>
        </div>
      ))}

      <form onSubmit={addDepot} style={{ marginTop: 18, paddingTop: 14, borderTop: depots.length ? '1px solid var(--line)' : 'none' }}>
        <label>Depot name (optional, e.g. "Bristol depot")</label>
        <input value={newDepot.name} onChange={e => setNewDepot(d => ({ ...d, name: e.target.value }))} />

        <label>Address</label>
        <input required value={newDepot.address} onChange={e => setNewDepot(d => ({ ...d, address: e.target.value }))} placeholder="e.g. Unit 4, Anywhere Trading Estate, Bristol" />

        <label>Postcode</label>
        <input value={newDepot.postcode} onChange={e => setNewDepot(d => ({ ...d, postcode: e.target.value }))} />

        <label>Region</label>
        <select required value={newDepot.region} onChange={e => setNewDepot(d => ({ ...d, region: e.target.value }))}>
          <option value="">Select a region…</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {error && <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={adding}>{adding ? 'Adding…' : '+ Add depot'}</button>
      </form>
    </div>
  )
}

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
    notifyStaff: true, notifyVehicle: true, address: '',
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
        notifyStaff: (company.notify_types || ['staff', 'vehicle']).includes('staff'),
        notifyVehicle: (company.notify_types || ['staff', 'vehicle']).includes('vehicle'),
        address: company.address || '',
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
        notify_types: [
          ...(form.notifyStaff ? ['staff'] : []),
          ...(form.notifyVehicle ? ['vehicle'] : []),
        ],
        address: form.address,
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

        <label>Full address (HQ)</label>
        <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="e.g. 12 Anywhere Street, Bristol, BS1 1AA" />

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

        <label>Email me about new listings for:</label>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, marginBottom: 6 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.notifyStaff} onChange={e => update('notifyStaff', e.target.checked)} />
            Staff requests/offers
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.notifyVehicle} onChange={e => update('notifyVehicle', e.target.checked)} />
            Vehicle requests/offers
          </label>
        </div>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {saved && <p style={{ color: 'var(--ok)' }}>Saved.</p>}

        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </form>

      <DepotsSection company={company} />
    </div>
  )
}
