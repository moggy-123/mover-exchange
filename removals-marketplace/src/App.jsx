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

const APP_VERSION = 8

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
        <nav className={menuOpen ? 'open' : ''}>
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

function Home() {
  const { session } = useAuth()
  if (session) return <Navigate to="/dashboard" />
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 60 }}>
      <h1>Mover-Exchange</h1>
      <p style={{ color: 'var(--slate)', maxWidth: 480, margin: '0 auto 24px' }}>
        Share staff, vehicles and storage with other removals companies you can trust.
        Verified profiles, short-notice cover, no more scrambling before a big job.
      </p>
      <Link to="/signup"><button>Join the exchange</button></Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}
