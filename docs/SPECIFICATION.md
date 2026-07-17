# FlightMeet — Project Specification

This document defines the functional requirements for the FlightMeet platform.
It should generally be followed when building new features. Architecture and
coding conventions are defined in [`CLAUDE.md`](../CLAUDE.md); the auth model
is documented in [`AUTH.md`](AUTH.md).

## 1. Purpose

**FlightMeet** is a platform for pilots. Through FlightMeet, pilots can:

- find and create flying meets (Flugtreffen),
- arrange shared flying days with other pilots,
- exchange simple messages.

## 2. Architecture

- **Frontend**: an interactive **React** SPA (`frontend/`, React 19 + Vite +
  TypeScript) that holds the interactive state **client-side** (joined status,
  filters, form input, chat view, etc.). All UI is rendered by React.
- **Backend**: **PHP CodeIgniter 4** (`app/`) acting as a **JSON-only API**
  under `/api/*` for persistence and auth. CodeIgniter never renders HTML.
- UI text is written in **English** (the German requirement labels are
  translated: „Teilnehmen" → *Join*, „Absagen" → *Cancel/Leave*,
  „Zurück" → *Back*, „Senden" → *Send*).

## 3. Domain model

A **flying meet** (meet) has at least the following attributes:

| Attribute        | Notes                                                    |
| ---------------- | -------------------------------------------------------- |
| Title            | short display name                                        |
| Flying spot      | the launch/landing site (e.g. an airfield or slope)       |
| Region           | e.g. "Black Forest", "Bavarian Alps", "Mosel Valley"      |
| Date             |                                                           |
| Time             |                                                           |
| Description      | free text                                                 |
| Experience level | e.g. *Beginner*, *Intermediate*, *Advanced*, *All levels* |
| Max participants | positive integer                                          |
| Participants     | list of attending users; count derived from it            |
| Status           | e.g. *open* / *full* (full when participants = max)       |

## 4. Functional requirements

### F1 — Meet overview (list all meets)

An overview page shows **all flying meets**, each rendered as a **card** (or a
clear table row). Every card shows:

- title
- flying spot
- region
- date
- time
- experience level
- current number of participants
- maximum number of participants
- status

### F2 — Search and filters

The overview provides a **search input** and **at least two filters**.

- The search matches against: **title, flying spot, region, description**.
- The filters include at least: **region** and **experience level**.
- Search and filters combine (AND) and update the visible list immediately.

### F3 — Meet detail view

Clicking a meet reveals further information. The detail view shows:

- title
- flying spot
- region
- date and time
- description
- experience level
- participant list
- number of free spots
- a **"Join"** button
- a **"Back"** button (returns to the overview)

### F4 — Join / leave a meet

Users can join a meet or withdraw their participation.

After clicking **"Join"**:

- the participant count increases,
- the button changes to **"Cancel"** (leave),
- a success message is shown.

After clicking **"Cancel"**, the participation is removed again (count
decreases, button reverts to "Join").

**Constraint:** when a meet is full (participants = max), joining must not be
possible — the Join button is disabled and the meet is marked as full.

### F5 — Create a new meet

A form allows creating a new flying meet. The form contains at least:

- title
- flying spot
- region
- date
- time
- experience level
- maximum number of participants
- description

Required fields are validated before submission; after successful creation the
new meet appears in the overview.

### F6 — Group chat

A chat view enables simple message exchange between pilots. It contains:

- the list of existing messages,
- an input field for a new message,
- a **"Send"** button,
- the newly sent message appears in the list immediately after sending.

## 5. General expectations

- New pages are React routes in `frontend/src/` backed by JSON endpoints under
  `/api/...` (see the golden rule in `CLAUDE.md`).
- Interactive behaviour (joining, filtering, chat updates) must feel immediate:
  update client-side state right away rather than requiring a page reload.
- User-facing feedback (success/error messages) is shown for state-changing
  actions such as joining, leaving, creating a meet, and sending a message.
