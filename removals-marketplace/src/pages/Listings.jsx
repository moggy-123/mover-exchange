import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const COUNTRIES = ['United Kingdom', 'Ireland', 'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Portugal', 'Poland', 'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Norway']

const REGIONS_BY_COUNTRY = {
  'United Kingdom': ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia'],
  'Ireland': ['Leinster', 'Munster', 'Connacht', 'Ulster'],
  'France': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Hauts-de-France', 'Grand Est', 'Normandy', 'Brittany', 'Pays de la Loire'],
  'Germany': ['Bavaria', 'North Rhine-Westphalia', 'Baden-Württemberg', 'Lower Saxony', 'Hesse', 'Saxony', 'Berlin', 'Rhineland-Palatinate', 'Schleswig-Holstein', 'Brandenburg'],
  'Spain': ['Madrid', 'Catalonia', 'Andalusia', 'Valencia', 'Basque Country', 'Galicia', 'Castile and León', 'Canary Islands'],
  'Italy': ['Lombardy', 'Lazio', 'Campania', 'Sicily', 'Veneto', 'Piedmont', 'Emilia-Romagna', 'Tuscany'],
  'Netherlands': ['North Holland', 'South Holland', 'Utrecht', 'North Brabant', 'Gelderland', 'Overijssel'],
  'Belgium': ['Flanders', 'Wallonia', 'Brussels-Capital'],
  'Portugal': ['Lisbon', 'Porto', 'Algarve', 'Centro', 'Norte'],
  'Poland': ['Masovian', 'Silesian', 'Lesser Poland', 'Greater Poland', 'Lower Silesian', 'Pomeranian'],
  'Switzerland': ['Zurich', 'Geneva', 'Bern', 'Basel', 'Vaud', 'Ticino'],
  'Austria': ['Vienna', 'Lower Austria', 'Upper Austria', 'Styria', 'Tyrol'],
  'Denmark': ['Capital Region', 'Central Denmark', 'Southern Denmark', 'Zealand', 'North Denmark'],
  'Sweden': ['Stockholm', 'Västra Götaland', 'Skåne', 'Uppsala'],
  'Norway': ['Oslo', 'Viken', 'Vestland', 'Rogaland', 'Trøndelag'],
}

function regionsFor(country) {
  return REGIONS_BY_COUNTRY[country] || REGIONS_BY_COUNTRY['United Kingdom']
}

const COUNTRY_FLAGS = {
  'United Kingdom': '🇬🇧', 'Ireland': '🇮🇪', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Spain': '🇪🇸',
  'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Portugal': '🇵🇹', 'Poland': '🇵🇱',
  'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Denmark': '🇩🇰', 'Sweden': '🇸🇪', 'Norway': '🇳🇴',
}

function flagFor(country) {
  return COUNTRY_FLAGS[country] || '🌍'
}

