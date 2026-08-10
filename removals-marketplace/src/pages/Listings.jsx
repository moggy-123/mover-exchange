import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

export default function Listings() {
  const { company } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type: 'staff', direction: 'request', date_from: '', date_to: '',
    location: '', rate: '', staff_needed: '', vehicle_type: '', with_driver: false,
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!company) { setError('You need a company profile to post a listing.'); return }
    setSaving(true)

    const detail = form.type === 'staff'
      ? { staff_needed: parseInt(form.staff_needed) || 1 }
      : { vehicle_type: form.vehicle_type, with_driver: form.with_driver }

    const { error } = await supabase.from('listings').insert({
      company_id: company.id,
      type: form.type,
      direction: form.direction,
      date_from: form.date_from,
      date_to: form.date_to || null,
      location: form.location,
      rate: form.rate ? parseFloat(form.rate) : null,
      detail,
    })

    setSaving(false)
    if (error) { setError(error.message); return }

    setShowForm(false)
    setForm({ type: 'staff', direction: 'request', date_from: '', date_to: '', location: '', rate: '', staff_needed: '', vehicle_type: '', with_driver: false })
    loadListings()
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
            message: `${company.name} responded to your listing on Mover-Exchange. Log in to your "My Listings" page to view it and accept or decline.`,
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

          <label>Location</label>
          <input required placeholder="e.g. Bristol, BS1" value={form.location} onChange={e => update('location', e.target.value)} />

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
            {' · '}{l.location}{' · '}{l.date_from}{l.date_to ? ` to ${l.date_to}` : ''}
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
