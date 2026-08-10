import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import TradingCard from '../components/TradingCard'
import { useAuth } from '../lib/AuthContext'

export default function Dashboard() {
  const { company } = useAuth()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
      setCompanies(data || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="container">
      <h1>Member companies</h1>
      <p style={{ color: 'var(--slate)' }}>Browse other movers on the exchange. Post a listing to request staff, a vehicle, or offer spare capacity.</p>

      {loading && <p>Loading…</p>}
      {!loading && companies.length === 0 && (
        <div className="empty-state">No companies yet — you're the first one here.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {companies
          .filter(c => c.id !== company?.id)
          .map(c => <TradingCard key={c.id} company={c} />)}
      </div>
    </div>
  )
}
