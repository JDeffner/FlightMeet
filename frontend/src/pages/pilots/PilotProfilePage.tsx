// Public pilot profile: GET /api/users/{username}. Reachable from meet
// participant lists and group member lists; no auth required to view.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  CalendarBlankIcon,
  CompassIcon,
  CrownIcon,
  FlagBannerIcon,
  MapPinIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { GROUP_LABELS, TIER_LABELS, type Tier } from '@/lib/types'

// --- API shapes (contract lives in the backend; kept local to this page) ----

interface PilotGroup {
  id: number
  name: string
  region: string
  memberCount: number
}

interface PilotMeet {
  id: number
  title: string
  spot: string
  region: string
  date: string
  time: string
  participantCount: number
  maxParticipants: number
  organizer: boolean
}

interface PilotProfile {
  id: number
  username: string
  name: string
  vorname: string | null
  nachname: string | null
  tier: Tier
  role: 'admin' | 'moderator' | 'user'
  memberSince: string | null
  groups: PilotGroup[]
  meets: PilotMeet[]
}

// --- Helpers ----------------------------------------------------------------

/** Two-letter initials from first + last name, falling back to the username. */
function initialsFor(profile: PilotProfile): string {
  const first = profile.vorname?.trim()?.[0] ?? ''
  const last = profile.nachname?.trim()?.[0] ?? ''
  const combined = `${first}${last}`.trim()
  if (combined) return combined.toUpperCase()
  return profile.username.slice(0, 2).toUpperCase()
}

/** Initials for a group tile, from the first two words of its name. */
function groupInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  return letters.toUpperCase() || '?'
}

