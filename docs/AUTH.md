# Authentifizierung & Benutzerverwaltung

Session-basierte Auth mit **CodeIgniter Shield**, dazu ein React-SPA-Admin-Dashboard
mit **TanStack Table** für Liste, Filter und CRUD.

## Rollen & Rechte

Konfiguriert in [`app/Config/AuthGroups.php`](../app/Config/AuthGroups.php):

| Gruppe      | Rechte                                             | Darf ...                                  |
|-------------|----------------------------------------------------|-------------------------------------------|
| `admin`     | `admin.*`, `users.*`                               | Dashboard sehen, Nutzer anlegen/ändern/löschen |
| `moderator` | `users.view`                                       | (Basis — aktuell kein Dashboard-Zugang)   |
| `user`      | –                                                  | nur einloggen                             |

Das Admin-Dashboard verlangt `admin.access`. Die Prüfung passiert **zweifach**:

1. **Backend** (autoritativ): Filter [`AdminApiFilter`](../app/Filters/AdminApiFilter.php)
   vor allen `/api/admin/*`-Routen; jede Aktion prüft zusätzlich ihr konkretes Recht
   (`users.view` / `users.create` / `users.edit` / `users.delete`).
2. **Frontend** (nur UX): [`RequireAdmin`](../frontend/src/components/RequireAdmin.tsx)
   blendet die Route aus / leitet zum Login.

## Seed-Daten

Die 9999 Personen aus `fwe.sql` werden als reguläre `user` importiert
([`PersonenSeeder`](../app/Database/Seeds/PersonenSeeder.php)). Zusätzlich zwei
Testkonten:

| Login (E-Mail)            | Benutzername | Passwort         | Gruppe    |
|---------------------------|--------------|------------------|-----------|
| `admin@team11.local`      | `admin`      | `Admin123!`      | admin     |
| `moderator@team11.local`  | `moderator`  | `Moderator123!`  | moderator |

Alle importierten Personen: Passwort **`password123`**, E-Mail
`<benutzername-transliteriert>@example.com` (z.B. `HerbertBürgers` →
`herbertburgers@example.com`). Login geht mit **E-Mail oder Benutzername**.

> Profilfelder (Vorname, Nachname, Straße, PLZ, Ort) hängen an Shields `users`-Tabelle
> (Migration `AddProfileFieldsToUsers`). Die Original-`personen`-Tabelle bleibt unangetastet.

## API

| Methode | Pfad                      | Recht          | Zweck                                   |
|---------|---------------------------|----------------|-----------------------------------------|
| GET     | `/api/auth/me`            | –              | Session-Status + CSRF-Token             |
| POST    | `/api/auth/login`         | –              | `{ login, password, remember }`         |
| POST    | `/api/auth/logout`        | –              | Abmelden                                |
| GET     | `/api/admin/users`        | `users.view`   | Liste (Paging/Suche/Filter/Sortierung)  |
| POST    | `/api/admin/users`        | `users.create` | Anlegen                                 |
| GET     | `/api/admin/users/{id}`   | `users.view`   | Einzelner Nutzer                        |
| PUT     | `/api/admin/users/{id}`   | `users.edit`   | Ändern                                  |
| DELETE  | `/api/admin/users/{id}`   | `users.delete` | Löschen (Soft-Delete)                   |

Query-Parameter der Liste: `page`, `perPage` (max 100), `search`, `group`, `active`
(`1`/`0`), `sort`, `dir`. Suche geht über Benutzername, Vor-/Nachname, Ort, PLZ, E-Mail.

**CSRF:** global aktiv (Session-Modus). Mutierende Requests brauchen den Header
`X-CSRF-TOKEN`; das SPA holt den Token aus `/api/auth/me` bzw. der Login-Antwort und
schickt ihn automatisch mit ([`frontend/src/lib/api.ts`](../frontend/src/lib/api.ts)).

Selbstschutz für Admins: das eigene Konto kann nicht gelöscht, deaktiviert oder aus
der Admin-Gruppe entfernt werden.

## Lokal starten

```bash
# 1) Backend (CodeIgniter) – Port 8082, weil 8080 hier belegt ist
php spark serve --host localhost --port 8082

# 2) Frontend (Vite Dev-Server, proxyt /api → 8082)
cd frontend && pnpm install && pnpm dev
```

Dann http://localhost:5173/ öffnen und mit `admin@team11.local` / `Admin123!`
anmelden → `/admin/dashboard`.

Der Backend-Proxy-Port ist in [`frontend/.env.local`](../frontend/.env.local)
(`VITE_API_TARGET`) überschreibbar.

### Produktions-Build

`cd frontend && pnpm build` schreibt das SPA nach `public/` (Base `/public/`, passend
zur Uni-Server-URL). Das SPA-Routing macht `public/.htaccess`: `api|media` → CodeIgniter,
vorhandene Dateien direkt, **alle übrigen Pfade → `index.html`** (React Router). CodeIgniter
bleibt reine JSON-API — es rendert keine HTML-Seiten.

## Voraussetzungen / Setup-Schritte, die schon erledigt sind

1. `.env` mit DB `db_team11` (root, kein Passwort) angelegt.
2. `fwe.sql` in `db_team11` importiert (Tabellen `personen`, `umsaetze`).
3. `composer require codeigniter4/shield` + `php spark shield:setup`.
4. `php spark migrate` (Shield-Tabellen + Profilfelder).
5. `php spark db:seed PersonenSeeder`.
