import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Role = 'admin' | 'bendahara' | 'koperasi' | null

interface AuthContextType {
  session: Session | null
  user: User | null
  role: Role
  nama: string | null
  avatarUrl: string | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [nama, setNama] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id)
      } else {
        setRole(null)
        setNama(null)
        setAvatarUrl(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchRole(session.user.id)
        } else {
          setRole(null)
          setNama(null)
          setAvatarUrl(null)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('role, nama')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching role:', error)
        setRole(null)
        setNama(null)
        setAvatarUrl(null)
        setLoading(false)
        return
      }

      if (data) {
        setRole(data.role as Role)
        setNama(data.nama)

        // Fetch avatar_url gracefully to avoid crashing if table column doesn't exist yet
        try {
          const { data: avatarData } = await supabase
            .from('admin_profiles')
            .select('avatar_url')
            .eq('id', userId)
            .single()
          setAvatarUrl(avatarData?.avatar_url || null)
        } catch (err) {
          console.warn('avatar_url column may not exist yet:', err)
          setAvatarUrl(null)
        }
      }
    } catch (error) {
      console.error('Unexpected error fetching role:', error)
      setRole(null)
      setNama(null)
      setAvatarUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchRole(user.id)
    }
  }

  const signOut = async () => {
    setRole(null)
    setNama(null)
    setAvatarUrl(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, role, nama, avatarUrl, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
