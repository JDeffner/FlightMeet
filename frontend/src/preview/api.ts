import { LEVELS, TIERS, GROUPS } from '../lib/types.ts'
import type { AuthUser, GroupDetail, MeetDetail, Participant } from '../lib/types.ts'
import { createSeedState, dateAfter, demoUser, sampleForecast, sampleReports } from './seed.ts'
import type { DemoState, DemoMeet, DemoGroup } from './seed.ts'

export const STORAGE_KEY = 'flightmeet-pages-preview-v1'
export interface CsrfInfo { header: string; token: string }
interface ApiOptions { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown }
type DemoStorage = Pick<Storage, 'getItem' | 'setItem'>

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string> | null

  constructor(status: number, body: { error?: string; errors?: Record<string, string> }) {
    super(body.error ?? (body.errors ? Object.values(body.errors).join(' ') : `Request failed (${status})`))
    this.status = status
    this.fieldErrors = body.errors ?? null
  }
}

function fail(status: number, error: string): never { throw new ApiError(status, { error }) }
function invalid(field: string, message: string): never { throw new ApiError(422, { errors: { [field]: message } }) }
function text(body: Record<string, unknown>, key: string, max: number, required = true): string {
  const value = typeof body[key] === 'string' ? body[key].trim() : ''
  if (required && !value) invalid(key, `${key} is required.`)
  if (value.length > max) invalid(key, `${key} must be ${max} characters or fewer.`)
  return value
}
function nextId(rows: { id: number }[]) { return Math.max(0, ...rows.map(row => row.id)) + 1 }
function find<T extends { id: number }>(rows: T[], id: number): T {
  return rows.find(row => row.id === id) ?? fail(404, 'This item was not found.')
}

