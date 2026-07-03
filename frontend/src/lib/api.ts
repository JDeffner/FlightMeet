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

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET' && csrf) headers[csrf.header] = csrf.token

  const res = await fetch(path, {
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

  if (!res.ok) throw new ApiError(res.status, data)

  // Server kann einen (neuen) CSRF-Token mitliefern — z.B. nach Login,
  // weil Shield die Session dann neu erzeugt.
  if (data && typeof data === 'object' && 'csrf' in data) {
    setCsrf((data as { csrf?: CsrfInfo }).csrf)
  }

  return data as T
}
