import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Listings from './pages/Listings'
import MyListings from './pages/MyListings'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'

const APP_VERSION = 11

function Topbar() {
  const { session, company } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="topbar">
      <div className="topbar-row">
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>Mover-Exchange</Link>
        {session && (
          <button className="menu-toggle" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </div>
      {session ? (
        <nav className={`collapsible ${menuOpen ? 'open' : ''}`}>
          <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Members</Link>
          <Link to="/listings" onClick={() => setMenuOpen(false)}>Listings</Link>
          <Link to="/my-listings" onClick={() => setMenuOpen(false)}>My Listings</Link>
          {company && <Link to="/profile" className="company-name" onClick={() => setMenuOpen(false)}>{company.name}</Link>}
          <a href="#" onClick={(e) => { e.preventDefault(); setMenuOpen(false); supabase.auth.signOut() }}>Log out</a>
        </nav>
      ) : (
        <nav>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Join</Link>
        </nav>
      )}
    </div>
  )
}

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="container">Loading…</div>
  if (!session) return <Navigate to="/login" />
  return children
}

const TIERS = [
  {
    name: 'Free',
    price: 'Free',
    tagline: 'Get started sharing capacity',
    features: [
      'Share & request staff',
      'Share & request vehicles',
      'Share equipment (piano dollies, etc.)',
      'Browse verified trading cards',
      'Region-matched email alerts',
    ],
    cta: 'Join free',
    highlight: false,
  },
  {
    name: 'Standard',
    price: 'Paid',
    tagline: 'Turn spare assets into revenue',
    features: [
      'Everything in Free',
      'Sell vehicles',
      'Offer storage space for rent',
    ],
    cta: 'Contact us to upgrade',
    highlight: false,
  },
  {
    name: 'Premium',
    price: 'Paid',
    tagline: 'Go beyond the UK',
    features: [
      'Everything in Standard',
      'Sell your company',
      'Access EU movers & listings',
    ],
    cta: 'Contact us to upgrade',
    highlight: true,
  },
  {
    name: 'Top',
    price: 'Coming soon',
    tagline: 'Grow with public demand',
    features: [
      'Everything in Premium',
      'Access to public moving leads',
      'Featured placement to customers',
    ],
    cta: 'Coming soon',
    highlight: false,
  },
]

function TierCard({ tier }) {
  return (
    <div className="card" style={{
      textAlign: 'left',
      border: tier.highlight ? '2px solid var(--sky)' : '1px solid var(--line)',
      position: 'relative',
    }}>
      {tier.highlight && (
        <span style={{
          position: 'absolute', top: -11, left: 16,
          background: 'var(--sky)', color: 'white', fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em',
        }}>MOST POPULAR</span>
      )}
      <h3 style={{ marginBottom: 2 }}>{tier.name}</h3>
      <p style={{ color: 'var(--slate)', fontSize: 13, margin: '0 0 10px' }}>{tier.tagline}</p>
      <p style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--navy)', margin: '0 0 14px' }}>{tier.price}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', fontSize: 14 }}>
        {tier.features.map(f => (
          <li key={f} style={{ padding: '5px 0', borderTop: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--ok)', marginRight: 6 }}>✓</span>{f}
          </li>
        ))}
      </ul>
      <Link to="/signup"><button className={tier.highlight ? '' : 'secondary'} style={{ width: '100%' }}>{tier.cta}</button></Link>
    </div>
  )
}

function Home() {
  const { session } = useAuth()
  if (session) return <Navigate to="/dashboard" />
  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1>Mover-Exchange</h1>
        <p style={{ color: 'var(--slate)', maxWidth: 480, margin: '0 auto 24px' }}>
          Share staff, vehicles and storage with other removals companies you can trust.
          Verified profiles, short-notice cover, no more scrambling before a big job.
        </p>
        <Link to="/signup"><button>Join the exchange</button></Link>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>

      <h2 style={{ textAlign: 'center', marginBottom: 6 }}>Membership tiers</h2>
      <p className="page-lead" style={{ textAlign: 'center', margin: '0 auto 28px' }}>
        Start free. Upgrade when you're ready to sell, rent, or go international.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 12 }}>
        {TIERS.map(t => <TierCard key={t.name} tier={t} />)}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-shell">
          <Topbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/listings" element={<RequireAuth><Listings /></RequireAuth>} />
            <Route path="/my-listings" element={<RequireAuth><MyListings /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          </Routes>
          <div style={{
            position: 'fixed', bottom: 8, right: 12,
            fontSize: 11, color: 'var(--slate)', opacity: 0.6,
            fontFamily: 'monospace', pointerEvents: 'none',
          }}>
            Build {APP_VERSION}
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