export function createDemoApi(storage: DemoStorage) {
  let state = createSeedState()

  function load() {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return state
      const saved = JSON.parse(raw) as DemoState
      if (saved.version === 1 && Number.isInteger(saved.nextMessageId) && Array.isArray(saved.users) && Array.isArray(saved.meets) && Array.isArray(saved.groups) && Array.isArray(saved.messages)) return saved
    } catch { /* An invalid or unavailable cache must not prevent browsing the preview. */ }
    return createSeedState()
  }

  function currentUser() { return state.users.find(user => user.id === state.currentUserId) ?? null }
  function authenticated() {
    const user = currentUser()
    if (!user || !user.active) fail(401, 'Log in to a demo account first.')
    return user
  }
  function admin() {
    const user = authenticated()
    if (!user.permissions['admin.access']) fail(403, 'Use the demo admin account to try this page.')
    return user
  }
  function owner(id: number) {
    const user = authenticated()
    if (id !== user.id && !user.permissions['admin.access']) fail(403, 'Only the organizer can edit this item.')
    return user
  }
  function participant(id: number): Participant {
    const user = find(state.users, id)
    return { id, username: user.username, name: [user.vorname, user.nachname].filter(Boolean).join(' ') || user.username }
  }
  function meetView(meet: DemoMeet): MeetDetail {
    return {
      ...meet, createdBy: participant(meet.createdBy), participants: meet.participants.map(participant),
      participantCount: meet.participants.length, joined: meet.participants.includes(state.currentUserId ?? -1),
      status: meet.participants.length >= meet.maxParticipants ? 'full' : 'open',
    }
  }
  function groupView(group: DemoGroup): GroupDetail {
    return { ...group, createdBy: participant(group.createdBy), members: group.members.map(participant), memberCount: group.members.length, joined: group.members.includes(state.currentUserId ?? -1) }
  }
  function messageView(message: DemoState['messages'][number]) {
    return { id: message.id, body: message.body, createdAt: message.createdAt, mine: message.userId === state.currentUserId, author: participant(message.userId) }
  }
  function membership(ids: number[], method: string, max = Infinity) {
    const id = authenticated().id
    const joined = ids.includes(id)
    if (method === 'POST') {
      if (joined) fail(409, 'You have already joined.')
      if (ids.length >= max) fail(409, 'This meet is full.')
      ids.push(id)
    } else {
      if (!joined) fail(409, 'You have not joined this item.')
      ids.splice(ids.indexOf(id), 1)
    }
  }
  function userFields(body: Record<string, unknown>, existing?: AuthUser) {
    const username = text(body, 'username', 30)
    const email = text(body, 'email', 254)
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) invalid('username', 'Use 3 to 30 letters, numbers, dots, underscores, or hyphens.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid('email', 'Enter a valid example email address.')
    if (state.users.some(user => user.id !== existing?.id && user.username.toLowerCase() === username.toLowerCase())) invalid('username', 'This username is already used in the preview.')
    if (state.users.some(user => user.id !== existing?.id && user.email?.toLowerCase() === email.toLowerCase())) invalid('email', 'This email is already used in the preview.')
    if (!existing && (typeof body.password !== 'string' || body.password.length < 8)) invalid('password', 'Use a made-up password with at least 8 characters.')
    const user = existing ?? demoUser(nextId(state.users), username, '', '', '')
    Object.assign(user, { username, email })
    for (const key of ['vorname', 'nachname', 'strasse', 'plz', 'ort'] as const) user[key] = text(body, key, 100, false) || null
    return user
  }
  function meetFields(body: Record<string, unknown>, existing?: DemoMeet) {
    const title = text(body, 'title', 120)
    const spot = text(body, 'spot', 120)
    const region = text(body, 'region', 80)
    const description = text(body, 'description', 10000)
    const date = text(body, 'date', 10)
    const time = text(body, 'time', 5)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) invalid('date', 'Choose a valid date.')
    if (date < dateAfter(0) && date !== existing?.date) invalid('date', 'Choose today or a future date.')
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) invalid('time', 'Choose a valid time.')
    const maxParticipants = Number(body.maxParticipants)
    if (!Number.isInteger(maxParticipants) || maxParticipants < Math.max(1, existing?.participants.length ?? 0) || maxParticipants > 1000) invalid('maxParticipants', 'Capacity must be between 1 and 1000 and fit the current participants.')
    const level = LEVELS.find(level => level === body.level) ?? invalid('level', 'Choose an experience level.')
    const latitude = body.latitude == null || body.latitude === '' ? null : Number(body.latitude)
    const longitude = body.longitude == null || body.longitude === '' ? null : Number(body.longitude)
    if ((latitude === null) !== (longitude === null) || (latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) || (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))) invalid('latitude', 'Choose a valid point on the map.')
    return { title, spot, region, description, date, time, level, maxParticipants, latitude, longitude }
  }
  function groupFields(body: Record<string, unknown>, existing?: DemoGroup) {
    const name = text(body, 'name', 80)
    if (state.groups.some(group => group.id !== existing?.id && group.name.toLowerCase() === name.toLowerCase())) invalid('name', 'A group with this name already exists.')
    return { name, region: text(body, 'region', 80), description: text(body, 'description', 10000) }
  }

  function dispatch(path: string, method: string, body: Record<string, unknown>) {
    const url = new URL(path, 'https://preview.invalid')
    const route = url.pathname
    const query = url.searchParams
    const csrf = { header: 'X-DEMO-CSRF', token: 'browser-only-preview' }
    if (route === '/api/auth/me' && method === 'GET') return { authenticated: !!currentUser(), user: currentUser(), csrf }
    if (route === '/api/auth/login' && method === 'POST') {
      const login = text(body, 'login', 254).toLowerCase()
      text(body, 'password', 1000)
      const user = state.users.find(user => user.username.toLowerCase() === login || user.email?.toLowerCase() === login)
      if (!user || !user.active) fail(401, 'Try the username demo or admin and a made-up password.')
      state.currentUserId = user.id
      return { user, csrf }
    }
    if (route === '/api/auth/logout' && method === 'POST') { state.currentUserId = null; return { ok: true } }
    if (route === '/api/auth/register' && method === 'POST') {
      const user = userFields(body)
      state.users.push(user)
      state.currentUserId = user.id
      return { user, csrf }
    }
    if (route === '/api/profile' && method === 'GET') return { user: authenticated() }
    if (route === '/api/profile' && method === 'PUT') return { user: userFields(body, authenticated()) }
    if (route === '/api/profile/subscription' && method === 'PUT') {
      const user = authenticated()
      user.subscription_tier = TIERS.find(tier => tier === body.tier) ?? invalid('tier', 'Choose a listed plan.')
      return { user }
    }
    if (route === '/api/meets' && method === 'GET') return { data: state.meets.map(meetView).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)) }
    if (route === '/api/meets' && method === 'POST') {
      const user = authenticated()
      const meet: DemoMeet = { ...meetFields(body), id: nextId(state.meets), createdBy: user.id, participants: [], createdAt: new Date().toISOString() }
      state.meets.push(meet)
      return { meet: meetView(meet) }
    }
    const meetRoute = route.match(/^\/api\/meets\/(\d+)(?:\/(join|weather))?$/)
    if (meetRoute) {
      const meet = find(state.meets, Number(meetRoute[1]))
      if (!meetRoute[2] && method === 'GET') return { meet: meetView(meet) }
      if (!meetRoute[2] && method === 'PUT') { owner(meet.createdBy); Object.assign(meet, meetFields(body, meet)); return { meet: meetView(meet) } }
      if (meetRoute[2] === 'join' && ['POST', 'DELETE'].includes(method)) { membership(meet.participants, method, meet.maxParticipants); return { meet: meetView(meet) } }
      if (meetRoute[2] === 'weather' && method === 'GET') {
        if (meet.latitude === null || meet.longitude === null) fail(409, 'This meet has no coordinates.')
        return { status: 'ok', location: { name: meet.spot, country: 'Germany', latitude: meet.latitude, longitude: meet.longitude }, forecast: sampleForecast() }
      }
    }
    if (route === '/api/groups' && method === 'GET') return { data: state.groups.map(groupView) }
    if (route === '/api/groups' && method === 'POST') {
      const user = authenticated()
      const group: DemoGroup = { ...groupFields(body), id: nextId(state.groups), createdBy: user.id, members: [user.id], image: null }
      state.groups.push(group)
      return { group: groupView(group) }
    }
    const groupRoute = route.match(/^\/api\/groups\/(\d+)(?:\/(join))?$/)
    if (groupRoute) {
      const group = find(state.groups, Number(groupRoute[1]))
      if (!groupRoute[2] && method === 'GET') return { group: groupView(group) }
      if (!groupRoute[2] && method === 'PUT') { owner(group.createdBy); Object.assign(group, groupFields(body, group)); return { group: groupView(group) } }
      if (groupRoute[2] === 'join' && ['POST', 'DELETE'].includes(method)) { membership(group.members, method); return { group: groupView(group) } }
    }
    if (route === '/api/chat/messages' && ['GET', 'POST'].includes(method)) {
      const user = authenticated()
      const rawGroup = method === 'GET' ? query.get('groupId') : body.groupId
      const groupId = rawGroup == null || rawGroup === '' ? null : Number(rawGroup)
      if (groupId !== null && !find(state.groups, groupId).members.includes(user.id)) fail(403, 'Join the group before using its chat.')
      if (method === 'GET') return { data: state.messages.filter(message => message.groupId === groupId && message.id > Number(query.get('after') ?? 0)).slice(-100).map(messageView) }
      const message = { id: state.nextMessageId++, userId: user.id, groupId, body: text(body, 'body', 2000), createdAt: new Date().toISOString() }
      state.messages.push(message)
      return { message: messageView(message) }
    }
    const messageRoute = route.match(/^\/api\/chat\/messages\/(\d+)$/)
    if (messageRoute && method === 'DELETE') {
      const message = find(state.messages, Number(messageRoute[1]))
      owner(message.userId)
      state.messages = state.messages.filter(item => item.id !== message.id)
      return { ok: true, id: message.id }
    }
    if (route === '/api/activity' && method === 'GET') return {
      data: [
        ...state.meets.map(meet => ({ type: 'meet_created', createdAt: meet.createdAt, user: participant(meet.createdBy), meet: { id: meet.id, title: meet.title } })),
        ...state.messages.filter(message => message.groupId === null).map(message => ({ type: 'message', createdAt: message.createdAt, user: participant(message.userId), excerpt: message.body.slice(0, 140) })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20),
    }
    const pilotRoute = route.match(/^\/api\/users\/([^/]+)$/)
    if (pilotRoute && method === 'GET') {
      const user = state.users.find(user => user.username === decodeURIComponent(pilotRoute[1])) ?? fail(404, 'Pilot not found.')
      return { user: {
        ...participant(user.id), vorname: user.vorname, nachname: user.nachname, tier: user.subscription_tier,
        role: user.groups.includes('admin') ? 'admin' : user.groups.includes('moderator') ? 'moderator' : 'user', memberSince: user.created_at,
        groups: state.groups.filter(group => group.members.includes(user.id)).map(group => ({ id: group.id, name: group.name, region: group.region, memberCount: group.members.length })),
        meets: state.meets.filter(meet => meet.createdBy === user.id || meet.participants.includes(user.id)).map(meet => ({ ...meetView(meet), organizer: meet.createdBy === user.id })),
      } }
    }
    if (route === '/api/weather/reports' && method === 'GET') return { data: sampleReports() }
    if (route === '/api/weather' && method === 'GET') {
      const city = (query.get('city') ?? '').trim().toLowerCase()
      const report = sampleReports().find(report => city && report.name.toLowerCase().includes(city)) ?? fail(404, 'Sample locations: Trier, Kandel, Brauneck, Zeltingen, and Freiburg.')
      return { status: 'ok', location: { name: report.name, country: report.country, latitude: report.latitude, longitude: report.longitude }, forecast: report.forecast }
    }
    const reportRoute = route.match(/^\/api\/weather\/reports\/(\d+)\/refresh$/)
    if (reportRoute && method === 'POST') return { report: find(sampleReports(), Number(reportRoute[1])) }
    const adminRoute = route.match(/^\/api\/admin\/users(?:\/(\d+))?$/)
    if (adminRoute) {
      const viewer = admin()
      const id = adminRoute[1] ? Number(adminRoute[1]) : null
      if (id === null && method === 'GET') {
        const search = (query.get('search') ?? '').toLowerCase()
        const group = query.get('group')
        const active = query.get('active')
        const users = state.users.filter(user => (!search || [user.username, user.email, user.vorname, user.nachname].join(' ').toLowerCase().includes(search)) && (!group || user.groups.includes(group)) && (!active || (active === '1' || active === 'true') === user.active))
        const sort = query.get('sort') ?? 'id'
        const direction = query.get('dir') === 'desc' ? -1 : 1
        users.sort((a, b) => String(a[sort as keyof AuthUser] ?? '').localeCompare(String(b[sort as keyof AuthUser] ?? ''), undefined, { numeric: true }) * direction)
        const page = Math.max(1, Number(query.get('page')) || 1)
        const perPage = Math.max(1, Math.min(100, Number(query.get('perPage')) || 10))
        return { data: users.slice((page - 1) * perPage, page * perPage), total: users.length, page, perPage, totalPages: Math.max(1, Math.ceil(users.length / perPage)) }
      }
      if (id !== null && method === 'GET') return { user: find(state.users, id) }
      if ((id === null && method === 'POST') || (id !== null && method === 'PUT')) {
        const user = userFields(body, id === null ? undefined : find(state.users, id))
        const group = GROUPS.find(group => group === body.group) ?? invalid('group', 'Choose a listed role.')
        if (user.id === viewer.id && (group !== 'admin' || body.active === false)) fail(409, 'Keep your current admin account active while previewing.')
        user.groups = [group]
        user.permissions = { 'admin.access': group === 'admin' }
        user.subscription_tier = TIERS.find(tier => tier === body.subscription_tier) ?? invalid('subscription_tier', 'Choose a listed plan.')
        user.active = body.active !== false
        if (id === null) state.users.push(user)
        return { user }
      }
      if (id !== null && method === 'DELETE') {
        if (id === viewer.id) fail(409, 'You cannot delete your current demo account.')
        find(state.users, id)
        state.users = state.users.filter(user => user.id !== id)
        state.meets = state.meets.filter(meet => meet.createdBy !== id).map(meet => ({ ...meet, participants: meet.participants.filter(member => member !== id) }))
        state.groups = state.groups.filter(group => group.createdBy !== id).map(group => ({ ...group, members: group.members.filter(member => member !== id) }))
        state.messages = state.messages.filter(message => message.userId !== id && (message.groupId === null || state.groups.some(group => group.id === message.groupId)))
        return { ok: true }
      }
    }
    if (route === '/api/ping' && method === 'GET') return { status: 'ok', message: 'Browser-only preview' }
    fail(404, 'This action is not available in the preview.')
  }

  return async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
    state = structuredClone(load())
    const method = options.method ?? 'GET'
    const body = options.body && typeof options.body === 'object' ? options.body as Record<string, unknown> : {}
    const before = structuredClone(state)
    try {
      const result = dispatch(path, method, body)
      if (method !== 'GET') {
        try { storage.setItem(STORAGE_KEY, JSON.stringify(state)) }
        catch { fail(507, 'The browser could not save this demo change. Allow site storage or reset the preview.') }
      }
      return structuredClone(result) as T
    } catch (error) {
      state = before
      throw error
    }
  }
}

let browserApi: ReturnType<typeof createDemoApi> | undefined
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  browserApi ??= createDemoApi({
    getItem: key => { try { return localStorage.getItem(key) } catch { return null } },
    setItem: (key, value) => localStorage.setItem(key, value),
  })
  return browserApi<T>(path, options)
}

export function apiUrl(path: string) { return import.meta.env.BASE_URL.replace(/\/$/, '') + path }
