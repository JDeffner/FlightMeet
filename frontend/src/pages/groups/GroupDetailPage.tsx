import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CompassIcon,
  MapPinIcon,
  PencilSimpleIcon,
  SignInIcon,
  SignOutIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { GroupDetail, Participant } from '@/lib/types'
import { groupImageSrc } from './group-image'

export function GroupDetailPage() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  // Loaded data and errors are keyed by the group id (and a retry counter), so
  // switching groups shows the loading state again without resetting state in
  // the effect body.
  const [loaded, setLoaded] = useState<{ id: string | undefined; group: GroupDetail } | null>(null)
  const [failure, setFailure] = useState<{
    id: string | undefined
    kind: 'notfound' | 'failed'
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const noticeTimer = useRef<number | undefined>(undefined)

  const group = loaded && loaded.id === id ? loaded.group : null
  const loadError = failure && failure.id === id ? failure.kind : null

  useEffect(() => {
    let cancelled = false
    api<{ group: GroupDetail }>(`/api/groups/${id}`)
      .then((res) => {
        if (!cancelled) setLoaded({ id, group: res.group })
      })
      .catch((err) => {
        if (!cancelled) {
          setFailure({
            id,
            kind: err instanceof ApiError && err.status === 404 ? 'notfound' : 'failed',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  const retry = () => {
    setLoaded(null)
    setFailure(null)
    setAttempt((n) => n + 1)
  }

  const showNotice = (text: string) => {
    setNotice(text)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000)
  }

  const joinOrLeave = async (join: boolean) => {
    if (!group || busy) return
    setBusy(true)
    setActionError(null)
    setNotice(null)
    try {
      const res = await api<{ group: GroupDetail }>(`/api/groups/${group.id}/join`, {
        method: join ? 'POST' : 'DELETE',
      })
      setLoaded({ id, group: res.group })
      showNotice(
        join
          ? `Welcome to ${res.group.name}! The group chat is open for you now.`
          : `You've left ${res.group.name}. Fly safe — you're welcome back anytime.`,
      )
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loadError === 'notfound') {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>Group not found</EmptyTitle>
          <EmptyDescription>
            This group doesn&apos;t exist (anymore). Maybe it drifted off in a thermal.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" nativeButton={false} render={<Link to="/groups" />}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back to groups
        </Button>
      </Empty>
    )
  }

  if (loadError === 'failed') {
    return (
      <Alert variant="destructive">
        <WarningCircleIcon />
        <AlertTitle>Couldn&apos;t load this group. Please try again.</AlertTitle>
        <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>
          <ArrowClockwiseIcon data-icon="inline-start" />
          Retry
        </Button>
      </Alert>
    )
  }

  if (group === null) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-56 w-full rounded-3xl sm:h-72" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  const canEditGroup = isAdmin || group.createdBy.id === user?.id

  const onGroupSaved = (updated: GroupDetail) => {
    setLoaded({ id, group: updated })
    showNotice('Group details updated.')
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/groups"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        All groups
      </Link>

      <div className="relative overflow-hidden rounded-3xl">
        <img src={groupImageSrc(group)} alt="" className="h-56 w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 flex flex-wrap items-end justify-between gap-3 p-5 sm:p-7">
          <div className="text-white">
            <p className="flex items-center gap-1.5 text-sm text-white/85">
              <MapPinIcon className="size-4" />
              {group.region}
            </p>
            <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {group.name}
            </h1>
          </div>
          {group.joined && (
            <Badge className="shadow-sm">
              <CheckCircleIcon weight="fill" />
              Joined
            </Badge>
          )}
        </div>
      </div>

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

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
            {group.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              group.joined ? (
                <>
                  <Button nativeButton={false} render={<Link to={`/chat?group=${group.id}`} />}>
                    <ChatCircleDotsIcon data-icon="inline-start" />
                    Open group chat
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => joinOrLeave(false)}>
                    {busy ? <Spinner data-icon="inline-start" /> : <SignOutIcon data-icon="inline-start" />}
                    Leave group
                  </Button>
                </>
              ) : (
                <Button disabled={busy} onClick={() => joinOrLeave(true)}>
                  {busy ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
                  Join group
                </Button>
              )
            ) : (
              <Button nativeButton={false} render={<Link to="/login" state={{ from: location.pathname }} />}>
                <SignInIcon data-icon="inline-start" />
                Log in to join
              </Button>
            )}
            {canEditGroup && <EditGroupDialog group={group} onSaved={onGroupSaved} />}
          </div>
        </div>

        <aside className="h-fit rounded-3xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <UsersThreeIcon className="size-5 text-primary" />
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </h2>
          <Separator className="my-4" />
          {group.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet — be the first to join.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {group.members.map((member) => (
                <MemberRow key={member.id} member={member} isFounder={member.id === group.createdBy.id} />
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}

function MemberRow({ member, isFounder }: { member: Participant; isFounder: boolean }) {
  const initials = member.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <li className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {initials || '?'}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{member.name}</span>
        <span className="block truncate text-xs text-muted-foreground">@{member.username}</span>
      </span>
      {isFounder && (
        <Badge variant="secondary" className="ml-auto">
          Founder
        </Badge>
      )}
    </li>
  )
}

/**
 * Founder/admin group editor. Opens a dialog prefilled with the current group
 * details, validates the required fields, and PUTs the changes. On success it
 * hands the updated group back to the page; field errors from the API (e.g. a
 * duplicate name) are shown per-field, other failures in an alert.
 */
function EditGroupDialog({
  group,
  onSaved,
}: {
  group: GroupDetail
  onSaved: (group: GroupDetail) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(group.name)
  const [region, setRegion] = useState(group.region)
  const [description, setDescription] = useState(group.description)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onOpenChange = (next: boolean) => {
    // Reset to the current group each time the dialog opens (discards edits from
    // a previous Cancel).
    if (next) {
      setName(group.name)
      setRegion(group.region)
      setDescription(group.description)
      setErrors({})
      setFormError(null)
    }
    setOpen(next)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Give the group a name.'
    if (!region.trim()) next.region = 'Name the region.'
    if (!description.trim()) next.description = 'Add a short description.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      const res = await api<{ group: GroupDetail }>(`/api/groups/${group.id}`, {
        method: 'PUT',
        body: { name: name.trim(), region: region.trim(), description: description.trim() },
      })
      onSaved(res.group)
      setOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors)
        setFormError('Please fix the highlighted fields.')
      } else {
        setFormError(
          err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <PencilSimpleIcon data-icon="inline-start" />
        Edit group
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
          <DialogDescription>Update the details other pilots see.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            {formError && (
              <Alert variant="destructive">
                <WarningCircleIcon />
                <AlertTitle>{formError}</AlertTitle>
              </Alert>
            )}
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name}
              />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field data-invalid={errors.region ? true : undefined}>
              <FieldLabel htmlFor="group-region">Region</FieldLabel>
              <Input
                id="group-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                aria-invalid={!!errors.region}
              />
              <FieldError>{errors.region}</FieldError>
            </Field>
            <Field data-invalid={errors.description ? true : undefined}>
              <FieldLabel htmlFor="group-description">Description</FieldLabel>
              <Textarea
                id="group-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                aria-invalid={!!errors.description}
              />
              <FieldError>{errors.description}</FieldError>
            </Field>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner data-icon="inline-start" />}
                Save changes
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
