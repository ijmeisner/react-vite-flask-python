import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type User = {
  email?: string
  name?: string
  role?: string
  username?: string
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Compute backend prefixes once
  const { prefix, apiBase } = useMemo(() => {
    const homeDir = (import.meta.env.VITE_HOME_DIRECTORY as string | undefined) || ''
    const p = homeDir === '/' ? '' : (homeDir?.replace(/\/$/, '') || '')
    return { prefix: p, apiBase: `${p}/api` }
  }, [])

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const res = await fetch(`${apiBase}/hello`, { credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      // Best-effort: derive fields from response
      const u: User = {
        email: data.user || data.sub,
        username: data.user || data.sub,
      }
      setUser(u)
    } catch {
      setUser(null)
    }
  }

  const logout = async () => {
    try {
      await fetch(`${prefix}/logout`, { credentials: 'include' })
    } finally {
      setUser(null)
    }
  }

  useEffect(() => {
    (async () => {
      await refresh()
      setLoading(false)
    })()
  }, [])

  const value: AuthContextValue = { user, loading, refresh, logout }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

