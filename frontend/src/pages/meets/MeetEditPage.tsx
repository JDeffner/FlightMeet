// Edit a meet (FR-17/18/19). Only the organizer or an admin may open this;
// everyone else gets a friendly not-allowed state. Reuses MeetForm.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, LockKeyIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { MeetDetail } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { MeetForm, type MeetFormBody } from './MeetForm'

export function MeetEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  // Keyed by id so switching meets shows the skeleton again without a
  // synchronous state reset inside the effect body.
  const [loaded, setLoaded] = useState<{ id: string | undefined; meet: MeetDetail } | null>(null)
  const [failure, setFailure] = useState<{ id: string | undefined; message: string } | null>(null)

  const meet = loaded && loaded.id === id ? loaded.meet : null
  const loadError = failure && failure.id === id ? failure.message : null

  useEffect(() => {
    let cancelled = false
    api<{ meet: MeetDetail }>(`/api/meets/${id}`)
      .then((res) => {
        if (!cancelled) setLoaded({ id, meet: res.meet })
      })
      .catch((err) => {
        if (cancelled) return
        setFailure({
          id,
          message:
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

  async function onSubmit(body: MeetFormBody) {
    const res = await api<{ meet: MeetDetail }>(`/api/meets/${id}`, { method: 'PUT', body })
    navigate(`/meets/${res.meet.id}`, { state: { updated: true } })
  }

  const canEdit = meet != null && (isAdmin || meet.createdBy.id === user?.id)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to={`/meets/${id}`} />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to the meet
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
          <Skeleton className="h-10 w-1/2 rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-4xl" />
        </div>
      )}

      {meet && !canEdit && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockKeyIcon />
            </EmptyMedia>
            <EmptyTitle>Only the organizer can edit this meet</EmptyTitle>
            <EmptyDescription>
              You do not have permission to change &ldquo;{meet.title}&rdquo;. Head back to the meet
              to see the details or join the flight.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" nativeButton={false} render={<Link to={`/meets/${id}`} />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to the meet
          </Button>
        </Empty>
      )}

      {meet && canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Edit meet</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetForm
              initial={meet}
              submitLabel="Save changes"
              cancelTo={`/meets/${id}`}
              onSubmit={onSubmit}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
