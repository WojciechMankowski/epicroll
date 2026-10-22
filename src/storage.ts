// M4.2: zapis rejestracji w przeglądarce uczestnika (SPEC.md F8, F9; TECH.md „localStorage”).
// localStorage bywa niedostępny (tryb prywatny, zablokowane dane witryny) i wtedy rzuca wyjątki;
// każde użycie jest w try/catch, a strona działa dalej bez zapisu.

import { STORAGE_KEY } from './event'

export type StoredRegistration = {
  id: number
  orderNumber: string
  firstName: string
  lastInitial: string
  nickname: string | null
  ticketType: string | null
  registeredAt: string
}

/** localStorage albo null, gdy już sam dostęp do niego rzuca wyjątek. */
function defaultStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const isStringOrNull = (value: unknown) => value === null || typeof value === 'string'

function isStoredRegistration(data: unknown): data is StoredRegistration {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  return typeof d.id === 'number'
    && typeof d.orderNumber === 'string'
    && typeof d.firstName === 'string'
    && typeof d.lastInitial === 'string'
    && isStringOrNull(d.nickname)
    && isStringOrNull(d.ticketType)
    && typeof d.registeredAt === 'string'
}

/** Zapisana rejestracja albo null (brak wpisu, uszkodzony wpis, niedostępny localStorage). */
export function loadRegistration(storage: Storage | null = defaultStorage()): StoredRegistration | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const data: unknown = JSON.parse(raw)
    return isStoredRegistration(data) ? data : null
  } catch {
    return null
  }
}

/** Zapisuje rejestrację. Zwraca false, gdy zapis się nie udał; IdScreen prosi wtedy o zrzut ekranu. */
export function saveRegistration(registration: StoredRegistration, storage: Storage | null = defaultStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(registration))
    return true
  } catch {
    return false
  }
}
