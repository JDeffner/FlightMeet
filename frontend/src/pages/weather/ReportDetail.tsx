// Detail card for the selected weather report. Wind reads first-class here:
// speed, gusts and direction sit in their own accent panel, visually equal to
// the temperature. Also carries the freshness banner (stale => amber + refresh).
import type { ReactNode } from 'react'
import {
  ArrowsClockwiseIcon,
  CloudArrowDownIcon,
  DropIcon,
  MapPinIcon,
  ThermometerSimpleIcon,
  WarningCircleIcon,
  WindIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import type { WeatherReport } from './types'
import { hoursSince, relativeTime } from './format'
import { weatherIcon, weatherLabel } from './wmo'
import { compassPoint } from './wind'
import { WindArrow } from './WindArrow'

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-muted/60 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}

export function ReportDetail({
  report,
  onRefresh,
  refreshing,
}: {
  report: WeatherReport
  onRefresh: () => void
  refreshing: boolean
}) {
  const { current } = report.forecast
  const units = report.forecast.current_units ?? {}
  const tempUnit = units.temperature_2m ?? '°C'
  const windUnit = units.wind_speed_10m ?? 'km/h'
  const isDay = current.is_day !== 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPinIcon weight="fill" className="shrink-0 text-primary" />
          <span>
            {report.name}
            {report.country && (
              <span className="text-muted-foreground">, {report.country}</span>
            )}
          </span>
        </CardTitle>
        {!report.stale && (
          <p className="text-xs text-muted-foreground">
            Updated {relativeTime(report.fetchedAt)}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {report.stale && (
          <div className="flex flex-col gap-2 rounded-2xl bg-amber-500/12 px-4 py-3 text-amber-900 ring-1 ring-amber-500/30 sm:flex-row sm:items-center sm:justify-between dark:text-amber-200">
            <span className="flex items-start gap-2 text-sm">
              <WarningCircleIcon weight="fill" className="mt-0.5 shrink-0" />
              This report is {hoursSince(report.fetchedAt)} hours old. Pull a fresh
              read before you commit to a launch.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing}
              className="shrink-0"
            >
              {refreshing ? <Spinner data-icon="inline-start" /> : <ArrowsClockwiseIcon data-icon="inline-start" />}
              Refresh
            </Button>
          </div>
        )}

        {/* Hero: temperature and wind carry equal visual weight. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-3xl bg-muted/50 px-4 py-4">
            <span className="text-5xl leading-none">
              {weatherIcon(current.weather_code, current.is_day)}
            </span>
            <div>
              <div className="font-heading text-4xl font-bold">
                {Math.round(current.temperature_2m)}
                {tempUnit}
              </div>
              <div className="text-sm text-muted-foreground">
                {weatherLabel(current.weather_code)}
                {!isDay && ' · night'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-3xl bg-primary/10 px-4 py-4 ring-1 ring-primary/25">
            <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
              <WindIcon weight="bold" />
              Wind
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-4xl font-bold">
                {Math.round(current.wind_speed_10m)}
              </span>
              <span className="text-sm text-muted-foreground">{windUnit}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <WindArrow direction={current.wind_direction_10m} className="size-4 text-primary" />
                {compassPoint(current.wind_direction_10m)}
              </span>
              <span>· gusts {Math.round(current.wind_gusts_10m)}</span>
            </div>
          </div>
        </div>

        {/* Secondary metrics. */}
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={<ThermometerSimpleIcon />}
            label="Feels like"
            value={`${Math.round(current.apparent_temperature)}${tempUnit}`}
          />
          <Metric
            icon={<DropIcon />}
            label="Humidity"
            value={`${current.relative_humidity_2m}${units.relative_humidity_2m ?? '%'}`}
          />
          <Metric
            icon={<CloudArrowDownIcon />}
            label="Precip"
            value={`${current.precipitation} ${units.precipitation ?? 'mm'}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
