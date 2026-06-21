import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [role,    setRole]    = useState(null)
  const [loading, setLoading] = useState(true)
  const heartbeatRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfile(null)
        setRole(null)
        setLoading(false)
        clearInterval(heartbeatRef.current)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearInterval(heartbeatRef.current)
    }
  }, [])

  async function loadProfile(userId) {
    const [{ data: prof }, { data: roleData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role, cost_center_id').eq('user_id', userId)
    ])
    setProfile(prof)
    setRole(roleData?.[0] ?? null)
    setLoading(false)
    startHeartbeat(userId)
  }

  function startHeartbeat(userId) {
    clearInterval(heartbeatRef.current)
    const beat = () =>
      supabase.from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
    beat()
    heartbeatRef.current = setInterval(beat, 2 * 60 * 1000)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    clearInterval(heartbeatRef.current)
    await supabase.auth.signOut()
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    return { error }
  }

  const isOwner       = role?.role === 'owner'
  const isPartner     = role?.role === 'partner' || isOwner
  const isAreaManager = role?.role === 'area_manager'

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading,
      isOwner, isPartner, isAreaManager,
      signIn, signOut, resetPassword,
      reloadProfile: () => user && loadProfile(user.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
