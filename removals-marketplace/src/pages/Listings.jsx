import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const REGIONS = ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia']

export default function Listings() {
  const { company } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type: 'staff', direction: 'request', date_from: '', date_to: '',
    region: '', location: '', rate: '', staff_needed: '', vehicle_type: '', with_driver: false,
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
    // Find companies covering this region, interested in this listing type,
    // who aren't the poster themselves and have a contact email on file.
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
            subject: `New ${listing.type} listing in ${listing.region} — Mover-Exchange`,
            message: `${company.name} just posted a ${listing.direction === 'request' ? 'request for' : 'offer of'} ${listing.type} in ${listing.region} (${listing.location}). Log in to Mover-Exchange to view and respond.`,
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
      region: form.region,
      location: form.location,
      rate: form.rate ? parseFloat(form.rate) : null,
      detail,
    }).select().single()

    setSaving(false)
    if (error) { setError(error.message); return }

    setShowForm(false)
    setForm({ type: 'staff', direction: 'request', date_from: '', date_to: '', region: '', location: '', rate: '', staff_needed: '', vehicle_type: '', with_driver: false })
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
            <option value="request">I need this
