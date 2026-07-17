# FlightMeet API contract — meets, groups, chat, registration

JSON contract between the React SPA and the CodeIgniter backend for the
FlightMeet features (see [`REQUIREMENTS.md`](REQUIREMENTS.md)). Everything
lives under `/api/*`; mutating requests need the `X-CSRF-TOKEN` header
(handled by `frontend/src/lib/api.ts`). Frontend types mirroring these
shapes live in `frontend/src/lib/types.ts`.

Conventions:

- Success: `2xx` with the documented body.
- Validation failure: `422` `{ "errors": { field: "message" } }`.
- Not authenticated: `401 { "error": "..." }`; not allowed: `403`;
  missing resource: `404`; conflict (meet full, duplicate join): `409`.
- Dates are `YYYY-MM-DD`, times `HH:MM`, timestamps ISO-8601.
- `Participant` = `{ "id": number, "username": string, "name": string }`
  (`name` = "Vorname Nachname" or the username as fallback).

## Registration

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | guest only |

Body: `{ username, email, password, vorname?, nachname? }`.
Creates a Shield account in group `user` (every account is a pilot by
default), logs the session in, and returns the same shape as
`POST /api/auth/login`: `{ user: AuthUser, csrf: { header, token } }` (201).
Validation mirrors the admin create-user rules (unique username/email,
Shield password rules).

## Meets

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/meets` | public | all meets (FR-3); search/filter happen client-side (FR-6) |
| GET | `/api/meets/{id}` | public | detail incl. participants (FR-7) |
| POST | `/api/meets` | session | create (FR-17); geocodes spot if no coords given |
| PUT | `/api/meets/{id}` | session | edit (creator or admin only) |
| POST | `/api/meets/{id}/join` | session | join (FR-13); `409` when full (FR-15) or already joined |
| DELETE | `/api/meets/{id}/join` | session | leave (FR-14); `409` when not joined |
| GET | `/api/meets/{id}/weather` | public | forecast for the meet's coordinates (FR-9/10) |

`GET /api/meets` → `{ "data": MeetSummary[] }`, ordered by date ascending.

```jsonc
// MeetSummary
{
  "id": 1, "title": "...", "spot": "...", "region": "...",
  "date": "2026-07-19", "time": "17:30", "description": "...",
  "level": "Advanced",              // Beginner | Intermediate | Advanced | All levels
  "maxParticipants": 10,
  "participantCount": 3,             // derived from meet_participants (NFR-4)
  "status": "open",                 // "full" when participantCount == maxParticipants
  "joined": false                    // always false for guests
}
```

`GET /api/meets/{id}` → `{ "meet": MeetDetail }` where `MeetDetail` extends
`MeetSummary` with `latitude`, `longitude` (nullable), `participants:
Participant[]`, `createdBy: Participant`.

`POST /api/meets` body: `{ title, spot, region, date, time, level,
maxParticipants, description, latitude?, longitude? }`. When coordinates are
omitted the backend geocodes `spot` (fallback: `region`) via Open-Meteo's
geocoding API; an unresolvable spot leaves them `null` (weather then shows a
friendly "no forecast" note — FR-12, never a hard error). Date must not be in
the past. Returns `201 { "meet": MeetDetail }`.

`PUT /api/meets/{id}` edits a meet. Allowed for the creator (`created_by`) or
an admin, else `403 { "error": "Only the organizer can edit this meet." }`.
Same body and validation as create, with these extra rules:

- `maxParticipants` must be `>=` the current participant count, else
  `422 { "errors": { "maxParticipants": "..." } }`.
- The date must not be in the past **only when it changed** from the stored
  value (an unchanged past date may be re-saved).
- Coordinates: if both `latitude` and `longitude` are provided, they are used
  as-is. If both are empty/absent, the stored coordinates are kept when `spot`
  **and** `region` are unchanged; otherwise the spot (fallback: region) is
  re-geocoded like create.

Returns `200 { "meet": MeetDetail }`. Updates `updated_at`.

`join`/`leave` return `200 { "meet": MeetDetail }` (fresh state, so both
views stay consistent — FR-16).

`GET /api/meets/{id}/weather` → same payload as `/api/weather` (current +
daily forecast) but resolved from the meet's stored coordinates; `409
{ "error": "This meet has no coordinates." }` when they are null.

## Groups

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/groups` | public | all groups |
| GET | `/api/groups/{id}` | public | detail incl. members |
| POST | `/api/groups` | session | create a group (creator auto-joins) |
| PUT | `/api/groups/{id}` | session | edit (founder or admin only) |
| POST | `/api/groups/{id}/join` | session | join |
| DELETE | `/api/groups/{id}/join` | session | leave |

`GET /api/groups` → `{ "data": GroupSummary[] }`:

```jsonc
// GroupSummary
{
  "id": 1, "name": "Black Forest Soarers", "region": "Black Forest",
  "description": "...", "image": null,   // optional card image URL/path
  "memberCount": 3, "joined": false
}
```

`GET /api/groups/{id}` → `{ "group": GroupDetail }` = `GroupSummary` +
`members: Participant[]` + `createdBy: Participant`.

`POST /api/groups` body `{ name, region, description }` → `201 { "group":
GroupDetail }`. Join/leave return `200 { "group": GroupDetail }`; duplicate
join / leaving a group you're not in → `409`.

