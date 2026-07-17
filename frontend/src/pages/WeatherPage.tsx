// Weather: a map-centric, wind-first scouting page for pilots (FR weather).
// The map shows every community-cached report as a clustered brand pin. Search
// a place to fetch + cache its forecast, then pan to it. Selecting a pin opens
// the detail card and the 7-day outlook; stale reports can be refreshed in place.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  DatabaseIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import type { Map as LeafletMap } from 'leaflet'
import { api, ApiError } from '@/lib/api'
import { Alert, AlertAction, AlertTitle } from '@/components/ui/alert'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { BaseMap } from '@/components/map/BaseMap'
import { MarkerClusterLayer, type ClusterMarkerItem } from '@/components/map/MarkerClusterLayer'
import { ForecastStrip } from '@/pages/weather/ForecastStrip'
import { ReportDetail } from '@/pages/weather/ReportDetail'
import type {
  ReportsResponse,
  RefreshResponse,
  WeatherReport,
  WeatherSearchResponse,
} from '@/pages/weather/types'

const GERMANY_CENTER: [number, number] = [50.5, 9.5]
const GERMANY_ZOOM = 6

/** Escape a string for safe interpolation into a Leaflet popup's HTML. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

/** The report whose coordinates sit closest to a searched location. */
function nearestReport(
  reports: WeatherReport[],
  lat: number,
  lng: number,
): WeatherReport | null {
  let best: WeatherReport | null = null
  let bestDistance = Infinity
  for (const report of reports) {
    const distance = (report.latitude - lat) ** 2 + (report.longitude - lng) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = report
    }
  }
  return best
}

function searchErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404)
      return "We couldn't find that place. Check the spelling, or try a bigger town nearby."
    if (err.status === 502 || err.status === 503)
      return "The weather service isn't answering right now. Give it a minute and try again."
  }
  return 'Something went wrong fetching that forecast. Please try again.'
}

function refreshErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404)
      return 'That report has aged out of the database. Search for the place again to bring it back.'
    if (err.status === 502 || err.status === 503)
      return "The weather service isn't answering right now. Give it a minute and try again."
  }
  return 'Could not refresh that report. Please try again.'
}

