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

export const GROUPS = ['user', 'moderator', 'admin'] as const
export type Group = (typeof GROUPS)[number]

export const GROUP_LABELS: Record<string, string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
}
