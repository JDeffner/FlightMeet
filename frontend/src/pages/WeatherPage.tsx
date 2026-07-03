import { useCallback, useEffect, useState, type FormEvent } from "react"

type WeatherLocation = {
  name: string
  country: string
  latitude: number
  longitude: number
}

type CurrentWeather = {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  is_day: number
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
  status: "ok"
  location: WeatherLocation
  forecast: {
    current: CurrentWeather
    current_units?: Record<string, string>
    daily: DailyForecast
  }
}

/**
 * Maps WMO weather codes (used by Open-Meteo) to a label and icon.
 * https://open-meteo.com/en/docs #weather_code documentation
 */
const WEATHER_CODES: Record<number, [label: string, icon: string]> = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Depositing rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Moderate drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  56: ["Light freezing drizzle", "🌧️"],
  57: ["Dense freezing drizzle", "🌧️"],
  61: ["Slight rain", "🌧️"],
  63: ["Moderate rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Light freezing rain", "🌧️"],
  67: ["Heavy freezing rain", "🌧️"],
  71: ["Slight snowfall", "🌨️"],
  73: ["Moderate snowfall", "🌨️"],
  75: ["Heavy snowfall", "❄️"],
  77: ["Snow grains", "❄️"],
  80: ["Slight rain showers", "🌦️"],
  81: ["Moderate rain showers", "🌧️"],
  82: ["Violent rain showers", "⛈️"],
  85: ["Slight snow showers", "🌨️"],
  86: ["Heavy snow showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with slight hail", "⛈️"],
  99: ["Thunderstorm with heavy hail", "⛈️"],
}

function describe(code: number): [string, string] {
  return WEATHER_CODES[code] ?? ["Unknown", "❓"]
}

async function fetchWeather(city?: string): Promise<WeatherPayload> {
  const url = city
    ? `/api/weather?city=${encodeURIComponent(city)}`
    : "/api/weather"
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message ?? `HTTP ${res.status} ${res.statusText}`)
  }
  return data as WeatherPayload
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3">
      <div className="text-xs tracking-wider uppercase opacity-65">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

export function WeatherPage() {
  const [weather, setWeather] = useState<WeatherPayload | null>(null)
  const [cityInput, setCityInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (city?: string) => {
    setLoading(true)
    setError(null)
    try {
      setWeather(await fetchWeather(city))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    void load(cityInput.trim() || undefined)
  }

  const current = weather?.forecast.current
  const units = weather?.forecast.current_units ?? {}
  const tempUnit = units.temperature_2m ?? "°C"
  const [condLabel, condIcon] = current
    ? describe(current.weather_code)
    : ["", ""]

  return (
    <main className="min-h-svh bg-gradient-to-br from-[#1e3a5f] via-[#2c5f8a] to-[#3d7ab5] px-4 py-8 text-slate-100">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Search for a city…"
            className="flex-1 rounded-lg bg-white/95 px-4 py-2.5 text-[#1e3a5f] placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-300 px-5 py-2.5 font-semibold text-[#1e3a5f] hover:bg-amber-200 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Search"}
          </button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {weather && current && (
          <>
            <section className="rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-sm">
              <h1 className="text-2xl font-semibold">
                {weather.location.name}
                {weather.location.country && `, ${weather.location.country}`}
              </h1>
              <p className="mt-0.5 text-sm opacity-75">
                Updated{" "}
                {new Date(current.time).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                (local time)
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-6">
                <span className="text-7xl leading-none">{condIcon}</span>
                <span className="text-6xl font-bold">
                  {Math.round(current.temperature_2m)}
                  {tempUnit}
                </span>
                <span className="text-lg opacity-90">{condLabel}</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                  label="Feels like"
                  value={`${Math.round(current.apparent_temperature)}${tempUnit}`}
                />
                <Metric
                  label="Humidity"
                  value={`${current.relative_humidity_2m}${units.relative_humidity_2m ?? "%"}`}
                />
                <Metric
                  label="Wind"
                  value={`${current.wind_speed_10m} ${units.wind_speed_10m ?? "km/h"}`}
                />
                <Metric
                  label="Precipitation"
                  value={`${current.precipitation} ${units.precipitation ?? "mm"}`}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/15 bg-white/10 p-8 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-semibold opacity-90">
                7-day forecast
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                {weather.forecast.daily.time.map((date, i) => {
                  const [, dayIcon] = describe(
                    weather.forecast.daily.weather_code[i],
                  )
                  const rain =
                    weather.forecast.daily.precipitation_probability_max[i]
                  return (
                    <div
                      key={date}
                      className="rounded-xl bg-white/10 px-2 py-3 text-center"
                    >
                      <div className="text-sm font-semibold">
                        {i === 0
                          ? "Today"
                          : new Date(date).toLocaleDateString("en-GB", {
                              weekday: "short",
                            })}
                      </div>
                      <div className="my-1.5 text-2xl">{dayIcon}</div>
                      <div className="font-semibold">
                        {Math.round(weather.forecast.daily.temperature_2m_max[i])}°
                      </div>
                      <div className="text-sm opacity-60">
                        {Math.round(weather.forecast.daily.temperature_2m_min[i])}°
                      </div>
                      {rain !== null && rain !== undefined && (
                        <div className="mt-1 text-xs opacity-70">💧 {rain}%</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {loading && !weather && (
          <p className="text-center text-sm opacity-75">Loading weather…</p>
        )}

        <footer className="text-center text-xs opacity-60">
          Weather data by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open-Meteo.com
          </a>
        </footer>
      </div>
    </main>
  )
}

export default WeatherPage
