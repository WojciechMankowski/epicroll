import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadRegistration, saveRegistration, type StoredRegistration } from './storage'

const registration: StoredRegistration = {
  id: 17,
  orderNumber: '3023567',
  firstName: 'Jasmina',
  lastInitial: 'K',
  nickname: 'ksywa 4',
  ticketType: 'Gość',
  registeredAt: '2026-12-05T08:42:05.000Z',
}

/** Prosty magazyn w pamięci z interfejsem Storage. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
  }
}

/** Magazyn, w którym każda operacja rzuca wyjątek (tryb prywatny, zablokowane dane witryny). */
function throwingStorage(): Storage {
  const fail = () => { throw new DOMException('zablokowane', 'SecurityError') }
  return { length: 0, clear: fail, key: fail, getItem: fail, setItem: fail, removeItem: fail }
}

describe('storage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('zapis i odczyt pod kluczem rejestracja-epic-roll-v1', () => {
    const storage = memoryStorage()
    expect(saveRegistration(registration, storage)).toBe(true)
    expect(storage.getItem('rejestracja-epic-roll-v1')).toBe(JSON.stringify(registration))
    expect(loadRegistration(storage)).toEqual(registration)
  })

  it('brak wpisu: null', () => {
    expect(loadRegistration(memoryStorage())).toBeNull()
  })

  it('osoba spoza listy (ksywa i typ null) też się zapisuje', () => {
    const storage = memoryStorage()
    const outsider = { ...registration, nickname: null, ticketType: null }
    saveRegistration(outsider, storage)
    expect(loadRegistration(storage)).toEqual(outsider)
  })

  it('uszkodzony JSON: null zamiast wyjątku', () => {
    expect(loadRegistration(memoryStorage({ 'rejestracja-epic-roll-v1': '{nie json' }))).toBeNull()
  })

  it('wpis bez wymaganych pól: null', () => {
    const partial = JSON.stringify({ id: 17, orderNumber: '3023567' })
    expect(loadRegistration(memoryStorage({ 'rejestracja-epic-roll-v1': partial }))).toBeNull()
  })

  it('magazyn rzucający wyjątki: odczyt daje null, zapis false, bez przerwania strony', () => {
    const storage = throwingStorage()
    expect(loadRegistration(storage)).toBeNull()
    expect(saveRegistration(registration, storage)).toBe(false)
  })

  it('brak magazynu (null): odczyt null, zapis false', () => {
    expect(loadRegistration(null)).toBeNull()
    expect(saveRegistration(registration, null)).toBe(false)
  })

  it('domyślnie używa window.localStorage', () => {
    expect(saveRegistration(registration)).toBe(true)
    expect(loadRegistration()).toEqual(registration)
  })

  it('sam dostęp do window.localStorage rzuca wyjątek: odczyt null, zapis false', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('zablokowane', 'SecurityError')
    })
    expect(loadRegistration()).toBeNull()
    expect(saveRegistration(registration)).toBe(false)
  })
})
