import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSaving(false)
    if (error) { setError(error.message); return }
    navigate('/dashboard')
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email above first, then click "Forgot password?"'); return }
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message); return }
    setResetSent(true)
  }

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} className="card">
        <label>Email</label>
        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <label>Password</label>
        <input required type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {resetSent && <p style={{ color: 'var(--ok)' }}>Reset link sent — check your email.</p>}
        <button type="submit" disabled={saving}>{saving ? 'Logging in…' : 'Log in'}</button>
        <button type="button" className="secondary" onClick={handleForgotPassword} style={{ marginTop: 10 }}>
          Forgot password?
        </button>
      </form>
      <p style={{ fontSize: 14 }}>New here? <Link to="/signup">Create a company account</Link></p>
    </div>
  )
}
