// Meets overview — FR-3…FR-6, FR-8 (URL filter state), FR-19.
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  CloudSunIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { LEVELS, type MeetSummary } from '@/lib/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMeetDate } from './format'
import { CapacityBar, JoinedBadge, LevelBadge, StatusBadge } from './shared'

function matchesQuery(meet: MeetSummary, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [meet.title, meet.spot, meet.region, meet.description].some((text) =>
    text.toLowerCase().includes(q),
  )
}

function MeetCard({ meet, search }: { meet: MeetSummary; search: string }) {
  return (
    <Link to={`/meets/${meet.id}`} state={{ search }} className="group block h-full">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <LevelBadge level={meet.level} />
            <StatusBadge status={meet.status} />
            {meet.joined && <JoinedBadge />}
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold group-hover:text-primary">
              {meet.title}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="shrink-0" />
              {meet.spot} · {meet.region}
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarBlankIcon className="shrink-0" />
                {formatMeetDate(meet.date, meet.time)}
              </span>
              <span className="flex items-center gap-1.5">
                <UsersThreeIcon className="shrink-0" />
                {meet.participantCount}/{meet.maxParticipants} pilots
              </span>
            </div>
            <CapacityBar count={meet.participantCount} max={meet.maxParticipants} />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function MeetsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [meets, setMeets] = useState<MeetSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('q') ?? ''
  const region = searchParams.get('region') ?? ''
  const level = searchParams.get('level') ?? ''
  const hasFilters = Boolean(query || region || level)

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  function load() {
    api<{ data: MeetSummary[] }>('/api/meets')
      .then((res) => setMeets(res.data))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Could not load the meets. Is the backend running?'),
      )
  }

  useEffect(load, [])

  const regions = useMemo(
    () => [...new Set((meets ?? []).map((m) => m.region))].sort((a, b) => a.localeCompare(b)),
    [meets],
  )

  const visible = useMemo(
    () =>
      (meets ?? []).filter(
        (m) =>
          matchesQuery(m, query) &&
          (!region || m.region === region) &&
          (!level || m.level === level),
      ),
    [meets, query, region, level],
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Flying meets</h1>
          <p className="text-sm text-muted-foreground">
            Find a launch window, meet fellow pilots, fly together.
          </p>
        </div>
        {user ? (
          <Button nativeButton={false} render={<Link to="/meets/new" />}>
            <PlusIcon data-icon="inline-start" />
            Create meet
          </Button>
        ) : (
          <Button variant="outline" nativeButton={false} render={<Link to="/login" />}>
            Log in to create a meet
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-56 flex-1">
          <InputGroupInput
            value={query}
            onChange={(e) => setParam('q', e.target.value)}
            placeholder="Search title, spot, region…"
            aria-label="Search meets"
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
        </InputGroup>
        <Select
          items={[
            { value: '', label: 'All regions' },
            ...regions.map((r) => ({ value: r, label: r })),
          ]}
          value={region}
          onValueChange={(value) => setParam('region', value as string)}
        >
          <SelectTrigger aria-label="Filter by region">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: '', label: 'All levels' },
            ...LEVELS.map((l) => ({ value: l, label: l })),
          ]}
          value={level}
          onValueChange={(value) => setParam('level', value as string)}
        >
          <SelectTrigger aria-label="Filter by experience level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="">All levels</SelectItem>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>Could not load the meets</AlertTitle>
          <AlertDescription>
            {error}{' '}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setMeets(null)
                setError(null)
                load()
              }}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!meets && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-4xl" />
          ))}
        </div>
      )}

      {meets && visible.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((meet) => (
              <MeetCard key={meet.id} meet={meet} search={location.search} />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Showing {visible.length} of {meets.length} meets
          </p>
        </>
      )}

      {meets && visible.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CloudSunIcon />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? 'No meets match your filters' : 'No meets yet'}</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? 'Try a different search term or widen the region and level filters.'
                : 'The sky is wide open — be the first to plan a meet.'}
            </EmptyDescription>
          </EmptyHeader>
          {hasFilters && (
            <Button variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
              Reset filters
            </Button>
          )}
        </Empty>
      )}
    </div>
  )
}
