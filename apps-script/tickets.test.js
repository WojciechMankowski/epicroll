// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// tickets.js korzysta z personKey i inputKey z registrations.js; w Apps Script pliki
// dzielą jeden zasięg, więc test ładuje oba razem.
const load = (name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
const { findColumns, readTickets, findTicket, NOT_ON_LIST } = new Function(
  `${load('registrations.js')}\n${load('tickets.js')}\nreturn { findColumns, readTickets, findTicket, NOT_ON_LIST };`,
)()

// Fragment testowej bazy biletów Wojtka (nagłówki i dane jak w arkuszu).
const base = [
  ['Lp', 'Imię i Nazwisko Podane w formularz', 'Ksywa', 'Nr Zamówienia', 'Typ Biletu', 'Działanie', 'Status'],
  [1, 'Wojciech Mlina', 'ksywa 1', 1111111, 'VIP', '', ''],
  [2, 'Zofia Malińsk ', 'ksywa 2', 1234567, 'VIP', '', ''],
  [3, 'Stafan J', 'ksywa 3', 3012456, 'Gość', '', ''],
  [4, 'Jasmina K', 'ksywa 4', 3023567, 'Gość', '', ''],
  [8, 'Katarzyna J', 'ksywa 8', 3023567, 'Program', '', ''],
  [11, 'Ola P', '', '3099999', 'Norm', '', ''],
]

describe('findTicket', () => {
  it('znajduje osobę po numerze, imieniu i inicjale', () => {
    expect(findTicket(base, '3023567', 'Jasmina', 'K')).toEqual({ nickname: 'ksywa 4', ticketType: 'Gość' })
  })

  it('druga osoba z tego samego zamówienia dostaje swoje dane (T11)', () => {
    expect(findTicket(base, '3023567', 'Katarzyna', 'J')).toEqual({ nickname: 'ksywa 8', ticketType: 'Program' })
  })

  it('spacja na końcu nazwiska w bazie nie przeszkadza', () => {
    expect(findTicket(base, '1234567', 'Zofia', 'M')).toEqual({ nickname: 'ksywa 2', ticketType: 'VIP' })
  })

  it('numer zapisany w bazie jako liczba', () => {
    expect(findTicket(base, '1111111', 'wojciech', 'm')).toEqual({ nickname: 'ksywa 1', ticketType: 'VIP' })
  })

  it('pusta ksywa w bazie daje pusty tekst', () => {
    expect(findTicket(base, '3099999', 'Ola', 'P')).toEqual({ nickname: '', ticketType: 'Norm' })
  })

  it('literówka w imieniu w bazie: osoby nie ma na liście (T9)', () => {
    expect(findTicket(base, '3012456', 'Stefan', 'J')).toBeNull()
  })

  it('zły inicjał: osoby nie ma na liście', () => {
    expect(findTicket(base, '3023567', 'Jasmina', 'J')).toBeNull()
  })

  it('numer spoza listy (T9)', () => {
    expect(findTicket(base, '7777777', 'Jasmina', 'K')).toBeNull()
  })

  it('pusty arkusz to błąd konfiguracji', () => {
    expect(() => findTicket([], '3023567', 'Jasmina', 'K')).toThrow(/pusty/)
  })

  it('inna kolejność kolumn i krótszy nagłówek imienia', () => {
    const reordered = [
      [' typ biletu ', 'Nr Zamówienia', 'Uwagi', 'Imię i Nazwisko', 'KSYWA'],
      ['Gość', '3023567', 'cokolwiek', 'Jasmina K', 'ksywa 4'],
    ]
    expect(findTicket(reordered, '3023567', 'Jasmina', 'K')).toEqual({ nickname: 'ksywa 4', ticketType: 'Gość' })
  })
})

describe('findColumns', () => {
  it('zwraca numery kolumn testowej bazy', () => {
    expect(findColumns(base[0])).toEqual({ name: 1, nickname: 2, orderNumber: 3, ticketType: 4 })
  })

  it('brak nagłówka: błąd z jego nazwą', () => {
    expect(() => findColumns(['Lp', 'Imię i Nazwisko', 'Ksywa', 'Nr Zamówienia'])).toThrow('„Typ Biletu”')
  })
})

describe('readTickets', () => {
  it('czyta całą pierwszą kartę jednym getDataRange().getValues()', () => {
    const first = { getDataRange: () => ({ getValues: () => base }) }
    const second = { getDataRange: () => { throw new Error('druga karta') } }
    expect(readTickets({ getSheets: () => [first, second] })).toBe(base)
  })
})

it('stała dla osób spoza listy', () => {
  expect(NOT_ON_LIST).toBe('brak na liście')
})
