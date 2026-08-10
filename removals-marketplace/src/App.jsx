import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Listings from './pages/Listings'
import MyListings from './pages/MyListings'
import Profile from './pages/Profile'

const APP_VERSION = 5 // bump this every time I give you a new file to paste

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
