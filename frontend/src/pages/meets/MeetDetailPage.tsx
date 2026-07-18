// Meet detail — FR-7, FR-8 (back keeps filters), FR-13…FR-16, weather FR-9/10/12.
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  MapPinIcon,
  PencilSimpleIcon,
  SignInIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { MeetDetail } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatMeetDate } from './format'
import { MeetWeatherPanel } from './MeetWeatherPanel'
import { CapacityBar, JoinedBadge, LevelBadge, StatusBadge } from './shared'

interface LocationState {
  /** Query string of the overview ("?q=…") — restored by the back link (FR-8). */
  search?: string
  /** Set right after creating this meet (FR-19). */
  created?: boolean
  /** Set right after editing this meet. */
  updated?: boolean
}

export function MeetDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const { user, isAdmin } = useAuth()

  // Keyed by the meet id it belongs to: navigating to another meet makes the
  // derived `meet`/`loadError` fall back to the loading state automatically,
  // without a state reset inside the effect.
  const [loaded, setLoaded] = useState<{
    id: string | undefined
    meet: MeetDetail | null
    error: string | null
  } | null>(null)
  const meet = loaded && loaded.id === id ? loaded.meet : null
  const loadError = loaded && loaded.id === id ? loaded.error : null
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(
    state.created
      ? 'Meet created — blue skies! It is now listed in the overview.'
      : state.updated
        ? 'Changes saved. Your meet is up to date.'
        : null,
  )
  const [actionError, setActionError] = useState<string | null>(null)

  const backTo = `/meets${state.search ?? ''}`

  useEffect(() => {
    let cancelled = false
    api<{ meet: MeetDetail }>(`/api/meets/${id}`)
      .then((res) => {
        if (!cancelled) setLoaded({ id, meet: res.meet, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setLoaded({
          id,
          meet: null,
          error:
            err instanceof ApiError && err.status === 404
              ? 'This meet does not exist (anymore).'
              : err instanceof ApiError
                ? err.message
                : 'Could not load this meet. Is the backend running?',
        })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function toggleJoin() {
    if (!meet) return
    const leaving = meet.joined
    setBusy(true)
    setNotice(null)
    setActionError(null)
    try {
      const res = await api<{ meet: MeetDetail }>(`/api/meets/${meet.id}/join`, {
        method: leaving ? 'DELETE' : 'POST',
      })
      setLoaded({ id, meet: res.meet, error: null })
      setNotice(
        leaving
          ? 'You have left this meet. Your spot is free for another pilot.'
          : "You're on the list — see you at the launch!",
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setActionError('You need to be logged in for that. Your session may have expired.')
      } else {
        setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const freeSpots = meet ? meet.maxParticipants - meet.participantCount : 0
  const isFull = meet?.status === 'full'
  const canEdit = !!meet && (isAdmin || meet.createdBy.id === user?.id)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to={backTo} />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to meets
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>{loadError}</AlertTitle>
          <AlertDescription>
            <Link to="/meets" className="underline underline-offset-4">
              Back to the overview
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!meet && !loadError && (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-56 w-full rounded-4xl" />
          <Skeleton className="h-72 w-full rounded-4xl" />
        </div>
      )}

      {meet && (
        <>
          {notice && (
            <Alert>
              <CheckCircleIcon weight="fill" className="text-primary" />
              <AlertTitle>{notice}</AlertTitle>
            </Alert>
          )}
          {actionError && (
            <Alert variant="destructive">
              <WarningCircleIcon />
              <AlertTitle>{actionError}</AlertTitle>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <LevelBadge level={meet.level} />
                <StatusBadge status={meet.status} />
                {meet.joined && <JoinedBadge />}
              </div>
              <CardTitle className="font-heading text-3xl">{meet.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="shrink-0" />
                  {meet.spot} · {meet.region}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarBlankIcon className="shrink-0" />
                  {formatMeetDate(meet.date, meet.time)}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="whitespace-pre-line text-sm leading-relaxed">{meet.description}</p>
              <p className="text-xs text-muted-foreground">
                Organised by {meet.createdBy.name}
              </p>

              <Separator />

              <div className="flex flex-wrap items-center gap-3">
                {user ? (
                  meet.joined ? (
                    <Button variant="outline" onClick={toggleJoin} disabled={busy}>
                      {busy && <Spinner data-icon="inline-start" />}
                      Cancel participation
                    </Button>
                  ) : (
                    <>
                      <Button onClick={toggleJoin} disabled={busy || isFull}>
                        {busy && <Spinner data-icon="inline-start" />}
                        Join this meet
                      </Button>
                      {isFull && (
                        <span className="text-sm text-muted-foreground">
                          Meet is full — no spots left.
                        </span>
                      )}
                    </>
                  )
                ) : (
                  <Button nativeButton={false} render={<Link to="/login" />}>
                    <SignInIcon data-icon="inline-start" />
                    Log in to join
                  </Button>
                )}
                {canEdit && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link to={`/meets/${meet.id}/edit`} />}
                  >
                    <PencilSimpleIcon data-icon="inline-start" />
                    Edit meet
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersThreeIcon />
                  Pilots ({meet.participantCount}/{meet.maxParticipants})
                </CardTitle>
                <CardDescription>
                  {isFull
                    ? 'This meet is fully booked.'
                    : `${freeSpots} free ${freeSpots === 1 ? 'spot' : 'spots'} left.`}
                </CardDescription>
                <CapacityBar
                  count={meet.participantCount}
                  max={meet.maxParticipants}
                  className="mt-1"
                />
              </CardHeader>
              <CardContent>
                {meet.participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pilots on the list yet — be the first to join.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {meet.participants.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                          {p.name.slice(0, 1)}
                        </span>
                        {p.name}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <MeetWeatherPanel meetId={meet.id} meetDate={meet.date} />
          </div>
        </>
      )}
    </div>
  )
}
