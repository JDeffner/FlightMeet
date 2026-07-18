// Weather panel for a meet's detail view — FR-9, FR-10, FR-12, A-5.
import { useEffect, useState } from 'react'
import { CloudSlashIcon } from '@phosphor-icons/react'
import { api, ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Response shape of GET /api/meets/{id}/weather (same as /api/weather).
type CurrentWeather = {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  precipitation: number
  weather_code: number
  wind_speed_10m: number
}

type DailyForecast = {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_probability_max: (number | null)[]
}

type WeatherPayload = {
  location: { name: string; country: string }
  forecast: {
    current: CurrentWeather
    current_units?: Record<string, string>
    daily: DailyForecast
  }
}

/** WMO weather codes (Open-Meteo) → label + icon. */
const WEATHER_CODES: Record<number, [label: string, icon: string]> = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Depositing rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Moderate drizzle', '🌦️'],
  55: ['Dense drizzle', '🌧️'],
  56: ['Light freezing drizzle', '🌧️'],
  57: ['Dense freezing drizzle', '🌧️'],
  61: ['Slight rain', '🌧️'],
  63: ['Moderate rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  66: ['Light freezing rain', '🌧️'],
  67: ['Heavy freezing rain', '🌧️'],
  71: ['Slight snowfall', '🌨️'],
  73: ['Moderate snowfall', '🌨️'],
  75: ['Heavy snowfall', '❄️'],
  77: ['Snow grains', '❄️'],
  80: ['Slight rain showers', '🌦️'],
  81: ['Moderate rain showers', '🌧️'],
  82: ['Violent rain showers', '⛈️'],
  85: ['Slight snow showers', '🌨️'],
  86: ['Heavy snow showers', '🌨️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm with slight hail', '⛈️'],
  99: ['Thunderstorm with heavy hail', '⛈️'],
}

function describe(code: number): [string, string] {
  return WEATHER_CODES[code] ?? ['Unknown', '❓']
}

export function MeetWeatherPanel({ meetId, meetDate }: { meetId: number; meetDate: string }) {
  // Keyed by the meet id it was fetched for: when `meetId` changes, the derived
  // values below fall back to the loading state until the new fetch lands — no
  // state reset inside the effect needed.
  const [result, setResult] = useState<{
    meetId: number
    weather: WeatherPayload | null
    error: string | null
  } | null>(null)
  const fetched = result && result.meetId === meetId ? result : null
  const weather = fetched?.weather ?? null
  const error = fetched?.error ?? null
  const loading = !fetched

  useEffect(() => {
    let cancelled = false
    api<WeatherPayload>(`/api/meets/${meetId}/weather`)
      .then((data) => {
        if (!cancelled) setResult({ meetId, weather: data, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setResult({
          meetId,
          weather: null,
          error:
            err instanceof ApiError && err.status === 409
              ? "This meet's flying spot has no coordinates yet, so there is no forecast."
              : 'The weather service is not reachable right now. Check back a little later.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [meetId])

  if (loading) {
    return <Skeleton className="h-72 w-full rounded-4xl" />
  }

  if (error || !weather) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather at the spot</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
          <CloudSlashIcon className="mt-0.5 size-5 shrink-0" />
          <p>{error ?? 'No forecast available.'}</p>
        </CardContent>
      </Card>
    )
  }

  const { current, daily } = weather.forecast
  const units = weather.forecast.current_units ?? {}
  const tempUnit = units.temperature_2m ?? '°C'
  const [condLabel, condIcon] = describe(current.weather_code)
  const meetDayIndex = daily.time.indexOf(meetDate)
  const beyondHorizon = meetDayIndex === -1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather at the spot</CardTitle>
        <CardDescription>
          {weather.location.name}
          {weather.location.country && `, ${weather.location.country}`} · Open-Meteo forecast
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="text-5xl leading-none">{condIcon}</span>
          <div>
            <div className="font-heading text-3xl font-bold">
              {Math.round(current.temperature_2m)}
              {tempUnit}
            </div>
            <div className="text-sm text-muted-foreground">
              {condLabel} · wind {current.wind_speed_10m} {units.wind_speed_10m ?? 'km/h'} · feels
              like {Math.round(current.apparent_temperature)}
              {tempUnit}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          {daily.time.map((date, i) => {
            const [dayLabel, dayIcon] = describe(daily.weather_code[i])
            const rain = daily.precipitation_probability_max[i]
            const isMeetDay = i === meetDayIndex
            return (
              <div
                key={date}
                title={dayLabel}
                className={cn(
                  'rounded-2xl bg-muted px-1 py-2 text-center',
                  isMeetDay && 'bg-primary/10 ring-2 ring-primary',
                )}
              >
                <div className={cn('text-xs font-semibold', isMeetDay && 'text-primary')}>
                  {new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div className="my-1 text-xl">{dayIcon}</div>
                <div className="text-sm font-semibold">
                  {Math.round(daily.temperature_2m_max[i])}°
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(daily.temperature_2m_min[i])}°
                </div>
                {rain !== null && rain !== undefined && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground">💧{rain}%</div>
                )}
              </div>
            )
          })}
        </div>

        {beyondHorizon ? (
          <p className="text-xs text-muted-foreground">
            The meet date is beyond the {daily.time.length}-day forecast horizon — check back
            closer to the day.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Badge variant="outline" className="mr-1.5 ring-1 ring-primary">
              {new Date(meetDate).toLocaleDateString('en-GB', { weekday: 'short' })}
            </Badge>
            is the meet day — highlighted above.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
