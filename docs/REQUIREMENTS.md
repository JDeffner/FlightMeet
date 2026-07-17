# FlightMeet — Requirements Analysis

Requirements analysis for the **FlightMeet** React prototype (exercise sheet 3,
*React and CodeIgniter 4*). It describes **what users can do** with the platform
rather than concrete UI elements. Architecture and coding conventions live in
[`CLAUDE.md`](../CLAUDE.md); the feature spec in
[`SPECIFICATION.md`](SPECIFICATION.md); the auth model in [`AUTH.md`](AUTH.md).

Scope note: exercise tasks *Aufgabe 1* (Vite project setup) and *Aufgabe 2*
(landing page) are out of scope for this analysis. It covers the interactive
application (navigation, meets, chat), plus two extensions we designed into the
same product: an integrated **weather** feature and **admin user management**.

---

## 1. Purpose and vision

FlightMeet is a community platform for paraglider pilots. It lets pilots
discover and organise **flying meets** (Flugtreffen), commit to shared flying
days, and talk to each other. Because a flight only happens in the right
weather, checking conditions is treated as a first-class part of deciding
whether to attend a meet — not a separate tool.

The product succeeds when a pilot can, in one sitting: find a relevant meet,
judge whether the weather will allow it to fly, join it, and coordinate with the
other participants.

---

## 2. Actors

| Actor | Description | How they authenticate |
|-------|-------------|------------------------|
| **Visitor** | Anyone browsing without logging in. | none |
| **Pilot** (registered user) | A logged-in member; the primary actor. | Shield session (email or username) |
| **Moderator** | A pilot with read access to the user directory. | Shield session, group `moderator` |
| **Administrator** | Operates the platform; manages user accounts. | Shield session, group `admin` |

Every Administrator and Moderator is also a Pilot and can do everything a Pilot
can. Rights are additive, never exclusive.

---

## 3. System context

