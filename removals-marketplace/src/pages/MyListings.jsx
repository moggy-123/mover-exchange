import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

async function sendNotification(to, subject, message) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, message }),
    })
  } catch (err) {
    // Don't block the UI if the email fails — the in-app data is still saved
    console.error('Notification failed to send:', err)
  }
}

export default function MyListings() {
  const { company } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

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

  async function respondTo(listingId, responseId, decision, responderEmail, responderName) {
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
      <p style={{ color: 'var(--slate)' }}>Listings you've posted, and any responses from other members.</p>

      {loading && <p>Loading…</p>}
      {!loading && listings.length === 0 && (
        <div className="empty-state">You haven't posted any listings yet — head to the Listings page to post one.</div>
      )}

      {listings.map(l => (
        <div key={l.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>{l.type === 'staff' ? `${l.detail?.staff_needed || 1} staff` : `${l.detail?.vehicle_type || 'Vehicle'}`}</strong>
              <span style={{ color: 'var(--slate)', fontSize: 13, marginLeft: 8 }}>
                {l.location} · {l.date_from}{l.date_to ? ` to ${l.date_to}` : ''}
              </span>
            </div>
            <span className={`status-pill ${l.status}`}>{l.status}</span>
          </div>

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
                      <button onClick={() => respondTo(l.id, r.id, 'accepted', r.companies?.contact_email, r.companies?.name)}>Accept</button>
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
