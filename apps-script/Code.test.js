// @vitest-environment node
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Wszystkie pliki API w jednym zasięgu, jak w Apps Script. Usługi Google podawane
// jako parametry funkcji, więc każdy test dostaje własne atrapy.
const FILES = ['validation.js', 'registrations.js', 'tickets.js', 'register.js', 'Code.js']
const source = FILES.map((f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')).join('\n')
const GOOGLE = ['ContentService', 'PropertiesService', 'SpreadsheetApp', 'LockService', 'console']
const loadApi = (google) =>
  new Function(...GOOGLE, `${source}\nreturn { doPost, handleRequest, productionEnv };`)(
    ...GOOGLE.map((name) => google[name]),
  )

const TICKETS = [
  ['Lp', 'Imię i Nazwisko Podane w formularz', 'Ksywa', 'Nr Zamówienia', 'Typ Biletu'],
  [4, 'Jasmina K', 'ksywa 4', 3023567, 'Gość'],
]

const body = (data) => JSON.stringify({ website: '', ...data })
const jasmina = { orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K' }

function fakeGoogle({ props = { SHEET_ID: 'arkusz-obslugi', TICKETS_SHEET_ID: 'baza-biletow' }, tabName = 'Rejestracje' } = {}) {
  const rows = []
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getValues: () => rows.map((r) => r.slice(0, 4)) }),
    appendRow: (row) => rows.push(row),
  }
  const spreadsheets = {
    'arkusz-obslugi': { getSheetByName: (name) => (name === tabName ? sheet : null) },
    'baza-biletow': { getSheets: () => [{ getDataRange: () => ({ getValues: () => TICKETS }) }] },
  }
  return {
    rows,
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, setMimeType(mime) { this.mime = mime; return this } }),
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => props[key] ?? null }) },
    SpreadsheetApp: {
      openById: vi.fn((id) => {
        if (!spreadsheets[id]) throw new Error(`nie ma arkusza ${id}`)
        return spreadsheets[id]
      }),
      flush: vi.fn(),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: vi.fn() }) },
    console: { error: vi.fn() },
  }
}

describe('doPost', () => {
  let google
  beforeEach(() => {
    google = fakeGoogle()
  })

  it('poprawne żądanie: zapis wiersza i odpowiedź JSON z ID', () => {
    const { doPost } = loadApi(google)
    const out = doPost({ postData: { contents: body(jasmina) } })
    expect(out.mime).toBe('application/json')
    expect(JSON.parse(out.text)).toMatchObject({ ok: true, id: 1, nickname: 'ksywa 4', ticketType: 'Gość' })
    expect(google.rows).toHaveLength(1)
    expect(google.SpreadsheetApp.flush).toHaveBeenCalledOnce()
  })

  it('żądanie bez ciała: VALIDATION, bez dostępu do arkuszy', () => {
    const { doPost } = loadApi(google)
    expect(JSON.parse(doPost(undefined).text)).toEqual({ ok: false, error: 'VALIDATION' })
    expect(google.SpreadsheetApp.openById).not.toHaveBeenCalled()
  })

  it('błędne pole: VALIDATION ze wskazaniem pola', () => {
    const { doPost } = loadApi(google)
    const out = doPost({ postData: { contents: body({ ...jasmina, orderNumber: '12' }) } })
    expect(JSON.parse(out.text)).toEqual({ ok: false, error: 'VALIDATION', field: 'orderNumber' })
  })

  it('wypełnione pole-pułapka: VALIDATION i brak zapisu', () => {
    const { doPost } = loadApi(google)
    const out = doPost({ postData: { contents: body({ ...jasmina, website: 'x' }) } })
    expect(JSON.parse(out.text)).toEqual({ ok: false, error: 'VALIDATION' })
    expect(google.rows).toHaveLength(0)
  })

  it('brak Właściwości skryptu: SERVER i wpis w logach', () => {
    google = fakeGoogle({ props: {} })
    const { doPost } = loadApi(google)
    expect(JSON.parse(doPost({ postData: { contents: body(jasmina) } }).text)).toEqual({ ok: false, error: 'SERVER' })
    expect(google.console.error.mock.calls[0][0]).toContain('SHEET_ID')
  })

  it('brak karty „Rejestracje”: SERVER i nazwa karty w logach', () => {
    google = fakeGoogle({ tabName: 'Arkusz1' })
    const { doPost } = loadApi(google)
    expect(JSON.parse(doPost({ postData: { contents: body(jasmina) } }).text)).toEqual({ ok: false, error: 'SERVER' })
    expect(google.console.error.mock.calls[0][0]).toContain('Rejestracje')
  })

  it('zły identyfikator arkusza: SERVER', () => {
    google = fakeGoogle({ props: { SHEET_ID: 'arkusz-obslugi', TICKETS_SHEET_ID: 'nie-ma' } })
    const { doPost } = loadApi(google)
    expect(JSON.parse(doPost({ postData: { contents: body(jasmina) } }).text)).toEqual({ ok: false, error: 'SERVER' })
    expect(google.rows).toHaveLength(0)
  })
})

describe('handleRequest', () => {
  it('wyjątek w registerPerson: SERVER zamiast błędu Apps Script', () => {
    const google = fakeGoogle()
    const { handleRequest } = loadApi(google)
    const brokenEnv = () => ({ readTicketValues: () => { throw new Error('awaria') } })
    expect(handleRequest(body(jasmina), brokenEnv)).toEqual({ ok: false, error: 'SERVER' })
    expect(google.console.error).toHaveBeenCalledOnce()
  })

  it('duplikat przechodzi jako zwykła odpowiedź', () => {
    const google = fakeGoogle()
    const { handleRequest, productionEnv } = loadApi(google)
    handleRequest(body(jasmina), productionEnv)
    expect(handleRequest(body(jasmina), productionEnv)).toEqual({ ok: false, error: 'DUPLICATE' })
    expect(google.console.error).not.toHaveBeenCalled()
  })
})
