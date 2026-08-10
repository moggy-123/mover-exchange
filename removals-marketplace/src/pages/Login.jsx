import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setSaving(false)
    if (error) { setError(error.message); return }
    navigate('/dashboard')
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
        <button type="submit" disabled={saving}>{saving ? 'Logging in…' : 'Log in'}</button>
      </form>
      <p style={{ fontSize: 14 }}>New here? <Link to="/signup">Create a company account</Link></p>
    </div>
  )
}
