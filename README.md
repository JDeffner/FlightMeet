<div align="center">

<img src="frontend/public/android-chrome-192x192.png" alt="FlightMeet logo" width="96" height="96">

# FlightMeet

**A community platform for paraglider pilots: find flying meets, team up in groups, chat, and check launch-site weather.**

[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](frontend)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](frontend)
[![CodeIgniter 4](https://img.shields.io/badge/CodeIgniter-4.7-ee4623?logo=codeigniter&logoColor=white)](app)
[![PHP 8.2](https://img.shields.io/badge/PHP-8.2-777bb4?logo=php&logoColor=white)](composer.json)

[Features](#features) • [Architecture](#architecture) • [Getting started](#getting-started) • [Documentation](#documentation)

</div>

## Overview

FlightMeet helps pilots organize shared flying days. Browse upcoming **flying meets** by region and experience level, join with one click, coordinate in **flight groups** and **chat**, and check the **weather forecast** for any launch site before you commit, all in one place.

The app is a decoupled two-tier application living in a single repository:

- **`frontend/`**: a React 19 single-page application (Vite + TypeScript) that renders all UI.
- **`app/`**: a CodeIgniter 4 backend that serves a JSON-only API under `/api/*` (no server-rendered HTML).

## Features

- **Meet discovery**: all flying meets as cards with title, flying spot, region, date and time, experience level, participant count, and open/full status. Instant search (title, spot, region, description) combined with region and experience-level filters.
- **Join / leave**: one-click participation with immediate UI feedback; full meets are locked automatically. Participant counts and meet status are always derived, never stored.
- **Meet management**: create and edit meets with validation, pick the flying spot on an interactive map.
- **Flight groups**: regional and interest-based groups pilots can join, each with its own chat channel.
- **Chat**: a global pilot channel plus per-group channels, available as a full page or a popover launcher on every page.
- **Weather**: Open-Meteo powered forecasts with geocoding search, wind visualization, and pilot-submitted weather reports on a map (Leaflet with marker clustering).
- **Accounts & profiles**: registration and session login via CodeIgniter Shield, public pilot profiles, and a role model with `user`, `moderator`, and `admin` groups.
- **Admin dashboard**: user management with server-side paging, search, filtering, and sorting (TanStack Table).
- **Landing page**: an animated FlightMeet showcase built with GSAP scroll animations.

## Architecture

```
┌─────────────────────────┐        HTTP / JSON        ┌──────────────────────────┐
│  React SPA (frontend/)  │  ───────────────────────► │  CodeIgniter 4 (app/)    │
│  React 19 + Vite + TS   │   /api/*  (fetch, cookies)│  PHP 8.2, JSON-API-only  │
│  react-router-dom, TSX  │  ◄─────────────────────── │  Shield auth, MariaDB    │
└─────────────────────────┘                           └──────────────────────────┘
         built into  public/  ◄── same origin in prod ──►  served by Apache/CI
```

**Frontend:** React 19, TypeScript, Vite, react-router-dom v7, Tailwind CSS 4, shadcn components on Base UI, Phosphor icons, TanStack Table, GSAP, Leaflet.

**Backend:** CodeIgniter 4.7 on PHP 8.2, CodeIgniter Shield for session-based auth with CSRF protection, MariaDB, Open-Meteo as the weather and geocoding provider.

In production the SPA is compiled into `public/` and served from the same origin as the API: `public/.htaccess` routes `api/*` to CodeIgniter and every other path to the SPA's `index.html`, where React Router takes over.

## Getting started

### Prerequisites

- [PHP](https://www.php.net) 8.2+ with the `intl` and `mysqlnd` extensions
- [Composer](https://getcomposer.org)
- [Node.js](https://nodejs.org) 20+ and [pnpm](https://pnpm.io)
- A MariaDB/MySQL server (e.g. via [XAMPP](https://www.apachefriends.org))

### Setup

1. **Install dependencies**

   ```bash
   composer install
   cd frontend && pnpm install && cd ..
   ```

2. **Configure the environment**

   Copy `env` to `.env` and set your database credentials (`database.default.*`). The default database name is `db_team11`.

3. **Create the schema and sample data**

   ```bash
   php spark migrate --all
   php spark db:seed FlightMeetSeeder
   ```

   The seeder creates sample pilots, meets, groups, and chat messages.

### Run in development

Start the API and the frontend dev server in two terminals:

```bash
# Terminal 1: CodeIgniter API on http://localhost:8080
php spark serve --host localhost --port 8080

# Terminal 2: Vite dev server with HMR on http://localhost:5173
cd frontend && pnpm dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/media` to the backend; override the target with `CI_BACKEND_URL` in `frontend/.env.local` if port 8080 is taken.

### Build for production

```bash
cd frontend && pnpm build
```

This compiles the SPA into `public/`, ready to be served by Apache alongside the CodeIgniter API.

> [!IMPORTANT]
> A frontend source change only appears in the served app after `pnpm build`. In development, use the Vite server instead; the `public/` build is for production only.

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) | Functional requirements for the FlightMeet platform |
| [`docs/API_FLIGHTMEET.md`](docs/API_FLIGHTMEET.md) | JSON API contract for meets, groups, and chat |
| [`docs/AUTH.md`](docs/AUTH.md) | Auth and permissions model (Shield, roles, CSRF) |
| [`CLAUDE.md`](CLAUDE.md) | Architecture overview and coding conventions |
