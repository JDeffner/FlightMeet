// Response types for the FlightMeet weather API. Kept here so other workstreams
// (e.g. a mini weather map on a meet page) can import the same shapes.
// Contract: docs/API_FLIGHTMEET.md + the /api/weather endpoints.

export interface WeatherLocation {
  name: string
  country: string
  latitude: number
  longitude: number
}

/** Current conditions from Open-Meteo. Wind fields are first-class for pilots. */
export interface CurrentWeather {
  time: string
  temperature_2m: number
  relative_humidity_2m: number
  apparent_temperature: number
  is_day: number
  precipitation: number
  weather_code: number
  wind_speed_10m: number
  wind_gusts_10m: number
  wind_direction_10m: number
}

/** Daily arrays, all keyed positionally by `time`. */
export interface DailyForecast {
  time: string[]
  weather_code: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_probability_max: (number | null)[]
  wind_speed_10m_max: number[]
  wind_gusts_10m_max: number[]
  wind_direction_10m_dominant: number[]
}

export interface Forecast {
  current: CurrentWeather
  current_units?: Record<string, string>
  daily: DailyForecast
  daily_units?: Record<string, string>
}

/** GET /api/weather?city=X */
export interface WeatherSearchResponse {
  status: 'ok'
  location: WeatherLocation
  forecast: Forecast
}

/** One cached community report, as stored in the FlightMeet database. */
export interface WeatherReport {
  id: number
  name: string
  country: string
  latitude: number
  longitude: number
  /** ISO timestamp of when the forecast was last fetched from Open-Meteo. */
  fetchedAt: string
  /** True when the report is older than 6 hours. */
  stale: boolean
  forecast: Forecast
}

/** GET /api/weather/reports */
export interface ReportsResponse {
  data: WeatherReport[]
}

/** POST /api/weather/reports/{id}/refresh */
export interface RefreshResponse {
  report: WeatherReport
}