`PUT /api/groups/{id}` edits `name`/`region`/`description`. Allowed for the
founder (`created_by`) or an admin, else `403 { "error": "Only the founder can
edit this group." }`. Validation mirrors create, but the unique-name check
ignores the group itself (`is_unique[flight_groups.name,id,{id}]`). Returns
`200 { "group": GroupDetail }`.

## Chat

One global "All pilots" channel plus one channel per group
(`messages.group_id` NULL = global). All chat endpoints require a session;
group channels additionally require membership (403 otherwise).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/chat/messages?groupId={id}&after={messageId}` | list messages (FR-20) |
| POST | `/api/chat/messages` | send (FR-21) |
| DELETE | `/api/chat/messages/{id}` | delete a message (own message or admin) |

`groupId` absent → global channel. `after` (optional) returns only messages
with `id > after` — the SPA polls with it every few seconds and appends.
Response: `{ "data": ChatMessage[] }`, oldest→newest, capped at the latest
100 when `after` is absent.

```jsonc
// ChatMessage
{
  "id": 7, "body": "...", "createdAt": "2026-07-17T09:12:00+02:00",
  "mine": false,
  "author": { "id": 4, "username": "pilot1", "name": "Lena Vogel" }
}
```

`POST /api/chat/messages` body `{ body, groupId? }` → `201 { "message":
ChatMessage }`. `body` is required, trimmed, max 2000 chars.

`DELETE /api/chat/messages/{id}` deletes a message. Allowed for the author or
an admin, else `403 { "error": "You can only delete your own messages." }`;
unknown id → `404 { "error": "Message not found." }`. Returns
`200 { "ok": true, "id": <id> }`.

## Pilot profiles

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/users/{username}` | public | public pilot profile by username |

`GET /api/users/{username}` → `200 { "user": PilotProfile }`; unknown username
→ `404 { "error": "User not found." }`. Exposes only public data (no email,
address, or anything private).

```jsonc
// PilotProfile
{
  "id": 7,
  "username": "lena",
  "name": "Lena K.",            // "Vorname Nachname", fallback username
  "vorname": "Lena",            // nullable
  "nachname": "K.",             // nullable
  "tier": "pilot",              // subscription_tier: pilot | club | school
  "role": "user",               // highest Shield group: admin > moderator > user
  "memberSince": "2026-07-01T09:00:00+02:00",  // users.created_at, ISO (nullable)
  "groups": [                    // flight_groups the pilot is a member of
    { "id": 1, "name": "Mosel Pilots", "region": "Mosel Valley", "memberCount": 5 }
  ],
  "meets": [                     // meets the pilot created OR joined, deduped, date DESC
    {
      "id": 3, "title": "...", "spot": "...", "region": "...",
      "date": "2026-07-20", "time": "18:00",
      "participantCount": 4, "maxParticipants": 10,
      "organizer": true          // true when the pilot is the creator
    }
  ]
}
```

## Activity feed

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/activity` | public | recent activity for the landing page |

`GET /api/activity` → `200 { "data": ActivityEvent[] }`: a union of the latest
meet creations, meet joins, and global chat messages, sorted by `createdAt`
descending, capped at 10. `user` = `{ id, username, name }`.

```jsonc
// meet created
{ "type": "meet_created", "createdAt": ISO, "user": {...}, "meet": { "id": 1, "title": "..." } }
// meet joined (a meet_participants row)
{ "type": "meet_joined",  "createdAt": ISO, "user": {...}, "meet": { "id": 1, "title": "..." } }
// global chat message (messages.group_id IS NULL)
{ "type": "message",      "createdAt": ISO, "user": {...}, "excerpt": "first 90 chars of body" }
```

## Weather

The general weather endpoints live outside this contract's core domain but are
consumed by the same SPA. Forecasts come from Open-Meteo; wind is first-class
for the paraglider audience (current: `wind_speed_10m`, `wind_gusts_10m`,
`wind_direction_10m`; daily: `wind_speed_10m_max`, `wind_gusts_10m_max`,
`wind_direction_10m_dominant`).

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/weather?city=...` | public | current + 7-day forecast; caches resolved city searches |
| GET | `/api/weather/reports` | public | every cached forecast report |
| POST | `/api/weather/reports/{id}/refresh` | public | re-fetch a cached report |

`GET /api/weather[?city=...]` → `200 { "status": "ok", "location": { name,
country, latitude, longitude }, "forecast": {...} }`. Unknown city → `404`;
weather service down → `502` (both `{ "status": "error", "message": "..." }`).
When a city search resolves and the forecast succeeds, a `weather_reports` row
is upserted keyed by `(latitude, longitude)`. Rows older than 4 days are purged
whenever the table is touched.

`GET /api/weather/reports` → `200 { "data": WeatherReport[] }`, newest fetch
first.

```jsonc
// WeatherReport
{
  "id": 1, "name": "Trier", "country": "Germany",
  "latitude": 49.75565, "longitude": 6.63935,
  "fetchedAt": "2026-07-17T12:00:00+02:00",
  "stale": false,               // true when fetched_at is older than 6 hours
  "forecast": { "current": {...}, "current_units": {...},
                "daily": {...}, "daily_units": {...} }
}
```

`POST /api/weather/reports/{id}/refresh` re-fetches from Open-Meteo, updates
`payload` + `fetched_at`, and returns `200 { "report": WeatherReport }`.
Unknown id → `404 { "error": "Weather report not found." }`; weather service
down → `502` (same shape as the `/api/weather` 502).
