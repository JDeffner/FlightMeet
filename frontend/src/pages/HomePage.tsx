import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'

export function HomePage() {
  const { user, isAdmin, loading } = useAuth()

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>FWE Team 11 — Benutzerverwaltung</CardTitle>
          <CardDescription>
            CodeIgniter&nbsp;4 + Shield (Session-Auth) &middot; React&nbsp;19 + TanStack Table
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {loading ? (
            <p className="text-muted-foreground">Lade Sitzung&hellip;</p>
          ) : user ? (
            <>
              <p>
                Angemeldet als <span className="font-medium">{user.username}</span>{' '}
                <span className="text-muted-foreground">({user.groups.join(', ')})</span>
              </p>
              {isAdmin ? (
                <Button render={<Link to="/admin/dashboard" />}>Zum Admin-Dashboard</Button>
              ) : (
                <p className="text-muted-foreground">
                  Das Admin-Dashboard ist nur für Administratoren sichtbar.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Du bist nicht angemeldet. Login geht mit E-Mail <em>oder</em> Benutzername.
              </p>
              <Button render={<Link to="/login" />}>Anmelden</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
