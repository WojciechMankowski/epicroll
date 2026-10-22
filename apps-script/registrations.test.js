// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Apps Script nie ma modułów; plik ładowany jako zwykły skrypt (jak w validation.test.js).
const source = readFileSync(new URL('./registrations.js', import.meta.url), 'utf8')
const { displayName, personKey, inputKey, readRegistrations, findDuplicate } = new Function(
  `${source}\nreturn { displayName, personKey, inputKey, readRegistrations, findDuplicate };`,
)()

// Wiersze A–D karty „Rejestracje”: Lp, Imię i Nazwisko, Ksywa, Nr Zamówienia.
const rows = [
  [1, 'Jasmina K.', 'ksywa 4', '3023567'],
  [2, 'Wojciech M.', 'ksywa 1', 1111111],
  [3, 'Łucja Anna-Maria Ż.', '', '3078012'],
  [4, 'Tomek Rogalski', '', '7084467'],
]

describe('displayName', () => {
  it('składa imię i inicjał z kropką', () => {
    expect(displayName('Anna', 'K')).toBe('Anna K.')
  })
})

describe('personKey i inputKey', () => {
  it.each([
    ['Anna K.', 'Anna', 'K'],
    ['  anna   kowalska ', 'Anna', 'K'],
    ['Łucja Anna-Maria Ż.', 'Łucja Anna-Maria', 'ż'],
    ['Zofia Malińsk ', 'Zofia', 'M'],
  ])('„%s” pasuje do %s %s', (fullName, firstName, lastInitial) => {
    expect(personKey(fullName)).toBe(inputKey(firstName, lastInitial))
  })

  it('imię bez nazwiska nie pasuje do osoby z inicjałem', () => {
    expect(personKey('Anna')).not.toBe(inputKey('Anna', 'K'))
  })
})

describe('findDuplicate', () => {
  it('ten sam numer i ta sama osoba to duplikat (T3)', () => {
    expect(findDuplicate(rows, '3023567', 'Jasmina', 'K')).toEqual({ lp: 1, rowNumber: 2 })
  })

  it('wielkość liter nie ma znaczenia', () => {
    expect(findDuplicate(rows, '3023567', 'JASMINA', 'k')).toEqual({ lp: 1, rowNumber: 2 })
  })

  it('ten sam numer, inna osoba z zamówienia to nie duplikat (T11)', () => {
    expect(findDuplicate(rows, '3023567', 'Katarzyna', 'J')).toBeNull()
  })

  it('ta sama osoba z innym numerem to nie duplikat', () => {
    expect(findDuplicate(rows, '3034678', 'Jasmina', 'K')).toBeNull()
  })

  it('numer zapisany w komórce jako liczba', () => {
    expect(findDuplicate(rows, '1111111', 'Wojciech', 'M')).toEqual({ lp: 2, rowNumber: 3 })
  })

  it('kilka imion i polskie znaki', () => {
    expect(findDuplicate(rows, '3078012', 'Łucja Anna-Maria', 'Ż')).toEqual({ lp: 3, rowNumber: 4 })
  })

  it('osoba dopisana ręcznie pełnym nazwiskiem', () => {
    expect(findDuplicate(rows, '7084467', 'Tomek', 'R')).toEqual({ lp: 4, rowNumber: 5 })
  })

  it('pusta karta', () => {
    expect(findDuplicate([], '3023567', 'Jasmina', 'K')).toBeNull()
  })
})

describe('readRegistrations', () => {
  const fakeSheet = (lastRow, values) => {
    const calls = []
    return {
      calls,
      getLastRow: () => lastRow,
      getRange: (...args) => {
        calls.push(args)
        return { getValues: () => values }
      },
    }
  }

  it('pusta karta (sam nagłówek) nie odpytuje zakresu', () => {
    const sheet = fakeSheet(1, [])
    expect(readRegistrations(sheet)).toEqual([])
    expect(sheet.calls).toEqual([])
  })

  it('czyta A–D od wiersza 2 jednym wywołaniem', () => {
    const sheet = fakeSheet(5, rows)
    expect(readRegistrations(sheet)).toBe(rows)
    expect(sheet.calls).toEqual([[2, 1, 4, 4]])
  })
})
