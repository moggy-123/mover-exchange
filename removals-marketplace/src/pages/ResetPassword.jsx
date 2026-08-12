import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) { setError(error.message); return }

    setDone(true)
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Set a new password</h1>

      {done ? (
        <p style={{ color: 'var(--ok)' }}>Password updated — taking you to your dashboard…</p>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          <label>New password</label>
          <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          <label>Confirm new password</label>
          <input required type="password" minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} />
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Set new password'}</button>
        </form>
      )}
    </div>
  )
}
