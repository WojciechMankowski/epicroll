// M4.3: walidacja formularza na stronie (SPEC.md „Walidacja i komunikaty”).
// Te same wyrażenia regularne co w apps-script/validation.js; oba pliki przechodzą
// te same przypadki z test-data/validation-cases.json. Zmiana reguły = zmiana w obu miejscach.

import type { FieldName } from './api'

export const ORDER_NUMBER_RE = /^\d{7}$/
export const FIRST_NAME_RE = /^\p{L}[\p{L} -]{1,29}$/u
export const LAST_INITIAL_RE = /^\p{L}$/u

/** Komunikaty przy polach, słowo w słowo z SPEC.md. */
export const MESSAGES: Record<FieldName | 'required', string> = {
  orderNumber: 'Sprawdź numer zamówienia: 7 cyfr, np. 3078012.',
  firstName: 'Wpisz imię (same litery).',
  lastInitial: 'Wpisz pierwszą literę nazwiska.',
  required: 'Uzupełnij to pole.',
}

export type FormValues = {
  orderNumber: string
  firstName: string
  lastInitial: string
}

export type FieldErrors = Partial<Record<FieldName, string>>

export type FormResult =
  | { ok: true; value: FormValues }
  | { ok: false; errors: FieldErrors }

export const normalizeOrderNumber = (value: unknown) => String(value ?? '').replace(/\s+/g, '')
export const normalizeFirstName = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ')
export const normalizeLastInitial = (value: unknown) => String(value ?? '').trim().toLocaleUpperCase('pl')

const FIELDS: Array<{ field: FieldName; normalize: (v: unknown) => string; re: RegExp }> = [
  { field: 'orderNumber', normalize: normalizeOrderNumber, re: ORDER_NUMBER_RE },
  { field: 'firstName', normalize: normalizeFirstName, re: FIRST_NAME_RE },
  { field: 'lastInitial', normalize: normalizeLastInitial, re: LAST_INITIAL_RE },
]

/**
 * Sprawdza formularz przed wysłaniem. Zwraca znormalizowane wartości albo komunikat
 * przy każdym błędnym polu naraz (pole puste: „Uzupełnij to pole.”).
 */
export function validateForm(values: FormValues): FormResult {
  const value = {} as FormValues
  const errors: FieldErrors = {}
  for (const { field, normalize, re } of FIELDS) {
    const normalized = normalize(values[field])
    value[field] = normalized
    if (normalized === '') errors[field] = MESSAGES.required
    else if (!re.test(normalized)) errors[field] = MESSAGES[field]
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value }
}

export type RegistrationCheck =
  | { ok: true; value: FormValues }
  | { ok: false; error: 'VALIDATION'; field?: FieldName }

/**
 * Ta sama decyzja co validateRegistration w apps-script/validation.js: pierwsze błędne pole,
 * pole-pułapka `website`. Służy do sprawdzenia, że strona i API zgadzają się na wspólnych przypadkach.
 */
export function validateRegistration(input: unknown): RegistrationCheck {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'VALIDATION' }
  }
  const data = input as Record<string, unknown>
  if (String(data.website ?? '') !== '') return { ok: false, error: 'VALIDATION' }

  const value = {} as FormValues
  for (const { field, normalize, re } of FIELDS) {
    const normalized = normalize(data[field])
    if (!re.test(normalized)) return { ok: false, error: 'VALIDATION', field }
    value[field] = normalized
  }
  return { ok: true, value }
}
