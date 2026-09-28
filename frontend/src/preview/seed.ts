import type { AuthUser, Level } from '../lib/types.ts'
import type { Forecast, WeatherReport } from '../pages/weather/types.ts'

export interface DemoMeet {
  id: number
  title: string
  spot: string
  region: string
  date: string
  time: string
  description: string
  level: Level
  maxParticipants: number
  latitude: number | null
  longitude: number | null
  createdBy: number
  participants: number[]
  createdAt: string
}

export interface DemoGroup {
  id: number
  name: string
  region: string
  description: string
  image: null
  createdBy: number
  members: number[]
}

export interface DemoState {
  version: 1
  currentUserId: number | null
  nextMessageId: number
  users: AuthUser[]
  meets: DemoMeet[]
  groups: DemoGroup[]
  messages: { id: number; userId: number; groupId: number | null; body: string; createdAt: string }[]
}

export function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function demoUser(id: number, username: string, first: string, last: string, town: string): AuthUser {
  return {
    id, username, email: `${username}@example.com`, vorname: first, nachname: last,
    strasse: null, plz: null, ort: town, active: true, subscription_tier: 'pilot',
    groups: ['user'], permissions: { 'admin.access': false }, last_active: null,
    created_at: new Date().toISOString(),
  }
}

export function createSeedState(): DemoState {
  const users = [
    demoUser(1, 'demo', 'Alex', 'Pilot', 'Trier'),
    demoUser(2, 'pilot1', 'Lena', 'Vogel', 'Freiburg'),
    demoUser(3, 'pilot2', 'Jonas', 'Adler', 'Bad Tölz'),
    demoUser(4, 'pilot3', 'Mara', 'Falk', 'Bernkastel-Kues'),
    demoUser(5, 'admin', 'Demo', 'Admin', 'Trier'),
  ]
  users[4].groups = ['admin']
  users[4].permissions = { 'admin.access': true }
  const specs: [string, string, string, number, string, Level, number, number, number, number, number[], string][] = [
    ['Sunset Session at Kandel', 'Kandel West Launch', 'Black Forest', 2, '17:30', 'Advanced', 10, 48.06246, 8.01158, 2, [2, 4], 'Meet at the landing field for an evening on the west ridge. This is a sample event for exploring the preview.'],
    ['Thermal Day at Brauneck', 'Brauneck North', 'Bavarian Alps', 3, '10:00', 'All levels', 12, 47.67799, 11.54221, 3, [3, 4], 'Plan a day in the Bavarian Alps with other pilots. Sample meet with a summit briefing and shared return rides.'],
    ['After-Work Soaring, Mosel', 'Zeltingen Ridge', 'Mosel Valley', 6, '18:00', 'Beginner', 8, 49.9655, 7.0081, 4, [4, 2], 'A sample evening meet above the vineyards, with time to meet other pilots at the landing field.'],
    ['Wank Cross-Country Clinic', 'Wank Summit Launch', 'Bavarian Alps', 9, '11:00', 'Intermediate', 2, 47.51121, 11.1437, 3, [3, 2], 'A fully booked sample meet. Explore the participant list and the capacity limit.'],
    ['Schauinsland Morning Flow', 'Schauinsland Launch', 'Black Forest', 12, '09:30', 'All levels', 15, 47.9117, 7.8996, 1, [1], 'Your own sample meet. Use Edit to try the organizer controls and choose a location on the map.'],
  ]
  return {
    version: 1, currentUserId: 1, nextMessageId: 5, users,
    meets: specs.map(([title, spot, region, days, time, level, maxParticipants, latitude, longitude, createdBy, participants, description], i) => ({
      id: i + 1, title, spot, region, date: dateAfter(days), time, level, maxParticipants,
      latitude, longitude, createdBy, participants, description,
      createdAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    })),
    groups: [
      { id: 1, name: 'Black Forest Soarers', region: 'Black Forest', description: 'Weekend flying around Kandel and Schauinsland. Share launch plans and shuttle rides.', image: null, createdBy: 2, members: [2, 4] },
      { id: 2, name: 'Alpine Pilots', region: 'Bavarian Alps', description: 'A sample community for thermal and cross-country days around Brauneck and Wank.', image: null, createdBy: 3, members: [3, 2] },
      { id: 3, name: 'Mosel Valley Gliders', region: 'Mosel Valley', description: 'After-work flying and friendly conversations above the vineyards.', image: null, createdBy: 4, members: [4, 1] },
      { id: 4, name: 'First Cross-Country', region: 'All regions', description: 'Your sample group. Try editing it or inviting yourself to the other groups.', image: null, createdBy: 1, members: [1, 2, 3] },
    ],
    messages: [
      { id: 1, userId: 2, groupId: null, body: 'Welcome to the FlightMeet preview! Try joining a meet or creating your own.', createdAt: new Date(Date.now() - 600000).toISOString() },
      { id: 2, userId: 3, groupId: null, body: 'These are sample conversations. Messages you add stay in this browser.', createdAt: new Date(Date.now() - 300000).toISOString() },
      { id: 3, userId: 4, groupId: 3, body: 'Hello from the Mosel crew! Use this channel to try group chat.', createdAt: new Date(Date.now() - 180000).toISOString() },
      { id: 4, userId: 2, groupId: 1, body: 'Who needs a lift to the sample Kandel meet?', createdAt: new Date(Date.now() - 120000).toISOString() },
    ],
  }
}

export function sampleForecast(): Forecast {
  return {
    current: { time: `${dateAfter(0)}T12:00`, temperature_2m: 19, relative_humidity_2m: 60, apparent_temperature: 18, is_day: 1, precipitation: 0, weather_code: 2, wind_speed_10m: 12, wind_gusts_10m: 21, wind_direction_10m: 250 },
    current_units: { temperature_2m: '°C', relative_humidity_2m: '%', wind_speed_10m: 'km/h', wind_gusts_10m: 'km/h', precipitation: 'mm' },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => dateAfter(i)), weather_code: [2, 3, 61, 2, 1, 2, 3],
      temperature_2m_max: [20, 19, 17, 21, 23, 22, 19], temperature_2m_min: [10, 9, 8, 11, 12, 10, 9],
      precipitation_probability_max: [10, 20, 70, 15, 5, 20, 35], wind_speed_10m_max: [15, 19, 25, 12, 10, 17, 20],
      wind_gusts_10m_max: [22, 28, 36, 19, 17, 25, 30], wind_direction_10m_dominant: [250, 260, 275, 240, 230, 250, 270],
    },
  }
}

export function sampleReports(): WeatherReport[] {
  return [
    { name: 'Trier', latitude: 49.75, longitude: 6.64 },
    { name: 'Kandel', latitude: 48.06246, longitude: 8.01158 },
    { name: 'Brauneck', latitude: 47.67799, longitude: 11.54221 },
    { name: 'Zeltingen', latitude: 49.9655, longitude: 7.0081 },
    { name: 'Freiburg', latitude: 47.9959, longitude: 7.8522 },
  ].map((location, i) => ({ ...location, id: i + 1, country: 'Germany', fetchedAt: new Date().toISOString(), stale: false, forecast: sampleForecast() }))
}
