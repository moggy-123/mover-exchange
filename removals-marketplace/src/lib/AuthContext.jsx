import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [companyUser, setCompanyUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadCompanyData(userId) {
    const { data: cu } = await supabase
      .from('company_users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setCompanyUser(cu)

    if (cu?.company_id) {
      const { data: c } = await supabase
        .from('companies')
        .select('*')
        .eq('id', cu.company_id)
        .maybeSingle()
      setCompany(c)
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadCompanyData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        loadCompanyData(session.user.id)
      } else {
        setCompanyUser(null)
        setCompany(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function refreshCompany() {
    if (session?.user) await loadCompanyData(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, companyUser, company, loading, refreshCompany }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
