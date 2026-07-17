// Kleiner Fetch-Wrapper für das CodeIgniter-Backend.
// Hält den CSRF-Token im Speicher (kommt von /api/auth/me bzw. /api/auth/login)
// und hängt ihn an alle mutierenden Requests an.

export interface CsrfInfo {
  header: string
  token: string
}

let csrf: CsrfInfo | null = null

export function setCsrf(info: CsrfInfo | null | undefined) {
  if (info) csrf = info
}

// In Produktion liegt die SPA unter /public/ — API-Pfade müssen dieses Präfix
// tragen, sonst antwortet der Root-.htaccess mit einem Redirect, der aus dem
// POST ein GET macht (→ 404). Im Dev-Server ist BASE_URL einfach "/".
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

/** Vollständiger Request-Pfad für einen /api- oder /media-Pfad. */
export function apiUrl(path: string): string {
  return BASE + path
}

export class ApiError extends Error {
  status: number
  /** Feld-Validierungsfehler des Backends (422), z.B. { username: "..." } */
  fieldErrors: Record<string, string> | null

  constructor(status: number, body: unknown) {
    let message = `Request failed (${status})`
    let fieldErrors: Record<string, string> | null = null

    if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>
      if (typeof b.error === 'string') message = b.error
      if (b.errors && typeof b.errors === 'object') {
        fieldErrors = b.errors as Record<string, string>
        message = Object.values(fieldErrors).join(' ')
      }
    }

    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
}

export async function api<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrf) headers[csrf.header] = csrf.token

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'same-origin',
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // leere Antwort ist ok
  }

  if (!res.ok) {
    // 403 auf einem mutierenden Request heißt meist: CSRF-Token veraltet,
    // weil die Server-Session abgelaufen ist (in-memory Token überlebt sie).
    // Einmal frische Session + Token via /me holen und den Request wiederholen.
    if (res.status === 403 && method !== 'GET' && !retried) {
      const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'same-origin' })
      const meData = (await me.json().catch(() => null)) as { csrf?: CsrfInfo } | null
      if (meData?.csrf) {
        setCsrf(meData.csrf)
        return api<T>(path, options, true)
      }
    }
    throw new ApiError(res.status, data)
  }

  // Server kann einen (neuen) CSRF-Token mitliefern — z.B. nach Login,
  // weil Shield die Session dann neu erzeugt.
  if (data && typeof data === 'object' && 'csrf' in data) {
    setCsrf((data as { csrf?: CsrfInfo }).csrf)
  }

  return data as T
}
