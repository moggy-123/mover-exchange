import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Listings from './pages/Listings'
import MyListings from './pages/MyListings'
import Profile from './pages/Profile'

const APP_VERSION = 4 // bump this every time I give you a new file to paste

function Topbar() {
  const { session, company } = useAuth()
  return (
    <div className="topbar">
      <Link to="/" className="brand">Mover-Exchange</Link>
      <nav>
        {session ? (
          <>
            <Link to="/dashboard">Members</Link>
            <Link to="/listings">Listings</Link>
            <Link to="/my-listings">My Listings</Link>
            {company && <Link to="/profile" style={{ marginLeft: 20, color: 'var(--ice)', fontSize: 14 }}>{company.name}</Link>}
            <a href="#" onClick={(e) => { e.preventDefault(); supabase.auth.signOut() }} style={{ marginLeft: 20 }}>Log out</a>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/signup">Join</Link>
          </>
        )}
      </nav>
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
