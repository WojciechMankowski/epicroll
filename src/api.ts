// M4.1: wywołanie API rejestracji (SPEC.md „Kontrakt API”, TECH.md „Wywołanie API”).

export type FieldName = 'orderNumber' | 'firstName' | 'lastInitial'

export type RegisterRequest = {
  orderNumber: string
  firstName: string
  lastInitial: string
  website: string // pole-pułapka na boty, u człowieka zawsze puste
}

export type RegisterSuccess = {
  ok: true
  id: number
  nickname: string | null
  ticketType: string | null
  registeredAt: string // ISO 8601 w UTC
}

export type RegisterErrorCode = 'DUPLICATE' | 'VALIDATION' | 'BUSY' | 'SERVER'

export type RegisterError = {
  ok: false
  error: RegisterErrorCode
  field?: FieldName
}

export type RegisterResponse = RegisterSuccess | RegisterError

/** Przy 25 osobach naraz odpowiedź API trwała do 15 s (T7), więc limit ma zapas. */
export const REQUEST_TIMEOUT_MS = 30_000
/** Przerwy przed kolejnymi próbami przy BUSY i błędzie sieci. */
export const RETRY_DELAYS_MS = [1000, 2000]

const SERVER_ERROR: RegisterError = { ok: false, error: 'SERVER' }
const ERROR_CODES: readonly string[] = ['DUPLICATE', 'VALIDATION', 'BUSY', 'SERVER']
const FIELDS: readonly string[] = ['orderNumber', 'firstName', 'lastInitial']

export type ApiDeps = {
  url?: string
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  timeoutMs?: number
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const isStringOrNull = (value: unknown) => value === null || typeof value === 'string'

/** Sprawdza, czy odpowiedź ma kształt z kontraktu; inaczej traktuje ją jak błąd serwera. */
export function parseResponse(data: unknown): RegisterResponse {
  if (typeof data !== 'object' || data === null) return SERVER_ERROR
  const d = data as Record<string, unknown>
  if (d.ok === true) {
    if (typeof d.id !== 'number' || !isStringOrNull(d.nickname) || !isStringOrNull(d.ticketType)
      || typeof d.registeredAt !== 'string') {
      return SERVER_ERROR
    }
    return {
      ok: true,
      id: d.id,
      nickname: d.nickname as string | null,
      ticketType: d.ticketType as string | null,
      registeredAt: d.registeredAt,
    }
  }
  if (d.ok === false && typeof d.error === 'string' && ERROR_CODES.includes(d.error)) {
    const error: RegisterError = { ok: false, error: d.error as RegisterErrorCode }
    if (typeof d.field === 'string' && FIELDS.includes(d.field)) error.field = d.field as FieldName
    return error
  }
  return SERVER_ERROR
}

type Attempt = RegisterResponse | 'network' | 'timeout'

async function postOnce(request: RegisterRequest, url: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<Attempt> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    // Ciało jako tekst bez nagłówka Content-Type: text/plain nie wywołuje zapytania wstępnego CORS,
    // którego Apps Script nie obsługuje. fetch sam przechodzi przekierowanie na googleusercontent.com.
    const res = await fetchImpl(url, { method: 'POST', body: JSON.stringify(request), signal: controller.signal })
    let data: unknown
    try {
      data = await res.json()
    } catch {
      return SERVER_ERROR // strona błędu Google zamiast JSON
    }
    return parseResponse(data)
  } catch {
    return controller.signal.aborted ? 'timeout' : 'network'
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Wysyła rejestrację. BUSY i błąd sieci ponawia do 2 razy (po 1 s i 2 s).
 * Przekroczenia limitu czasu nie ponawia: serwer mógł już zapisać wiersz,
 * a ponowienie dałoby DUPLICATE. Brak sieci po ponowieniach i limit czasu dają SERVER.
 */
export async function registerAttendee(request: RegisterRequest, deps: ApiDeps = {}): Promise<RegisterResponse> {
  const url = deps.url ?? import.meta.env.VITE_API_URL
  const fetchImpl = deps.fetchImpl ?? fetch
  const sleep = deps.sleep ?? defaultSleep
  const timeoutMs = deps.timeoutMs ?? REQUEST_TIMEOUT_MS

  for (let attempt = 0; ; attempt++) {
    const result = await postOnce(request, url, fetchImpl, timeoutMs)
    if (result === 'timeout') return SERVER_ERROR
    const retryable = result === 'network' || (!result.ok && result.error === 'BUSY')
    if (!retryable) return result
    if (attempt >= RETRY_DELAYS_MS.length) return result === 'network' ? SERVER_ERROR : result
    await sleep(RETRY_DELAYS_MS[attempt])
  }
}
