import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

/**
 * Route guard: only signed-in users with `admin.access` get through.
 * Guests are sent to the login page (with a return target);
 * signed-in non-admins see a 403 message.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">Loading&hellip;</div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">
          You need admin rights to see the dashboard. Signed in as{' '}
          <span className="font-medium">{user.username}</span> ({user.groups.join(', ')}).
        </p>
      </div>
    )
  }

  return <>{children}</>
}
