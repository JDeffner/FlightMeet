# Project architecture (read this first)

This is a **decoupled two-tier app**: a **React SPA frontend** talking to a
**CodeIgniter 4 (PHP) JSON API backend**. They live in one repo but are
separate applications. Feature requirements for the FlightMeet platform are
specified in [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) — follow them
when building features.

```
┌─────────────────────────┐        HTTP / JSON        ┌──────────────────────────┐
│  React SPA (frontend/)   │  ───────────────────────► │  CodeIgniter 4 (app/)     │
│  React 19 + Vite + TS    │   /api/*  (fetch, cookies)│  PHP 8.2, JSON-API-only   │
│  react-router-dom, TSX   │  ◄─────────────────────── │  Shield auth, MariaDB     │
└─────────────────────────┘                            └──────────────────────────┘
        built into  public/  ◄── same origin in prod ──►  served by Apache/CI
```

## The golden rule

- **All UI is React.** New pages = a route in `frontend/src/` + a JSON endpoint
  under `/api/...`. **Never** render HTML from PHP (`view()`), and never add
  server-rendered pages. CodeIgniter returns JSON only.
- The one CI HTML view (`welcome_message`) is a leftover fallback; don't build on it.

## Backend — `app/` (CodeIgniter 4.7, PHP 8.2)

- **Controllers** (`app/Controllers/`): return JSON via `$this->response->setJSON(...)`.
  - `Api.php` (ping/echo), `Weather.php` (Open-Meteo proxy)
  - `Api/AuthController.php` — session login/logout/me/register
  - `Api/MeetsController.php`, `Api/GroupsController.php`, `Api/ChatController.php`
    — FlightMeet domain (contract: [`docs/API_FLIGHTMEET.md`](docs/API_FLIGHTMEET.md));
    Open-Meteo geocoding/forecast shared via `app/Libraries/OpenMeteo.php`
  - `Api/Admin/UsersController.php` — admin user CRUD (paging/search/filter/sort)
- **Routes**: `app/Config/Routes.php` — everything is under the `api` group.
- **Auth**: CodeIgniter **Shield** (session-based). Groups `admin` / `moderator` /
  `user` in `app/Config/AuthGroups.php`; the `adminapi` filter
  (`app/Filters/AdminApiFilter.php`) guards `/api/admin/*`. CSRF is global
  (session mode); mutating requests need the `X-CSRF-TOKEN` header. See
  [`docs/AUTH.md`](docs/AUTH.md) for the full auth/permissions model.
- **DB**: MariaDB `db_team11` (XAMPP; credentials in `.env`). Domain tables
  `meets` / `meet_participants` / `flight_groups` / `group_members` / `messages`
  (chat: `group_id` NULL = global channel) plus legacy `personen` / `umsaetze`;
  Shield tables `users` / `auth_*`. Migrations in `app/Database/Migrations/`,
  seeders in `app/Database/Seeds/` (`FlightMeetSeeder` = sample pilots/meets/
  groups/chat). Participant counts and meet status are always derived, never
  stored.
- Config that isn't committed lives in `.env` (copy from `env`).

## Frontend — `frontend/` (React 19 + Vite + TypeScript)

- **Routing**: `react-router-dom` v7 in `src/App.tsx`. Pages in `src/pages/`
  (`home/` = FlightMeet landing with its own layout; everything else renders
  inside the shared `AppChrome` = `SiteHeader` + `AppFooter`: `meets/`,
  `groups/`, `ChatPage` (3s polling), `RegisterPage`, `WeatherPage`,
  `LoginPage`, `ProfilePage`, `AdminDashboardPage`).
- **API access**: always through `src/lib/api.ts` (handles the CSRF token and
  same-origin cookies). Auth state via `src/lib/auth.tsx` (`useAuth`).
- **UI**: Tailwind 4 + shadcn components on **Base UI** (`src/components/ui/`,
  note: Base UI, not Radix — props differ), Phosphor icons, TanStack Table for
  data grids, GSAP for landing animations.

## How it's served (important)

- **Build**: `pnpm build` in `frontend/` compiles the SPA into `public/`
  (`outDir: '../public'`, `base: '/public/'` — prod lives at
  `https://team11.wi1cm.uni-trier.de/public/`). Built assets are committed.
- **Routing at the edge**: `public/.htaccess` sends `api/*` and `media/*` to
  CodeIgniter's `index.php`; real files are served directly; **every other path
  falls through to `index.html`** (the SPA). React Router takes it from there.
- **A frontend source change only appears in the served app after `pnpm build`.**

## Dev workflow

```bash
# Backend (CodeIgniter API)
php spark serve --host localhost --port 8080

# Frontend (Vite dev server + HMR; proxies /api and /media to the backend)
cd frontend && pnpm install && pnpm dev     # http://localhost:5173

# Backend tests (feature tests for the JSON API live in tests/api/,
# in-memory SQLite — no MariaDB needed; base class tests/_support/ApiTestCase.php)
composer test
```

- The Vite proxy target is `CI_BACKEND_URL` (default `http://localhost:8080`),
  overridable in `frontend/.env.local` if that port is taken.
- In dev you use the Vite server (HMR); the `public/` build is only for prod.

## Gotchas

- Base UI dialogs wait for the exit animation to finish before unmounting; they
  can appear "stuck" in a backgrounded/headless browser tab (animations paused).
  Not a bug in foreground browsers.
- Shield's `validFields` must include `username` for username (not just email)
  login — already enabled in `app/Config/Auth.php`.
