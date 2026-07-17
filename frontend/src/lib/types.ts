export interface UserRow {
  id: number
  username: string
  email: string | null
  vorname: string | null
  nachname: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  active: boolean
  subscription_tier: Tier
  groups: string[]
  last_active: string | null
  created_at: string | null
}

export interface AuthUser extends UserRow {
  permissions: Record<string, boolean>
}

export interface UserListResponse {
  data: UserRow[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export const TIERS = ['pilot', 'club', 'school'] as const
export type Tier = (typeof TIERS)[number]

export const TIER_LABELS: Record<Tier, string> = {
  pilot: 'Pilot',
  club: 'Club',
  school: 'School',
}

/** Anzeige-Infos passend zur Pricing-Sektion der Landingpage. */
export const TIER_INFO: Record<Tier, { price: string; tagline: string; features: string[] }> = {
  pilot: {
    price: '€0',
    tagline: 'für immer · für jeden lizenzierten Piloten',
    features: ['Unbegrenzt Meets beitreten', 'Meet-Chat + Teilnehmerliste', 'Startplatz-Wettervorhersagen'],
  },
  club: {
    price: '€19/Monat',
    tagline: 'pro Verein · unbegrenzt Mitglieder',
    features: ['Vereinskalender + wiederkehrende Meets', 'Mitgliederrollen und Sicherheitsnotizen', 'Saisonstatistik-Export'],
  },
  school: {
    price: '€49/Monat',
    tagline: 'pro Flugschule · Trainingsfunktionen',
    features: ['Fortschritts-Tracking für Schüler', 'Meets mit Fluglehrer', 'Funk-Checklisten-Vorlagen'],
  },
}

// --- FlightMeet domain (contract: docs/API_FLIGHTMEET.md) -------------------

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'] as const
export type Level = (typeof LEVELS)[number]

export interface Participant {
  id: number
  username: string
  name: string
}

export interface MeetSummary {
  id: number
  title: string
  spot: string
  region: string
  date: string
  time: string
  description: string
  level: Level
  maxParticipants: number
  participantCount: number
  status: 'open' | 'full'
  joined: boolean
}

export interface MeetDetail extends MeetSummary {
  latitude: number | null
  longitude: number | null
  participants: Participant[]
  createdBy: Participant
}

export interface GroupSummary {
  id: number
  name: string
  region: string
  description: string
  image: string | null
  memberCount: number
  joined: boolean
}

export interface GroupDetail extends GroupSummary {
  members: Participant[]
  createdBy: Participant
}

export interface ChatMessage {
  id: number
  body: string
  createdAt: string
  mine: boolean
  author: Participant
}

export const GROUPS = ['user', 'moderator', 'admin'] as const
export type Group = (typeof GROUPS)[number]

export const GROUP_LABELS: Record<string, string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
}
