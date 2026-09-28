import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDemoApi, ApiError, STORAGE_KEY } from '../src/preview/api.ts'
import { dateAfter } from '../src/preview/seed.ts'

function setup() {
  const values = new Map()
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const request = createDemoApi(storage)
  const login = (name = 'demo') => request('/api/auth/login', { method: 'POST', body: { login: name, password: 'made-up-password' } })
  return { values, storage, request, login }
}
const status = expected => error => error instanceof ApiError && error.status === expected

test('guests can browse sample data but cannot mutate it', async () => {
  const { request } = setup()
  assert.equal((await request('/api/auth/me')).authenticated, false)
  assert.equal((await request('/api/meets')).data.length, 5)
  assert.equal((await request('/api/groups')).data.length, 4)
  await assert.rejects(request('/api/meets/1/join', { method: 'POST' }), status(401))
  await assert.rejects(request('/api/admin/users'), status(401))
})

test('join and leave update counts and survive a fresh client', async () => {
  const { request, login, storage } = setup()
  await login()
  const original = (await request('/api/meets/1')).meet
  const joined = (await request('/api/meets/1/join', { method: 'POST' })).meet
  assert.equal(joined.joined, true)
  assert.equal(joined.participantCount, original.participantCount + 1)
  assert.equal((await createDemoApi(storage)('/api/meets/1')).meet.joined, true)
  await assert.rejects(request('/api/meets/1/join', { method: 'POST' }), status(409))
  await assert.rejects(request('/api/meets/4/join', { method: 'POST' }), status(409))
  const left = (await request('/api/meets/1/join', { method: 'DELETE' })).meet
  assert.equal(left.participantCount, original.participantCount)
  assert.equal(left.joined, false)
})

test('meet creation, organizer editing, and validation match the UI contract', async () => {
  const { request, login } = setup()
  await login()
  const body = { title: 'Preview meet', spot: 'Test launch', region: 'Test region', date: dateAfter(2), time: '10:00', level: 'All levels', maxParticipants: 4, description: 'A sample meet.', latitude: 49, longitude: 7 }
  const created = (await request('/api/meets', { method: 'POST', body })).meet
  assert.equal(created.createdBy.username, 'demo')
  const updated = (await request(`/api/meets/${created.id}`, { method: 'PUT', body: { ...body, title: 'Updated meet' } })).meet
  assert.equal(updated.title, 'Updated meet')
  await assert.rejects(request('/api/meets/1', { method: 'PUT', body }), status(403))
  await assert.rejects(request('/api/meets', { method: 'POST', body: { ...body, maxParticipants: 0 } }), status(422))
  await assert.rejects(request('/api/meets', { method: 'POST', body: { ...body, latitude: 200 } }), status(422))
})

test('group membership controls chat and message IDs remain monotonic after deletion', async () => {
  const { request, login } = setup()
  await login()
  await assert.rejects(request('/api/chat/messages?groupId=1'), status(403))
  await request('/api/groups/1/join', { method: 'POST' })
  assert.ok((await request('/api/chat/messages?groupId=1')).data.length)
  const sent = (await request('/api/chat/messages', { method: 'POST', body: { body: 'Hello from the preview', groupId: 1 } })).message
  assert.equal(sent.mine, true)
  await request(`/api/chat/messages/${sent.id}`, { method: 'DELETE' })
  const next = (await request('/api/chat/messages', { method: 'POST', body: { body: 'Another sample message', groupId: 1 } })).message
  assert.ok(next.id > sent.id)
  assert.deepEqual((await request(`/api/chat/messages?groupId=1&after=${sent.id}`)).data.map(message => message.id), [next.id])
  await assert.rejects(request('/api/chat/messages/1', { method: 'DELETE' }), status(403))
  await request('/api/groups/1/join', { method: 'DELETE' })
  await assert.rejects(request('/api/chat/messages?groupId=1'), status(403))
})

test('registration and profile changes persist without saving passwords', async () => {
  const { request, values } = setup()
  await request('/api/auth/register', { method: 'POST', body: { username: 'previewpilot', email: 'sample@example.com', password: 'never-store-this', vorname: 'Sample', nachname: 'Pilot' } })
  assert.equal((await request('/api/auth/me')).user.username, 'previewpilot')
  await request('/api/profile', { method: 'PUT', body: { username: 'previewpilot', email: 'sample@example.com', vorname: 'Changed', nachname: 'Pilot', ort: 'Trier', password: 'also-not-saved' } })
  assert.equal((await request('/api/users/previewpilot')).user.name, 'Changed Pilot')
  const stored = values.get(STORAGE_KEY)
  assert.ok(!stored.includes('never-store-this') && !stored.includes('also-not-saved') && !stored.includes('password'))
  await request('/api/auth/logout', { method: 'POST' })
  assert.equal((await request('/api/auth/me')).authenticated, false)
})

test('admin filtering, paging and deletion preserve related records', async () => {
  const { request, login } = setup()
  await login()
  await assert.rejects(request('/api/admin/users'), status(403))
  await login('admin')
  const filtered = await request('/api/admin/users?search=Lena&perPage=1')
  assert.equal(filtered.total, 1)
  assert.equal(filtered.data[0].username, 'pilot1')
  await request('/api/admin/users/2', { method: 'DELETE' })
  assert.ok((await request('/api/meets')).data.every(meet => meet.createdBy.id !== 2 && meet.participants.every(member => member.id !== 2)))
  assert.ok((await request('/api/activity')).data.every(event => event.user.id !== 2))
  await assert.rejects(request('/api/admin/users/5', { method: 'DELETE' }), status(409))
})

test('sample weather works offline for listed cities and meet locations', async () => {
  const { request } = setup()
  const reports = (await request('/api/weather/reports')).data
  assert.equal(reports.length, 5)
  const result = await request('/api/weather?city=Trier')
  assert.equal(result.location.name, 'Trier')
  assert.equal(result.forecast.daily.time.length, 7)
  assert.equal((await request('/api/meets/1/weather')).location.name, 'Kandel West Launch')
  await assert.rejects(request('/api/weather?city=unknown-city'), status(404))
  assert.equal((await request('/api/weather/reports/1/refresh', { method: 'POST' })).report.id, 1)
})

test('invalid storage does not break browsing; failed writes do not report success', async () => {
  const { request, values } = setup()
  values.set(STORAGE_KEY, '{broken')
  assert.equal((await request('/api/meets')).data.length, 5)
  const unavailable = createDemoApi({ getItem: () => null, setItem: () => { throw new Error('Storage is full') } })
  await assert.rejects(unavailable('/api/auth/login', { method: 'POST', body: { login: 'demo', password: 'demo' } }), status(507))
  assert.equal((await unavailable('/api/auth/me')).authenticated, false)
})
