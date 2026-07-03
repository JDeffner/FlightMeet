import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'
import type { CsrfInfo } from '@/lib/api'
import type { AuthUser } from '@/lib/types'

interface MeResponse {
  authenticated: boolean
  user: AuthUser | null
  csrf: CsrfInfo
}

interface LoginResponse {
  user: AuthUser
  csrf: CsrfInfo
}

interface AuthContextValue {
  user: AuthUser | null
  /** true solange der initiale /me-Request läuft */
  loading: boolean
  isAdmin: boolean
  login: (login: string, password: string, remember: boolean) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(
    () =>
      api<MeResponse>('/api/auth/me')
        .then((me) => setUser(me.authenticated ? me.user : null))
        .catch(() => setUser(null))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (loginValue: string, password: string, remember: boolean) => {
    const res = await api<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { login: loginValue, password, remember },
    })
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
    // Session wurde serverseitig beendet → neuen CSRF-Token holen
    await api<MeResponse>('/api/auth/me').catch(() => {})
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.permissions?.['admin.access'] === true,
      login,
      logout,
      refresh,
    }),
    [user, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