export function WeatherPage() {
  const [reports, setReports] = useState<WeatherReport[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [cityInput, setCityInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [loadingReports, setLoadingReports] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  // All state writes happen after the await (in async callbacks), so this is
  // safe to call straight from the mount effect. Callers that want the loading
  // spinner (the manual reload button) flip `loadingReports` themselves first.
  const loadReports = useCallback(async (): Promise<WeatherReport[] | null> => {
    try {
      const res = await api<ReportsResponse>('/api/weather/reports')
      setReports(res.data)
      return res.data
    } catch {
      setError('We could not reach the FlightMeet weather store. Try again in a moment.')
      return null
    } finally {
      setLoadingReports(false)
    }
  }, [])

  // Initial load. Inlined (rather than calling loadReports) so every state write
  // sits inside an async callback, never synchronously in the effect body.
  useEffect(() => {
    let active = true
    api<ReportsResponse>('/api/weather/reports')
      .then((res) => {
        if (active) setReports(res.data)
      })
      .catch(() => {
        if (active)
          setError('We could not reach the FlightMeet weather store. Try again in a moment.')
      })
      .finally(() => {
        if (active) setLoadingReports(false)
      })
    return () => {
      active = false
    }
  }, [])

  const flyTo = useCallback((lat: number, lng: number) => {
    const map = mapRef.current
    if (map) map.flyTo([lat, lng], Math.max(map.getZoom(), 9), { duration: 0.8 })
  }, [])

  const focusReport = useCallback(
    (report: WeatherReport) => {
      setSelectedId(report.id)
      flyTo(report.latitude, report.longitude)
    },
    [flyTo],
  )

  async function onSearch(event: FormEvent) {
    event.preventDefault()
    const city = cityInput.trim()
    if (!city) return
    setSearching(true)
    setError(null)
    try {
      const res = await api<WeatherSearchResponse>(
        `/api/weather?city=${encodeURIComponent(city)}`,
      )
      const { latitude, longitude } = res.location
      flyTo(latitude, longitude)
      // The backend just stored this report; re-fetch the list so its pin
      // appears, then select the freshly cached one.
      const data = await loadReports()
      if (data) {
        const match = nearestReport(data, latitude, longitude)
        if (match) setSelectedId(match.id)
      }
      setCityInput('')
    } catch (err) {
      setError(searchErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  async function onRefreshSelected() {
    if (selectedId == null) return
    setRefreshing(true)
    setError(null)
    try {
      const res = await api<RefreshResponse>(
        `/api/weather/reports/${selectedId}/refresh`,
        { method: 'POST' },
      )
      setReports((prev) =>
        prev ? prev.map((r) => (r.id === res.report.id ? res.report : r)) : prev,
      )
    } catch (err) {
      setError(refreshErrorMessage(err))
    } finally {
      setRefreshing(false)
    }
  }

  const selected = reports?.find((r) => r.id === selectedId) ?? null

  const items = useMemo<ClusterMarkerItem[]>(
    () =>
      (reports ?? []).map((report) => ({
        id: report.id,
        lat: report.latitude,
        lng: report.longitude,
        selected: report.id === selectedId,
        popup: `<strong>${escapeHtml(report.name)}</strong>${
          report.country ? ', ' + escapeHtml(report.country) : ''
        }`,
        onClick: () => focusReport(report),
      })),
    [reports, selectedId, focusReport],
  )

  const noReports = reports !== null && reports.length === 0

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Wind &amp; weather</h1>
        <p className="text-sm text-muted-foreground">
          Scout the wind before you fly. Search a spot to cache its forecast, then
          read the whole community&apos;s map.
        </p>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <InputGroup className="flex-1">
          <InputGroupInput
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search a launch site, town or region…"
            aria-label="Search for a place"
          />
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button type="submit" disabled={searching}>
          {searching && <Spinner data-icon="inline-start" />}
          Search
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>{error}</AlertTitle>
          <AlertAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setError(null)}
              aria-label="Dismiss"
            >
              <XIcon />
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Map + database controls. */}
        <div className="flex flex-col gap-3 lg:col-span-3">
          <BaseMap
            mapRef={mapRef}
            center={GERMANY_CENTER}
            zoom={GERMANY_ZOOM}
            className="h-[380px] sm:h-[460px] lg:h-[560px]"
            ariaLabel="Map of cached weather reports"
          >
            <MarkerClusterLayer items={items} />
          </BaseMap>

          <div className="flex flex-col gap-3 rounded-3xl bg-card px-4 py-3 text-sm shadow-md ring-1 ring-foreground/5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-muted-foreground">
              <InfoIcon className="mt-0.5 shrink-0 text-primary" />
              Every pin is a community-cached report. When any pilot searches a
              place, it lands here for everyone.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoadingReports(true)
                void loadReports()
              }}
              disabled={loadingReports}
              className="shrink-0"
            >
              {loadingReports ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <DatabaseIcon data-icon="inline-start" />
              )}
              Load from FlightMeet database
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            These are cached reads, not live requests. Reports older than 4 days
            are cleared automatically.
          </p>
        </div>

        {/* Selected report or a prompt / empty state. */}
        <div className="lg:col-span-2">
          {loadingReports && !reports ? (
            <Skeleton className="h-[440px] w-full rounded-4xl" />
          ) : selected ? (
            <ReportDetail
              report={selected}
              onRefresh={onRefreshSelected}
              refreshing={refreshing}
            />
          ) : noReports ? (
            <Empty className="h-full border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPinIcon />
                </EmptyMedia>
                <EmptyTitle>No pins on the map yet</EmptyTitle>
                <EmptyDescription>
                  Search for a place above to drop the first pin. Your forecast gets
                  cached here for the whole community to scout.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Card className="h-full">
              <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                <MapPinIcon weight="fill" className="size-8 text-primary" />
                <div>
                  <p className="font-heading text-lg font-medium">Pick a spot</p>
                  <p className="text-sm text-muted-foreground">
                    Tap a pin on the map to read its wind, gusts and 7-day outlook.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {selected && <ForecastStrip forecast={selected.forecast} />}

      <p className="text-center text-xs text-muted-foreground">
        Forecasts by{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          Open-Meteo
        </a>
        . Map data © OpenStreetMap contributors.
      </p>
    </div>
  )
}

export default WeatherPage
