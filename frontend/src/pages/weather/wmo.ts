// WMO weather-code map (Open-Meteo), adapted from the previous Weather page.
// https://open-meteo.com/en/docs (the #weather_code table).

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

// After dark, swap the sunny codes for a moon so current conditions read right.
const NIGHT_ICONS: Record<number, string> = {
  0: '🌙',
  1: '🌙',
  2: '☁️',
}

/** Human label for a WMO code. */
export function weatherLabel(code: number): string {
  return WEATHER_CODES[code]?.[0] ?? 'Unknown'
}

/**
 * Emoji for a WMO code. Pass `isDay = 0` to get the night-time variant for
 * clear/partly-clear skies.
 */
export function weatherIcon(code: number, isDay = 1): string {
  if (!isDay && code in NIGHT_ICONS) return NIGHT_ICONS[code]
  return WEATHER_CODES[code]?.[1] ?? '❓'
}
