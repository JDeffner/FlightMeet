import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, SignOutIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { GROUP_LABELS } from '@/lib/types'

export function SiteHeader() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheckIcon size={20} weight="duotone" className="text-primary" />
          FWE Team&nbsp;11
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground'
            }
          >
            Start
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                isActive ? 'font-medium' : 'text-muted-foreground hover:text-foreground'
              }
            >
              Admin-Dashboard
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.username}
              </span>
              {user.groups.map((g) => (
                <Badge key={g} variant={g === 'admin' ? 'default' : 'secondary'}>
                  {GROUP_LABELS[g] ?? g}
                </Badge>
              ))}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <SignOutIcon />
                Abmelden
              </Button>
            </>
          ) : (
            <Button size="sm" render={<Link to="/login" />}>
              Anmelden
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
