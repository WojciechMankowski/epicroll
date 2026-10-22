// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import cases from '../test-data/validation-cases.json'

// Apps Script nie ma modułów: wszystkie pliki .js dzielą jeden zasięg globalny.
// Test ładuje validation.js tak samo, jako zwykły skrypt, i wyciąga potrzebne funkcje.
const source = readFileSync(new URL('./validation.js', import.meta.url), 'utf8')
const { validateRegistration, parseRegistration } = new Function(
  `${source}\nreturn { validateRegistration, parseRegistration };`,
)()

describe('validateRegistration', () => {
  it.each(cases)('$name', ({ input, expected }) => {
    expect(validateRegistration(input)).toEqual(expected)
  })

  it.each([null, 'tekst', 42, []])('odrzuca dane, które nie są obiektem: %j', (input) => {
    expect(validateRegistration(input)).toEqual({ ok: false, error: 'VALIDATION' })
  })
})

describe('parseRegistration', () => {
  it('parsuje poprawny JSON', () => {
    const body = JSON.stringify({ orderNumber: '3078012', firstName: 'Anna', lastInitial: 'K', website: '' })
    expect(parseRegistration(body)).toEqual({
      ok: true,
      value: { orderNumber: '3078012', firstName: 'Anna', lastInitial: 'K' },
    })
  })

  it('odrzuca tekst, który nie jest JSON-em', () => {
    expect(parseRegistration('orderNumber=3078012')).toEqual({ ok: false, error: 'VALIDATION' })
  })

  it('odrzuca puste ciało', () => {
    expect(parseRegistration('')).toEqual({ ok: false, error: 'VALIDATION' })
  })
})
