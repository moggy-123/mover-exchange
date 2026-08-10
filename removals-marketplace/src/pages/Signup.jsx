import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const REGIONS = ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia']

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', yourName: '',
    companyName: '', region: [], yearsTrading: '',
    fleetSize: '', staffCount: '', memberships: '',
  })

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleRegion(r) {
    setForm(f => ({
      ...f,
      region: f.region.includes(r) ? f.region.filter(x => x !== r) : [...f.region, r]
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authError) { setError(authError.message); setSaving(false); return }

    const userId = authData.user.id

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: form.companyName,
        region: form.region,
        years_trading: parseInt(form.yearsTrading) || null,
        fleet_size: parseInt(form.fleetSize) || 0,
        staff_count: parseInt(form.staffCount) || 0,
        memberships: form.memberships ? form.memberships.split(',').map(s => s.trim()) : [],
      })
      .select()
      .single()

    if (companyError) { setError(companyError.message); setSaving(false); return }

    const { error: cuError } = await supabase
      .from('company_users')
      .insert({ id: userId, company_id: companyData.id, role: 'owner', name: form.yourName })

    if (cuError) { setError(cuError.message); setSaving(false); return }

    setSaving(false)
    navigate('/dashboard')
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1>Join Mover-Exchange</h1>
      <p style={{ color: 'var(--slate)' }}>Set up your company profile so other movers can see who they're dealing with.</p>

      <form onSubmit={handleSubmit} className="card">
        {step === 1 && (
          <>
            <label>Your name</label>
            <input required value={form.yourName} onChange={e => update('yourName', e.target.value)} />
            <label>Work email</label>
            <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} />
            <label>Password</label>
            <input required type="password" minLength={6} value={form.password} onChange={e => update('password', e.target.value)} />
            <button type="button" onClick={() => setStep(2)}>Next: company details</button>
          </>
        )}

        {step === 2 && (
          <>
            <label>Company name</label>
            <input required value={form.companyName} onChange={e => update('companyName', e.target.value)} />

            <label>Regions covered</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {REGIONS.map(r => (
                <span
                  key={r}
                  onClick={() => toggleRegion(r)}
                  className="badge"
                  style={{
                    cursor: 'pointer',
                    background: form.region.includes(r) ? 'var(--sky)' : 'var(--ice-tint)',
                    color: form.region.includes(r) ? 'white' : 'var(--navy)',
                  }}
                >
                  {r}
                </span>
              ))}
            </div>

            <label>Years trading</label>
            <input type="number" min="0" value={form.yearsTrading} onChange={e => update('yearsTrading', e.target.value)} />

            <label>Fleet size (number of vehicles)</label>
            <input type="number" min="0" value={form.fleetSize} onChange={e => update('fleetSize', e.target.value)} />

            <label>Staff count</label>
            <input type="number" min="0" value={form.staffCount} onChange={e => update('staffCount', e.target.value)} />

            <label>Memberships (comma separated, e.g. BAR, RHA)</label>
            <input value={form.memberships} onChange={e => update('memberships', e.target.value)} />

            {error && <p style={{ color: 'crimson' }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="secondary" onClick={() => setStep(1)}>Back</button>
              <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
            </div>
          </>
        )}
      </form>

      <p style={{ fontSize: 14 }}>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  )
}