export default function Listings() {
  const { company } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type: 'staff', direction: 'request', date_from: '', date_to: '',
    country: 'United Kingdom', region: '', town: '', postcode: '', rate: '', staff_needed: '', vehicle_type: '', with_driver: false,
  })

  async function loadListings() {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select('*, companies(name, region, verified, rating_avg, rating_count, contact_email)')
      .eq('status', 'open')
      .order('date_from', { ascending: true })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => { loadListings() }, [])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function notifyMatchingCompanies(listing) {
    const { data: matches } = await supabase
      .from('companies')
      .select('contact_email, notify_types, region')
      .neq('id', company.id)
      .not('contact_email', 'is', null)

    const interested = (matches || []).filter(c =>
      (c.region || []).includes(listing.region) &&
      (c.notify_types || ['staff', 'vehicle']).includes(listing.type)
    )

    for (const c of interested) {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: c.contact_email,
            subject: `New ${listing.type} listing in ${listing.region}, ${listing.country} — Mover-Exchange`,
            message: `${company.name} just posted a ${listing.direction === 'request' ? 'request for' : 'offer of'} ${listing.type} in ${listing.region}, ${listing.country} (${listing.location}). Log in to Mover-Exchange to view and respond.`,
          }),
        })
      } catch (err) {
        console.error('Notification failed for', c.contact_email, err)
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!company) { setError('You need a company profile to post a listing.'); return }
    setSaving(true)

    const detail = form.type === 'staff'
      ? { staff_needed: parseInt(form.staff_needed) || 1 }
      : { vehicle_type: form.vehicle_type, with_driver: form.with_driver }

    const { data: inserted, error } = await supabase.from('listings').insert({
      company_id: company.id,
      type: form.type,
      direction: form.direction,
      date_from: form.date_from,
      date_to: form.date_to || null,
      country: form.country,
      region: form.region,
      location: `${form.town}${form.postcode ? ', ' + form.postcode : ''}`,
      rate: form.rate ? parseFloat(form.rate) : null,
      detail,
    }).select().single()

    setSaving(false)
    if (error) { setError(error.message); return }

    setShowForm(false)
    setForm({ type: 'staff', direction: 'request', date_from: '', date_to: '', country: 'United Kingdom', region: '', town: '', postcode: '', rate: '', staff_needed: '', vehicle_type: '', with_driver: false })
    loadListings()

    if (inserted) notifyMatchingCompanies(inserted)
  }

  async function respond(listing) {
    if (!company) return
    const message = prompt('Message to the poster (optional):') || ''
    const { error } = await supabase.from('listing_responses').insert({
      listing_id: listing.id,
      responding_company_id: company.id,
      message,
    })
    if (error) { alert(error.message); return }

    alert('Response sent — the poster will be in touch if they accept.')

    const posterEmail = listing.companies?.contact_email
    if (posterEmail) {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: posterEmail,
            subject: 'New response to your listing — Mover-Exchange',
            message: `${company.name} responded to your listing on Mover-Exchange:\n\n"${message || '(no message included)'}"\n\nLog in to your "My Listings" page to accept or decline.`,
          }),
        })
      } catch (err) {
        console.error('Notification failed to send:', err)
      }
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Listings</h1>
        <button onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ Post a listing'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card">
          <label>What's this for?</label>
          <select value={form.type} onChange={e => update('type', e.target.value)}>
            <option value="staff">Staff</option>
            <option value="vehicle">Vehicle</option>
          </select>

          <label>Direction</label>
          <select value={form.direction} onChange={e => update('direction', e.target.value)}>
            <option value="request">I need this (request)</option>
            <option value="offer">I have spare capacity (offer)</option>
          </select>

          <label>Date from</label>
          <input required type="date" value={form.date_from} onChange={e => update('date_from', e.target.value)} />
          <label>Date to (optional, for multi-day)</label>
          <input type="date" value={form.date_to} onChange={e => update('date_to', e.target.value)} />

          <label>Country</label>
          <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, region: '' }))}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <p style={{ fontSize: 12.5, color: 'var(--slate)', marginTop: -6, marginBottom: 12 }}>
            Not always your own country — e.g. pick France if the job needs help there.
          </p>

          <label>Region</label>
          <select required value={form.region} onChange={e => update('region', e.target.value)}>
            <option value="">Select a region…</option>
            {regionsFor(form.country).map(r => <option key={r} value={r}>{r}</option>)}
          </select>

          <label>Town / city</label>
          <input required placeholder="e.g. Bristol" value={form.town} onChange={e => update('town', e.target.value)} />

          <label>Postcode</label>
          <input required placeholder="e.g. BS1 1AA" value={form.postcode} onChange={e => update('postcode', e.target.value)} />

          {form.type === 'staff' ? (
            <>
              <label>Staff needed</label>
              <input type="number" min="1" value={form.staff_needed} onChange={e => update('staff_needed', e.target.value)} />
            </>
          ) : (
            <>
              <label>Vehicle type</label>
              <input placeholder="e.g. Luton, 7.5t" value={form.vehicle_type} onChange={e => update('vehicle_type', e.target.value)} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={form.with_driver} onChange={e => update('with_driver', e.target.checked)} />
                With driver
              </label>
            </>
          )}

          <label>Rate (£/day, optional)</label>
          <input type="number" min="0" value={form.rate} onChange={e => update('rate', e.target.value)} />

          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <button type="submit" disabled={saving}>{saving ? 'Posting…' : 'Post listing'}</button>
        </form>
      )}

      {loading && <p>Loading…</p>}
      {!loading && listings.length === 0 && (
        <div className="empty-state">No open listings right now. Be the first to post one.</div>
      )}

      {listings.map(l => (
        <div key={l.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{l.companies?.name}</strong>
              {l.companies?.verified && <span className="badge verified" style={{ marginLeft: 6 }}>✓</span>}
            </div>
            <span className="status-pill open">{l.direction === 'request' ? 'Needs help' : 'Spare capacity'}</span>
          </div>
          <p style={{ margin: '8px 0', fontSize: 14 }}>
            <strong>{l.type === 'staff' ? `${l.detail?.staff_needed || 1} staff` : `${l.detail?.vehicle_type || 'Vehicle'}${l.detail?.with_driver ? ' (with driver)' : ''}`}</strong>
            {' · '}{flagFor(l.country)} {l.region}{l.location ? `, ${l.location}` : ''}{' · '}{l.date_from}{l.date_to ? ` to ${l.date_to}` : ''}
            {l.rate ? ` · £${l.rate}/day` : ''}
          </p>
          {company && l.company_id !== company.id && (
            <button onClick={() => respond(l)}>Respond</button>
          )}
        </div>
      ))}
    </div>
  )
}
