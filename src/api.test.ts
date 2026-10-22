import { describe, expect, it, vi } from 'vitest'
import { parseResponse, registerAttendee, type RegisterRequest } from './api'

const request: RegisterRequest = { orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K', website: '' }
const success = { ok: true, id: 1, nickname: 'ksywa 4', ticketType: 'Gość', registeredAt: '2026-12-05T08:42:05.000Z' }
const URL = 'https://script.google.com/macros/s/test/exec'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })

/** fetch zwracający kolejno podane odpowiedzi; Error w tablicy to błąd sieci. */
function fakeFetch(...steps: Array<unknown>) {
  let call = 0
  return vi.fn(async () => {
    const step = steps[Math.min(call++, steps.length - 1)]
    if (step instanceof Error) throw step
    return jsonResponse(step)
  })
}

const noSleep = vi.fn(async () => {})

describe('registerAttendee', () => {
  it('sukces: jedno wywołanie POST z ciałem JSON jako tekstem, bez nagłówka Content-Type', async () => {
    const fetchImpl = fakeFetch(success)
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep: noSleep })).resolves.toEqual(success)
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [calledUrl, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(calledUrl).toBe(URL)
    expect(init.method).toBe('POST')
    expect(init.headers).toBeUndefined()
    expect(JSON.parse(init.body as string)).toEqual(request)
  })

  it('dwa razy BUSY, potem sukces: trzy wywołania, przerwy 1 s i 2 s', async () => {
    const sleep = vi.fn(async () => {})
    const fetchImpl = fakeFetch({ ok: false, error: 'BUSY' }, { ok: false, error: 'BUSY' }, success)
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep })).resolves.toEqual(success)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[1000], [2000]])
  })

  it('trzy razy BUSY: wynik BUSY po trzech wywołaniach', async () => {
    const fetchImpl = fakeFetch({ ok: false, error: 'BUSY' })
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep: noSleep })).resolves.toEqual({ ok: false, error: 'BUSY' })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('błąd sieci, potem sukces', async () => {
    const fetchImpl = fakeFetch(new TypeError('Failed to fetch'), success)
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep: noSleep })).resolves.toEqual(success)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('trzy błędy sieci z rzędu: SERVER', async () => {
    const fetchImpl = fakeFetch(new TypeError('Failed to fetch'))
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep: noSleep })).resolves.toEqual({ ok: false, error: 'SERVER' })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it.each([
    [{ ok: false, error: 'DUPLICATE' }],
    [{ ok: false, error: 'VALIDATION', field: 'firstName' }],
    [{ ok: false, error: 'SERVER' }],
  ])('%j: bez ponawiania', async (body) => {
    const fetchImpl = fakeFetch(body)
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep: noSleep })).resolves.toEqual(body)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('przekroczony limit czasu: SERVER bez ponawiania (serwer mógł już zapisać wiersz)', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const result = await registerAttendee(request, { url: URL, fetchImpl: fetchImpl as typeof fetch, sleep: noSleep, timeoutMs: 20 })
    expect(result).toEqual({ ok: false, error: 'SERVER' })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('odpowiedź, która nie jest JSON-em (strona błędu Google): SERVER', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>Błąd</html>'))
    await expect(registerAttendee(request, { url: URL, fetchImpl, sleep: noSleep })).resolves.toEqual({ ok: false, error: 'SERVER' })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})

describe('parseResponse', () => {
  it('przepuszcza sukces z null w ksywie i typie (osoba spoza listy)', () => {
    const body = { ...success, nickname: null, ticketType: null }
    expect(parseResponse(body)).toEqual(body)
  })

  it('pomija nieznane pole w błędzie VALIDATION', () => {
    expect(parseResponse({ ok: false, error: 'VALIDATION', field: 'email' })).toEqual({ ok: false, error: 'VALIDATION' })
  })

  it.each([
    ['null', null],
    ['tekst', 'ok'],
    ['sukces bez id', { ...success, id: undefined }],
    ['id jako tekst', { ...success, id: '1' }],
    ['nieznany kod błędu', { ok: false, error: 'TEAPOT' }],
    ['brak pola ok', { id: 1 }],
  ])('niepoprawny kształt (%s): SERVER', (_name, body) => {
    expect(parseResponse(body)).toEqual({ ok: false, error: 'SERVER' })
  })
})
