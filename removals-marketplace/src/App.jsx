import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const REGIONS = ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia']

export default function Profile() {
  const { company, refreshCompany } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    companyName: '', region: [], yearsTrading: '',
    fleetSize: '', staffCount: '', memberships: '',
    hasWarehouse: false, warehouseSqft: '', contactEmail: '',
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
