// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

// register.js korzysta z funkcji z registrations.js i tickets.js (wspólny zasięg Apps Script).
const load = (name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
const { nextLp, buildRow, registerPerson } = new Function(
  `${load('registrations.js')}\n${load('tickets.js')}\n${load('register.js')}\nreturn { nextLp, buildRow, registerPerson };`,
)()

const NOW = new Date('2026-12-05T09:42:05Z')

const tickets = [
  ['Lp', 'Imię i Nazwisko Podane w formularz', 'Ksywa', 'Nr Zamówienia', 'Typ Biletu'],
  [4, 'Jasmina K', 'ksywa 4', 3023567, 'Gość'],
  [8, 'Katarzyna J', 'ksywa 8', 3023567, 'Program'],
  [11, 'Ola P', '', 3099999, 'Norm'],
]

/** Atrapa karty „Rejestracje”: wiersze A–I bez nagłówka; appendRow dopisuje do tablicy. */
function fakeSheet(rows = []) {
  return {
    rows,
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getValues: () => rows.map((r) => r.slice(0, 4)) }),
    appendRow: vi.fn((row) => rows.push(row)),
  }
}

function fakeEnv({ rows, lockFree = true } = {}) {
  return {
    lock: { tryLock: vi.fn(() => lockFree), releaseLock: vi.fn() },
    sheet: fakeSheet(rows),
    readTicketValues: () => tickets,
    now: () => NOW,
    flush: vi.fn(),
  }
}

const jasmina = { orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K' }

describe('nextLp', () => {
  it('pusta karta: 1', () => {
    expect(nextLp([])).toBe(1)
  })

  it('największe Lp + 1, także przy lukach po usuniętych wierszach', () => {
    expect(nextLp([[1], [2], [5]])).toBe(6)
  })

  it('pomija puste i nieliczbowe komórki', () => {
    expect(nextLp([[''], ['abc'], [3], [null]])).toBe(4)
  })
})

describe('buildRow', () => {
  it('układa kolumny A–I karty „Rejestracje”', () => {
    expect(buildRow({
      lp: 7, firstName: 'Anna', lastInitial: 'K', nickname: 'ksywa', orderNumber: '3078012', ticketType: 'VIP', now: NOW,
    })).toEqual([7, 'Anna K.', 'ksywa', '3078012', 'VIP', '', 'Na terenie', NOW, ''])
  })
})

describe('registerPerson', () => {
  it('pierwsza rejestracja: Lp 1, ksywa i typ z listy, Na terenie, data wejścia (T1)', () => {
    const env = fakeEnv()
    expect(registerPerson(jasmina, env)).toEqual({
      ok: true, id: 1, nickname: 'ksywa 4', ticketType: 'Gość', registeredAt: '2026-12-05T09:42:05.000Z',
    })
    expect(env.sheet.rows).toEqual([[1, 'Jasmina K.', 'ksywa 4', '3023567', 'Gość', '', 'Na terenie', NOW, '']])
    expect(env.flush).toHaveBeenCalledOnce()
    expect(env.lock.tryLock).toHaveBeenCalledWith(10000)
    expect(env.lock.releaseLock).toHaveBeenCalledOnce()
  })

  it('druga osoba z tego samego zamówienia dostaje kolejne Lp (T11)', () => {
    const env = fakeEnv()
    registerPerson(jasmina, env)
    const result = registerPerson({ orderNumber: '3023567', firstName: 'Katarzyna', lastInitial: 'J' }, env)
    expect(result).toMatchObject({ ok: true, id: 2, nickname: 'ksywa 8', ticketType: 'Program' })
    expect(env.sheet.rows).toHaveLength(2)
  })

  it('ta sama osoba drugi raz: DUPLICATE, bez nowego wiersza (T3)', () => {
    const env = fakeEnv()
    registerPerson(jasmina, env)
    expect(registerPerson(jasmina, env)).toEqual({ ok: false, error: 'DUPLICATE' })
    expect(env.sheet.rows).toHaveLength(1)
    expect(env.lock.releaseLock).toHaveBeenCalledTimes(2)
  })

  it('osoba spoza listy: rejestracja przechodzi, „brak na liście” w arkuszu, null w odpowiedzi (T9)', () => {
    const env = fakeEnv()
    const result = registerPerson({ orderNumber: '7777777', firstName: 'Anna', lastInitial: 'K' }, env)
    expect(result).toEqual({ ok: true, id: 1, nickname: null, ticketType: null, registeredAt: '2026-12-05T09:42:05.000Z' })
    expect(env.sheet.rows[0].slice(2, 5)).toEqual(['', '7777777', 'brak na liście'])
  })

  it('pusta ksywa w bazie: pusta komórka w arkuszu, null w odpowiedzi', () => {
    const env = fakeEnv()
    const result = registerPerson({ orderNumber: '3099999', firstName: 'Ola', lastInitial: 'P' }, env)
    expect(result).toMatchObject({ ok: true, nickname: null, ticketType: 'Norm' })
    expect(env.sheet.rows[0][2]).toBe('')
  })

  it('Lp liczone od największego istniejącego', () => {
    const env = fakeEnv({ rows: [[3, 'Ela L.', 'ksywa 6', '3056890', 'Norm', '', 'Na terenie', NOW, '']] })
    expect(registerPerson(jasmina, env)).toMatchObject({ ok: true, id: 4 })
  })

  it('zajęta blokada: BUSY, nic nie czyta z karty ani nie zapisuje, nie zwalnia cudzej blokady', () => {
    const env = fakeEnv({ lockFree: false })
    expect(registerPerson(jasmina, env)).toEqual({ ok: false, error: 'BUSY' })
    expect(env.sheet.appendRow).not.toHaveBeenCalled()
    expect(env.lock.releaseLock).not.toHaveBeenCalled()
  })

  it('błąd zapisu: blokada zwolniona, błąd idzie dalej', () => {
    const env = fakeEnv()
    env.sheet.appendRow = vi.fn(() => { throw new Error('arkusz niedostępny') })
    expect(() => registerPerson(jasmina, env)).toThrow('arkusz niedostępny')
    expect(env.lock.releaseLock).toHaveBeenCalledOnce()
  })
})
