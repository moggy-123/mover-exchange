import { createClient } from '@supabase/supabase-js'

// This runs entirely on Vercel's servers, triggered automatically by a
// Supabase Database Webhook the moment a new listing is inserted — not
// triggered from the browser, so it works even if the person who posted
// closes the tab immediately after.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Only Supabase (which knows the secret) should be able to trigger this
  const secret = req.headers['x-webhook-secret']
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const listing = req.body?.record
  if (!listing) {
    return res.status(400).json({ error: 'No listing record in payload' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceKey || !resendKey) {
    console.error('Missing required environment variables')
    return res.status(500).json({ error: 'Server not configured' })
  }

  // Service role key bypasses RLS — safe here since this only ever runs
  // server-side, never exposed to the browser.
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const [{ data: matches }, { data: poster }] = await Promise.all([
      supabase
        .from('companies')
        .select('contact_email, notify_types, region')
        .neq('id', listing.company_id)
        .not('contact_email', 'is', null),
      supabase
        .from('companies')
        .select('name')
        .eq('id', listing.company_id)
        .single(),
    ])

    const interested = (matches || []).filter(c =>
      (listing.region === 'All Regions' || (c.region || []).includes(listing.region)) &&
      (c.notify_types || ['staff', 'vehicle']).includes(listing.type)
    )

    const posterName = poster?.name || 'A member'
    const results = []

    for (const c of interested) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Mover-Exchange <notifications@windscreenrepairsbristol.co.uk>',
            to: [c.contact_email],
            subject: `New ${listing.type} listing in ${listing.region}, ${listing.country} — Mover-Exchange`,
            html: `<p>${posterName} just posted a ${listing.direction === 'request' ? 'request for' : 'offer of'} ${listing.type} in ${listing.region}, ${listing.country} (${listing.location || ''}). Log in to Mover-Exchange to view and respond.</p>`,
          }),
        })
        results.push({ to: c.contact_email, ok: response.ok })
      } catch (err) {
        console.error('Notify error for', c.contact_email, err)
        results.push({ to: c.contact_email, ok: false })
      }
    }

    return res.status(200).json({ sent: results.length, results })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Unexpected error' })
  }
}