/** ISO "2026-07-01T09:00:00+02:00" → "July 2026". */
function formatMonthYear(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** "2026-07-20" + "18:00" → "Mon, 20 Jul 2026 · 18:00". */
function formatMeetDateTime(date: string, time: string): string {
  const d = new Date(`${date}T${time || '00:00'}`)
  if (Number.isNaN(d.getTime())) return time ? `${date} · ${time}` : date
  const day = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return time ? `${day} · ${time}` : day
}

/** Local calendar date as YYYY-MM-DD (avoids the UTC drift of toISOString). */
function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// --- Page -------------------------------------------------------------------

export function PilotProfilePage() {
  const { username } = useParams()
  const { user } = useAuth()

  // State is keyed by username (+ retry counter) so navigating to another pilot
  // shows the loading state again without an extra reset effect.
  const [loaded, setLoaded] = useState<{ username: string | undefined; profile: PilotProfile } | null>(
    null,
  )
  const [failure, setFailure] = useState<{
    username: string | undefined
    kind: 'notfound' | 'failed'
  } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const profile = loaded && loaded.username === username ? loaded.profile : null
  const loadError = failure && failure.username === username ? failure.kind : null

  useEffect(() => {
    let cancelled = false
    api<{ user: PilotProfile }>(`/api/users/${username}`)
      .then((res) => {
        if (!cancelled) setLoaded({ username, profile: res.user })
      })
      .catch((err) => {
        if (!cancelled) {
          setFailure({
            username,
            kind: err instanceof ApiError && err.status === 404 ? 'notfound' : 'failed',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [username, attempt])

  const retry = () => {
    setLoaded(null)
    setFailure(null)
    setAttempt((n) => n + 1)
  }

  if (loadError === 'notfound') {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Pilot not found</EmptyTitle>
          <EmptyDescription>
            This pilot seems to have flown off the map. The profile you are looking for does not exist.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" nativeButton={false} render={<Link to="/meets" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to meets
        </Button>
      </Empty>
    )
  }

  if (loadError === 'failed') {
    return (
      <Alert variant="destructive">
        <WarningCircleIcon />
        <AlertTitle>Couldn&apos;t load this pilot. Please try again.</AlertTitle>
        <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>
          <ArrowClockwiseIcon data-icon="inline-start" />
          Retry
        </Button>
      </Alert>
    )
  }

  if (profile === null) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <Skeleton className="h-36 w-full rounded-4xl" />
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  const displayName = profile.name?.trim() || profile.username
  const isOwnProfile = user?.username === profile.username
  const memberSince = profile.memberSince ? formatMonthYear(profile.memberSince) : ''

  const today = todayISO()
  const sortKey = (m: PilotMeet) => `${m.date}T${m.time || '00:00'}`
  const upcoming = profile.meets
    .filter((m) => m.date >= today)
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const past = profile.meets
    .filter((m) => m.date < today)
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-2xl font-semibold text-primary-foreground shadow-sm">
            {initialsFor(profile)}
          </span>
          <div className="flex flex-1 flex-col gap-2">
            <div>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">{displayName}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              <Badge variant="secondary">{TIER_LABELS[profile.tier]}</Badge>
              <RoleBadge role={profile.role} />
            </div>
            {memberSince && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start">
                <CalendarBlankIcon className="size-3.5 shrink-0" />
                Member since {memberSince}
              </p>
            )}
          </div>
          {isOwnProfile && (
            <Button variant="outline" nativeButton={false} render={<Link to="/profile" />}>
              <PencilSimpleIcon data-icon="inline-start" />
              Edit profile
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section className="flex flex-col gap-5">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold">
            <CalendarBlankIcon className="size-5 text-primary" />
            Meets
          </h2>

          {profile.meets.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarBlankIcon />
                </EmptyMedia>
                <EmptyTitle>No meets yet</EmptyTitle>
                <EmptyDescription>
                  {displayName} hasn&apos;t joined or organised a meet so far.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Upcoming</h3>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming meets planned yet.</p>
                ) : (
                  upcoming.map((meet) => <MeetRow key={meet.id} meet={meet} />)
                )}
              </div>

              {past.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">Past</h3>
                    {past.map((meet) => (
                      <MeetRow key={meet.id} meet={meet} past />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <aside className="h-fit rounded-3xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <UsersThreeIcon className="size-5 text-primary" />
            Groups
          </h2>
          <Separator className="my-4" />
          {profile.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not part of any flying group yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {profile.groups.map((group) => (
                <li key={group.id}>
                  <GroupRow group={group} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}

// --- Subcomponents ----------------------------------------------------------

function RoleBadge({ role }: { role: PilotProfile['role'] }) {
  if (role === 'admin') {
    return (
      <Badge>
        <CrownIcon weight="fill" data-icon="inline-start" />
        {GROUP_LABELS.admin}
      </Badge>
    )
  }
  if (role === 'moderator') {
    return (
      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
        <ShieldCheckIcon weight="fill" data-icon="inline-start" />
        {GROUP_LABELS.moderator}
      </Badge>
    )
  }
  return null
}

function MeetRow({ meet, past = false }: { meet: PilotMeet; past?: boolean }) {
  const pct =
    meet.maxParticipants > 0
      ? Math.min(100, Math.round((meet.participantCount / meet.maxParticipants) * 100))
      : 0

  return (
    <Link
      to={`/meets/${meet.id}`}
      className="group flex flex-col gap-3 rounded-3xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-heading text-lg font-semibold leading-tight group-hover:text-primary">
            {meet.title}
          </h4>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-4 shrink-0" />
            <span className="truncate">
              {meet.spot} · {meet.region}
            </span>
          </p>
        </div>
        {meet.organizer && (
          <Badge className="shrink-0">
            <FlagBannerIcon weight="fill" data-icon="inline-start" />
            Organizer
          </Badge>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CalendarBlankIcon className="size-4 shrink-0" />
        {formatMeetDateTime(meet.date, meet.time)}
      </p>

      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={past ? 'h-full rounded-full bg-primary/50' : 'h-full rounded-full bg-primary'}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <UsersThreeIcon className="size-3.5" />
          {meet.participantCount}/{meet.maxParticipants}
        </span>
      </div>
    </Link>
  )
}

function GroupRow({ group }: { group: PilotGroup }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="group flex items-center gap-3 rounded-2xl border p-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {groupInitials(group.name)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium group-hover:text-primary">
          {group.name}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon className="size-3 shrink-0" />
          <span className="truncate">{group.region}</span>
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <UsersThreeIcon className="size-3.5" />
        {group.memberCount}
      </span>
    </Link>
  )
}
