import { describe, expect, it } from 'vitest'
import cases from '../test-data/validation-cases.json'
import { MESSAGES, validateForm, validateRegistration } from './validation'

describe('validateRegistration: te same przypadki co API (test-data/validation-cases.json)', () => {
  it.each(cases)('$name', ({ input, expected }) => {
    expect(validateRegistration(input)).toEqual(expected)
  })
})

describe('validateForm', () => {
  it('poprawne dane: wartości po normalizacji', () => {
    expect(validateForm({ orderNumber: ' 3078 012 ', firstName: '  Łucja   Anna ', lastInitial: 'ż' })).toEqual({
      ok: true,
      value: { orderNumber: '3078012', firstName: 'Łucja Anna', lastInitial: 'Ż' },
    })
  })

  it('puste pola: „Uzupełnij to pole.” przy każdym', () => {
    expect(validateForm({ orderNumber: '', firstName: '  ', lastInitial: '' })).toEqual({
      ok: false,
      errors: { orderNumber: MESSAGES.required, firstName: MESSAGES.required, lastInitial: MESSAGES.required },
    })
  })

  it('kilka błędów naraz: komunikat przy każdym błędnym polu (T10)', () => {
    expect(validateForm({ orderNumber: '301245a', firstName: '=SUMA(1;1)', lastInitial: 'K' })).toEqual({
      ok: false,
      errors: { orderNumber: MESSAGES.orderNumber, firstName: MESSAGES.firstName },
    })
  })

  it('inicjał z dwóch liter', () => {
    expect(validateForm({ orderNumber: '3078012', firstName: 'Anna', lastInitial: 'Ko' })).toEqual({
      ok: false,
      errors: { lastInitial: MESSAGES.lastInitial },
    })
  })
})

describe('komunikaty', () => {
  it('słowo w słowo jak w SPEC.md', () => {
    expect(MESSAGES).toEqual({
      orderNumber: 'Sprawdź numer zamówienia: 7 cyfr, np. 3078012.',
      firstName: 'Wpisz imię (same litery).',
      lastInitial: 'Wpisz pierwszą literę nazwiska.',
      required: 'Uzupełnij to pole.',
    })
  })
})
