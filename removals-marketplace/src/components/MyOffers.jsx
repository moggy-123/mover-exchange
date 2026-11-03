import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const STATUS = {
  pending:  { label: 'Pending',      bg: '#fff4d6', fg: '#8a6100' },
  accepted: { label: '✓ Accepted',   bg: '#dff5e3', fg: '#14702b' },
  declined: { label: 'Declined',     bg: '#fde2e2', fg: '#a12121' },
}

export default function MyOffers() {
  const [offers, setOffers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData?.user?.id
      if (!uid) return
      const { data: cu } = await supabase
        .from('company_users').select('company_id').eq('id', uid).single()
      if (!cu) { if (!cancelled) setOffers([]); return }

      const { data: responses, error: rErr } = await supabase
        .from('listing_responses')
        .select('id, status, message, created_at, listing_id')
        .eq('responding_company_id', cu.company_id)
        .order('created_at', { ascending: false })
      if (rErr) { if (!cancelled) setError(rErr.message); return }
      if (!responses?.length) { if (!cancelled) setOffers([]); return }

      const { data: listings } = await supabase
        .from('listings').select('*')
        .in('id', responses.map(r => r.listing_id))
      const posterIds = [...new Set((listings || []).map(l => l.company_id))]
      const { data: posters } = posterIds.length
        ? await supabase.from('companies').select('id, name, contact_email').in('id', posterIds)
        : { data: [] }

      const lMap = Object.fromEntries((listings || []).map(l => [l.id, l]))
      const pMap = Object.fromEntries((posters || []).map(p => [p.id, p]))
      const rows = responses.map(r => {
        const listing = lMap[r.listing_id]
        return { ...r, listing, poster: listing ? pMap[listing.company_id] : null }
      })
      if (!cancelled) setOffers(rows)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (error) return <p style={{ color: '#a12121' }}>Couldn't load your offers: {error}</p>
  if (offers === null) return <p>Loading your offers…</p>

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Offers I've made</h2>
      {offers.length === 0 && <p>You haven't replied to any listings yet.</p>}
      {offers.map(o => {
        const s = STATUS[o.status] || STATUS.pending
        const l = o.listing
        return (
          <div key={o.id} className="card" style={{ padding: 16, marginBottom: 12, border: '1px solid #ddd', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong>{o.poster?.name || 'Another company'}</strong>
              <span style={{ background: s.bg, color: s.fg, padding: '2px 10px', borderRadius: 999, fontWeight: 600, fontSize: 13 }}>
                {s.label}
              </span>
            </div>
            {l && (
              <div style={{ fontSize: 14, margin: '6px 0' }}>
                {(l.type || '').replace('_', ' ')} · {l.direction}
                {l.location ? ` · ${l.location}` : ''}
                {l.region ? ` · ${l.region}` : ''}
                {l.date_from ? ` · ${l.date_from}${l.date_to ? ' → ' + l.date_to : ''}` : ''}
              </div>
            )}
            {o.message && <div style={{ fontSize: 14, fontStyle: 'italic' }}>"{o.message}"</div>}
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Sent {new Date(o.created_at).toLocaleDateString('en-GB')}
            </div>
            {o.status === 'accepted' && (
              <div style={{ marginTop: 10, padding: 10, background: '#eefaf0', borderRadius: 8 }}>
                Accepted — contact {o.poster?.name}:{' '}
                {o.poster?.contact_email
                  ? <a href={`mailto:${o.poster.contact_email}`}>{o.poster.contact_email}</a>
                  : 'no contact email on their profile yet'}
              </div>
            )}
            {o.status === 'declined' && (
              <div style={{ marginTop: 8, fontSize: 14 }}>They've chosen not to take this one up.</div>
            )}
          </div>
        )
      })}
    </section>
  )
}
