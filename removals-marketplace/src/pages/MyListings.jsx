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

const PAID_TYPES = ['vehicle_sale', 'storage', 'business_sale']

async function sendNotification(to, subject, message) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, message }),
    })
  } catch (err) {
    console.error('Notification failed to send:', err)
  }
}

function EditForm({ listing, onCancel, onSaved }) {
  const isPaidType = PAID_TYPES.includes(listing.type)
  const [form, setForm] = useState({
    date_from: listing.date_from || '',
    date_to: listing.date_to || '',
    country: listing.country || 'United Kingdom',
    region: listing.region || '',
    location: listing.location || '',
    rate: listing.rate ?? '',
    direction: listing.direction || 'request',
    staff_needed: listing.detail?.staff_needed ?? '',
    vehicle_type: listing.detail?.vehicle_type ?? '',
    with_driver: listing.detail?.with_driver ?? false,
    year: listing.detail?.year ?? '',
    mileage: listing.detail?.mileage ?? '',
    price: listing.detail?.price ?? listing.detail?.asking_price ?? '',
    sqft_available: listing.detail?.sqft_available ?? '',
    price_per_month: listing.detail?.price_per_month ?? '',
    description: listing.detail?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    setError('')
    setSaving(true)

    let detail = {}
    if (listing.type === 'staff') detail = { staff_needed: parseInt(form.staff_needed) || 1 }
    else if (listing.type === 'vehicle') detail = { vehicle_type: form.vehicle_type, with_driver: form.with_driver }
    else if (listing.type === 'vehicle_sale') detail = { vehicle_type: form.vehicle_type, year: form.year, mileage: form.mileage, price: form.price }
    else if (listing.type === 'storage') detail = { sqft_available: form.sqft_available, price_per_month: form.price_per_month }
    else if (listing.type === 'business_sale') detail = { asking_price: form.price, description: form.description }

    const { error } = await supabase
      .from('listings')
      .update({
        date_from: form.date_from,
        date_to: form.date_to || null,
        country: form.country,
        region: form.region,
        location: form.location,
        rate: form.rate ? parseFloat(form.rate) : null,
        direction: isPaidType ? 'offer' : form.direction,
        detail,
      })
      .eq('id', listing.id)

    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 12, paddingTop: 12 }}>
      {!isPaidType && (
        <>
          <label>Direction</label>
          <select value={form.direction} onChange={e => update('direction', e.target.value)}>
            <option value="request">I need this (request)</option>
            <option value="offer">I have spare capacity (offer)</option>
          </select>
        </>
      )}

      <label>{isPaidType ? 'Date listed' : 'Date from'}</label>
      <input type="date" value={form.date_from} onChange={e => update('date_from', e.target.value)} />

      {!isPaidType && (
        <>
          <label>Date to (optional)</label>
          <input type="date" value={form.date_to} onChange={e => update('date_to', e.target.value)} />
        </>
      )}

      <label>Country</label>
      <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, region: '' }))}>
        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label>Region</label>
      <select value={form.region} onChange={e => update('region', e.target.value)}>
        <option value="">Select a region…</option>
        <option value="All Regions">All Regions</option>
        {regionsFor(form.country).map(r => <option key={r} value={r}>{r}</option>)}
      </select>

      <label>Location (town / postcode)</label>
      <input value={form.location} onChange={e => update('location', e.target.value)} />

      {listing.type === 'staff' && (
        <>
          <label>Staff needed</label>
          <input type="number" min="1" value={form.staff_needed} onChange={e => update('staff_needed', e.target.value)} />
        </>
      )}

      {listing.type === 'vehicle' && (
        <>
          <label>Vehicle type</label>
          <input value={form.vehicle_type} onChange={e => update('vehicle_type', e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.with_driver} onChange={e => update('with_driver', e.target.checked)} />
            With driver
          </label>
        </>
      )}

      {listing.type === 'vehicle_sale' && (
        <>
          <label>Vehicle type</label>
          <input value={form.vehicle_type} onChange={e => update('vehicle_type', e.target.value)} />
          <label>Year</label>
          <input value={form.year} onChange={e => update('year', e.target.value)} />
          <label>Mileage</label>
          <input value={form.mileage} onChange={e => update('mileage', e.target.value)} />
          <label>Price (£)</label>
          <input type="number" min="0" value={form.price} onChange={e => update('price', e.target.value)} />
        </>
      )}

      {listing.type === 'storage' && (
        <>
          <label>Storage available (sq ft)</label>
          <input type="number" min="0" value={form.sqft_available} onChange={e => update('sqft_available', e.target.value)} />
          <label>Price per month (£)</label>
          <input type="number" min="0" value={form.price_per_month} onChange={e => update('price_per_month', e.target.value)} />
        </>
      )}

      {listing.type === 'business_sale' && (
        <>
          <label>Asking price (£)</label>
          <input type="number" min="0" value={form.price} onChange={e => update('price', e.target.value)} />
          <label>Description</label>
          <textarea rows={4} value={form.description} onChange={e => update('description', e.target.value)} />
        </>
      )}

      {!isPaidType && (
        <>
          <label>Rate (£/day, optional)</label>
          <input type="number" min="0" value={form.rate} onChange={e => update('rate', e.target.value)} />
        </>
      )}

      {error && <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button className="secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}

export default function MyListings() {
  const { company } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)

  async function load() {
    if (!company) return
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select('*, listing_responses(*, companies(name, contact_email))')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [company])

  async function respondTo(listingId, responseId, decision, responderEmail) {
    const { error } = await supabase
      .from('listing_responses')
      .update({ status: decision })
      .eq('id', responseId)

    if (error) { alert(error.message); return }

    if (decision === 'accepted') {
      await supabase.from('listings').update({ status: 'matched' }).eq('id', listingId)

      if (responderEmail) {
        await sendNotification(
          responderEmail,
          'Your response was accepted — Mover-Exchange',
          `Good news — ${company.name} accepted your response on Mover-Exchange. Log in to see contact details and arrange the details.`
        )
      }
    }

    load()
  }

  if (!company) {
    return <div className="container"><p>You need a company profile to see your listings.</p></div>
  }

  return (
    <div className="container">
      <h1>My listings</h1>
      <p className="page-lead">Listings you've posted, and any responses from other members.</p>

      {loading && <p>Loading…</p>}
      {!loading && listings.length === 0 && (
        <div className="empty-state">You haven't posted any listings yet — head to the Listings page to post one.</div>
      )}

      {listings.map(l => (
        <div key={l.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>{l.type === 'staff' ? `${l.detail?.staff_needed || 1} staff` : `${l.detail?.vehicle_type || l.type}`}</strong>
              <span style={{ color: 'var(--slate)', fontSize: 13, marginLeft: 8 }}>
                {l.region} · {l.location} · {l.date_from}{l.date_to ? ` to ${l.date_to}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-pill ${l.status}`}>{l.status}</span>
              {editingId !== l.id && (
                <button className="secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => setEditingId(l.id)}>Edit</button>
              )}
            </div>
          </div>

          {editingId === l.id && (
            <EditForm
              listing={l}
              onCancel={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); load() }}
            />
          )}

          <div style={{ marginTop: 14 }}>
            {(l.listing_responses || []).length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--slate)' }}>No responses yet.</p>
            )}
            {(l.listing_responses || []).map(r => (
              <div key={r.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{r.companies?.name || 'A member'}</strong>
                    {r.message && <p style={{ margin: '4px 0 0', fontSize: 14 }}>{r.message}</p>}
                    {r.status === 'accepted' && (
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ok)' }}>
                        ✓ Accepted — contact: {r.companies?.contact_email || 'not provided'}
                      </p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => respondTo(l.id, r.id, 'accepted', r.companies?.contact_email)}>Accept</button>
                      <button className="secondary" onClick={() => respondTo(l.id, r.id, 'declined')}>Decline</button>
                    </div>
                  )}
                  {r.status === 'declined' && <span className="status-pill closed">Declined</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
