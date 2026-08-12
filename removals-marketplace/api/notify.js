// This runs on Vercel's servers, not in the browser — so it's safe to keep
// the Resend API key secret here (set as an environment variable in Vercel).
//
// It deploys automatically the same way as the rest of the app: no extra
// setup needed beyond adding the RESEND_API_KEY environment variable.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, subject, message } = req.body || {}

  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'Missing to, subject, or message' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set in Vercel environment variables')
    return res.status(500).json({ error: 'Email service not configured' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Sending from your verified domain — works for any recipient now,
        // not just your own Resend account email.
        from: 'Mover-Exchange <notifications@windscreenrepairsbristol.co.uk>',
        to: [to],
        subject,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Resend error:', errText)
      return res.status(502).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ sent: true })
  } catch (err) {
    console.error('Notification error:', err)
    return res.status(500).json({ error: 'Unexpected error sending email' })
  }
}
