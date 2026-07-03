import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/lib/auth'

/**
 * Route-Guard: nur eingeloggte Benutzer mit `admin.access` kommen durch.
 * Gäste werden zum Login geschickt (mit Rücksprungziel),
 * eingeloggte Nicht-Admins sehen eine 403-Meldung.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">Lade&hellip;</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-2xl font-semibold">Zugriff verweigert</h1>
        <p className="mt-2 text-muted-foreground">
          Du benötigst Admin-Rechte, um das Dashboard zu sehen. Angemeldet als{' '}
          <span className="font-medium">{user.username}</span> ({user.groups.join(', ')}).
        </p>
      </div>
    )
  }

  return <>{children}</>
}
