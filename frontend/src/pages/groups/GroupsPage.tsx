import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  MapPinIcon,
  PlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { GroupDetail, GroupSummary } from '@/lib/types'
import { groupImageSrc } from './group-image'

export function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<GroupSummary[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api<{ data: GroupSummary[] }>('/api/groups')
      .then((res) => {
        if (!cancelled) setGroups(res.data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setGroups(null)
    setError(false)
    setAttempt((n) => n + 1)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-1 text-muted-foreground">
            Find your local flying crew, swap site knowledge, and plan flights together.
          </p>
        </div>
        {user && <CreateGroupDialog />}
      </div>

      {error ? (
        <Alert variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>Couldn&apos;t load groups. Please try again.</AlertTitle>
          <Button variant="outline" size="sm" className="ml-auto" onClick={retry}>
            <ArrowClockwiseIcon data-icon="inline-start" />
            Retry
          </Button>
        </Alert>
      ) : groups === null ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersThreeIcon />
            </EmptyMedia>
            <EmptyTitle>No groups yet</EmptyTitle>
            <EmptyDescription>
              {user
                ? 'Be the first — start a group for your home site and invite your flying friends.'
                : 'Log in to start the first group for your home site.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={groupImageSrc(group)}
          alt=""
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {group.joined && (
          <Badge className="absolute top-3 right-3 shadow-sm">
            <CheckCircleIcon weight="fill" />
            Joined
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="font-heading text-lg font-semibold leading-tight">{group.name}</h2>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="size-4 shrink-0" />
          {group.region}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium">
          <UsersThreeIcon className="size-4 text-primary" />
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
        </p>
      </div>
    </Link>
  )
}

function CreateGroupDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setFieldErrors({})
      setError(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setError(null)
    setSubmitting(true)
    try {
      const res = await api<{ group: GroupDetail }>('/api/groups', {
        method: 'POST',
        body: { name: name.trim(), region: region.trim(), description: description.trim() },
      })
      navigate(`/groups/${res.group.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors)
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not create the group.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Create group
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a group</DialogTitle>
          <DialogDescription>
            Give your crew a home. You&apos;ll join it automatically as the first member.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <Field data-invalid={fieldErrors.name ? true : undefined}>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Black Forest Soarers"
                required
                autoFocus
                aria-invalid={fieldErrors.name ? true : undefined}
              />
              {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
            </Field>
            <Field data-invalid={fieldErrors.region ? true : undefined}>
              <FieldLabel htmlFor="group-region">Region</FieldLabel>
              <Input
                id="group-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Black Forest"
                required
                aria-invalid={fieldErrors.region ? true : undefined}
              />
              {fieldErrors.region && <FieldError>{fieldErrors.region}</FieldError>}
            </Field>
            <Field data-invalid={fieldErrors.description ? true : undefined}>
              <FieldLabel htmlFor="group-description">Description</FieldLabel>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who flies here, and what is the group about?"
                rows={3}
                required
                aria-invalid={fieldErrors.description ? true : undefined}
              />
              {fieldErrors.description && <FieldError>{fieldErrors.description}</FieldError>}
            </Field>

            {error && (
              <Alert variant="destructive">
                <WarningCircleIcon />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
          </FieldGroup>
          <DialogFooter className="mt-6" showCloseButton>
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner data-icon="inline-start" />}
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