FlightMeet is a decoupled two-tier app: a **React SPA** holding interactive
state client-side, talking to a **CodeIgniter 4 JSON API** over `/api/*`. The
API is the single authority for persistence, authentication, and authorisation;
the SPA never trusts its own state for access decisions. External weather data
comes from **Open-Meteo**, reached only through the backend (the browser never
calls the third party directly). This boundary is a requirement, not an
implementation detail — see [NFR-6](#nfr-6-clear-boundaries).

---

## 4. Domain model

### 4.1 Flying meet

| Attribute | Notes |
|-----------|-------|
| Title | short display name |
| Flying spot | launch/landing site (airfield or slope) |
| Region | e.g. "Black Forest", "Bavarian Alps", "Mosel Valley" |
| Date / Time | when the meet takes place |
| Description | free text |
| Experience level | *Beginner*, *Intermediate*, *Advanced*, *All levels* |
| Max participants | positive integer |
| Participants | list of attending pilots; count is derived from it |
| Status | *open* / *full* (full when participants = max) |
| Coordinates | latitude/longitude of the flying spot, used to fetch weather |

The **status** and **participant count** are derived values, never stored
independently, so they cannot drift out of sync with the participant list
([NFR-4](#nfr-4-single-source-of-truth)).

### 4.2 User (pilot)

Identity and profile fields (username, email, first/last name, street, postcode,
city) attached to Shield's `users` table. Group membership (`admin` /
`moderator` / `user`) determines rights.

### 4.3 Chat message

An author (pilot), a body of text, and a timestamp. Messages are ordered oldest
to newest.

### 4.4 Weather report

Fetched on demand for a coordinate: current conditions and a multi-day daily
forecast. Not persisted — it is live data attached to a location, never owned by
FlightMeet.

---

## 5. Functional requirements

Grouped by capability. Each requirement states what an actor can accomplish.
IDs are stable references for traceability (§8).

### 5.1 Navigation and orientation

- **FR-1** — A visitor can move between Home, Flugtreffen (meets), Gruppen
  (groups), and Chat without a full page reload; the app is a single-page
  application and navigation is instant (React Router).
- **FR-2** — The current section is discoverable from the URL, so any view can
  be linked to or reloaded directly.

### 5.2 Discovering meets

- **FR-3** — A pilot can view an overview of **all** flying meets, each showing
  title, flying spot, region, date, time, experience level, current participant
  count, maximum participants, and status.
- **FR-4** — A pilot can **search** meets by free text; the search matches
  against title, flying spot, region, and description.
- **FR-5** — A pilot can **filter** meets by at least **region** and
  **experience level**.
- **FR-6** — Search and filters **combine (AND)** and the visible list updates
  immediately as criteria change, without reloading.

### 5.3 Inspecting a meet

- **FR-7** — A pilot can open a meet's **detail view** and see its title, flying
  spot, region, date and time, description, experience level, the participant
  list, and the number of free spots.
- **FR-8** — From the detail view a pilot can return to the overview without
  losing the overview's search/filter state.

### 5.4 Weather-informed decision (integrated Open-Meteo feature)

The weather proxy already built (`GET /api/weather`, Open-Meteo) is woven into
the meet flow rather than left standalone, so a pilot judges conditions in the
context of an actual meet.

- **FR-9** — When viewing a meet, a pilot can see the **weather forecast for
  that meet's flying spot**, so they can judge whether it will be flyable.
- **FR-10** — The forecast presents current conditions and a multi-day daily
  outlook (temperature, precipitation probability, wind, weather condition),
  with the day of the meet highlighted where the meet date falls within the
  forecast horizon.
- **FR-11** — A pilot can also open a **standalone weather view** and look up
  conditions for any city (the existing `?city=` lookup), for general planning.
- **FR-12** — If the weather service is unavailable or a location cannot be
  resolved, the pilot sees a clear, non-blocking message; the rest of the meet
  view still works. Weather is decision-support, never a hard dependency of
  joining.

### 5.5 Participating in a meet

- **FR-13** — A pilot can **join** a meet. On joining, the participant count
  increases, they appear in the participant list, the action offered becomes
  **Cancel** (leave), and a success message confirms it.
- **FR-14** — A pilot can **cancel** their participation. The count decreases,
  they leave the participant list, and the action reverts to **Join**.
- **FR-15** — When a meet is **full** (participants = max), joining is not
  possible and the meet is marked full. A pilot already attending can still
  cancel.
- **FR-16** — Participation changes are reflected immediately in both the detail
  view and the overview (counts and status stay consistent everywhere).

### 5.6 Creating a meet

- **FR-17** — A pilot can create a new flying meet by providing at least: title,
  flying spot, region, date, time, experience level, maximum participants, and
  description.
- **FR-18** — Required fields are validated **before submission**; the pilot
  gets specific feedback on what is missing or invalid, and an invalid form is
  never submitted.
- **FR-19** — After successful creation the new meet appears in the overview
  immediately and is searchable and filterable like any other.

### 5.7 Group chat

- **FR-20** — A pilot can read the list of existing chat messages, ordered
  oldest to newest.
- **FR-21** — A pilot can send a new message; it appears in the list
  immediately after sending, without a reload.

### 5.8 Authentication

- **FR-22** — A user can log in with **email or username** and a password, and
  log out.
- **FR-23** — Actions that require an identity (joining, creating a meet,
  posting to chat, anything under admin) are available only to authenticated
  users; the backend enforces this regardless of client state.
- **FR-24** — Mutating requests carry a CSRF token; the SPA obtains and sends it
  automatically so the protection is invisible to the user.

### 5.9 Administration — user management (CRUD)

Administrators manage the pilot directory. All rights are enforced backend-side
by the `adminapi` filter plus a per-action permission check; the frontend gate
is UX only.

- **FR-25** — An administrator can view a **paginated, searchable, filterable,
  sortable** list of users. Search spans username, first/last name, city,
  postcode, and email; filters include group and active/inactive; results page
  (max 100 per page) and sort by column.
- **FR-26** — An administrator can view a **single user's** full detail.
- **FR-27** — An administrator can **create** a user (credentials, profile
  fields, group).
- **FR-28** — An administrator can **edit** a user's profile, group membership,
  and active state.
- **FR-29** — An administrator can **delete** a user (soft delete).
- **FR-30** — A moderator can **view** the user list and detail but cannot
  create, edit, or delete.
- **FR-31** — **Admin self-protection:** an administrator cannot delete,
  deactivate, or remove their own account from the admin group, so the platform
  can never be locked out of administration.

---

## 6. Non-functional requirements

### 6.1 Interactivity

- **NFR-1** — State-changing actions (join, leave, create, send, filter) update
  client-side state immediately; the UI never requires a manual reload to show
  the result of a user's own action.
- **NFR-2** — Every state-changing action produces user-facing feedback on both
  success and failure.

### 6.2 Security and correctness

- **NFR-3** — Authorisation is decided by the backend on every protected
  request. The SPA's role checks only tailor the UI and are never trusted for
  access.

### 6.3 Clean-code principles (engineering constraints)

These bind the implementation, so the requirements above stay cheap to change.

- <a id="nfr-4-single-source-of-truth"></a>**NFR-4 — Single source of truth.**
  Derived data (participant count, full/open status, free spots) is computed
  from the participant list, never stored and updated in parallel. No value that
  can be derived is also persisted.
- **NFR-5 — Meaningful names and small units.** Functions and components do one
  thing and are named for what they do. A function that has grown to juggle
  several concerns is split. No dead code, no commented-out blocks, no
  speculative abstractions for single-use logic.
- <a id="nfr-6-clear-boundaries"></a>**NFR-6 — Clear boundaries.** All frontend
  network access goes through one API module (`src/lib/api.ts`); all third-party
  data (Open-Meteo) is reached only through the backend. The browser never calls
  external services directly, and controllers return JSON only — never rendered
  HTML.
- **NFR-7 — DRY within reason.** Shared behaviour (fetching, error handling,
  auth-guarded routes, table paging) is factored once and reused; duplication
  that would drift out of sync is removed. Duplication is not eliminated at the
  cost of coupling unrelated code.
- **NFR-8 — Honest error handling.** External calls (weather, DB) handle the
  failures that can actually happen and surface a clear message. No error
  handling is written for impossible states; failures are never swallowed
  silently.
- **NFR-9 — Consistent style.** New code matches the conventions, naming, and
  structure of the surrounding code (English UI text, TypeScript on the
  frontend, PSR-style PHP on the backend). Reviewable in small, coherent units.

---

## 7. Assumptions and out of scope

- **A-1** — Meet data is persisted via the CodeIgniter API and its database;
  meets survive a reload and are shared across users (not client-only mock
  data).
- **A-2** — The "Gruppen" (groups) menu item exists for navigation; group
  management beyond the chat is not specified by the exercise and is out of
  scope here.
- **A-3** — Chat is a single shared group channel (per the exercise's "simple
  group chat"); per-meet or per-user private channels are out of scope.
- **A-4** — Registration/self-service signup is out of scope; accounts are
  seeded or created by an administrator (FR-27).
- **A-5** — Weather covers the forecast horizon Open-Meteo returns; meets dated
  beyond that horizon show general/current conditions with a note rather than a
  day-specific forecast.

---

## 8. Traceability

Exercise sheet 3 tasks → requirements (Aufgabe 1 and 2 excluded by scope).

| Exercise task | Requirements |
|---------------|--------------|
| Aufgabe 3 — Navigation | FR-1, FR-2 |
| Aufgabe 4 — Show meets | FR-3 |
| Aufgabe 4 — Search & filter | FR-4, FR-5, FR-6 |
| Aufgabe 5 — Meet detail | FR-7, FR-8 |
| Aufgabe 6 — Join / cancel | FR-13, FR-14, FR-15, FR-16 |
| Aufgabe 7 — Create meet | FR-17, FR-18, FR-19 |
| Aufgabe 9 — Group chat | FR-20, FR-21 |
| Extension — Weather (Open-Meteo) | FR-9, FR-10, FR-11, FR-12 |
| Extension — Auth | FR-22, FR-23, FR-24 |
| Extension — Admin user CRUD | FR-25 … FR-31 |
