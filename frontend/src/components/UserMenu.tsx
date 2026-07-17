import { useNavigate } from 'react-router-dom'
import {
  CaretDownIcon,
  GaugeIcon,
  PencilSimpleIcon,
  SignOutIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { TIER_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  /** Trigger styling: 'app' = pill on the app header, 'landing' = FlightMeet nav island. */
  variant?: 'app' | 'landing'
}

/**
 * User menu for signed-in users: full name + subscription tier as the
 * trigger, dropdown with profile, admin dashboard (permission-gated)
 * and log out.
 */
export function UserMenu({ variant = 'app' }: Props) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const fullName =
    [user.vorname, user.nachname].filter(Boolean).join(' ') || user.username
  const tierLabel = TIER_LABELS[user.subscription_tier] ?? user.subscription_tier

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex cursor-pointer items-center gap-2 outline-none',
          variant === 'landing'
            ? 'fm-nav-login'
            : 'rounded-full border bg-background py-1.5 pr-3 pl-4 text-sm font-medium hover:bg-accent',
        )}
        aria-label={`${fullName} – user menu`}
      >
        <span className="max-w-40 truncate">{fullName}</span>
        <Badge variant="secondary">{tierLabel}</Badge>
        <CaretDownIcon className="size-3.5 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 w-auto">
        <div className="px-3 py-2.5">
          <div className="truncate text-sm font-medium">{fullName}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(`/pilots/${user.username}`)}>
          <UserCircleIcon />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <PencilSimpleIcon />
          Edit profile
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
            <GaugeIcon />
            Admin dashboard
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void handleLogout()}>
          <SignOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
