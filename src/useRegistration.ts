// M4.4: stany ekranu rejestracji i przejścia między nimi (TECH.md „Stany ekranu”).
// form → sending → done | error | form (VALIDATION); przy starcie wpis w localStorage → done (F9).

import { useRef, useState } from 'react'
import { registerAttendee, type RegisterRequest, type RegisterResponse } from './api'
import { loadRegistration, saveRegistration, type StoredRegistration } from './storage'
import { MESSAGES, validateForm, type FieldErrors, type FormValues } from './validation'

export type ScreenError = 'DUPLICATE' | 'BUSY' | 'SERVER'

/** Komunikaty ekranu błędu (SPEC.md „Walidacja i komunikaty”). */
export const ERROR_MESSAGES: Record<ScreenError, string> = {
  DUPLICATE: 'Ta osoba jest już zarejestrowana z\u00a0tym numerem zamówienia. Podejdź do obsługi.',
  BUSY: 'Wiele osób rejestruje się naraz. Spróbuj za chwilę.',
  SERVER: 'Nie udało się wysłać. Sprawdź internet i spróbuj ponownie.',
}

/** Tytuły ekranu błędu. */
export const ERROR_TITLES: Record<ScreenError, string> = {
  DUPLICATE: 'Ta rejestracja już istnieje',
  BUSY: 'Wiele zgłoszeń naraz',
  SERVER: 'Zgłoszenie nie dotarło',
}

export type ScreenState =
  | { screen: 'form'; values: FormValues; errors: FieldErrors }
  | { screen: 'sending'; values: FormValues }
  | { screen: 'done'; registration: StoredRegistration; saved: boolean }
  | { screen: 'error'; values: FormValues; error: ScreenError }

export type RegistrationDeps = {
  register?: (request: RegisterRequest) => Promise<RegisterResponse>
  /** undefined: window.localStorage; null: brak magazynu (jak w zablokowanej przeglądarce). */
  storage?: Storage | null
}

export const EMPTY_VALUES: FormValues = { orderNumber: '', firstName: '', lastInitial: '' }

function initialState(storage: Storage | null | undefined): ScreenState {
  const stored = loadRegistration(storage)
  return stored
    ? { screen: 'done', registration: stored, saved: true }
    : { screen: 'form', values: EMPTY_VALUES, errors: {} }
}

export function useRegistration(deps: RegistrationDeps = {}) {
  const register = deps.register ?? registerAttendee
  const [state, setState] = useState<ScreenState>(() => initialState(deps.storage))
  const sending = useRef(false)

  async function send(values: FormValues, website: string) {
    if (sending.current) return // drugie kliknięcie w trakcie wysyłania
    sending.current = true
    setState({ screen: 'sending', values })
    try {
      const result = await register({ ...values, website })
      if (result.ok) {
        const registration: StoredRegistration = {
          id: result.id,
          ...values,
          nickname: result.nickname,
          ticketType: result.ticketType,
          registeredAt: result.registeredAt,
        }
        const saved = saveRegistration(registration, deps.storage)
        setState({ screen: 'done', registration, saved })
      } else if (result.error === 'VALIDATION') {
        const errors: FieldErrors = result.field ? { [result.field]: MESSAGES[result.field] } : {}
        setState({ screen: 'form', values, errors })
      } else {
        setState({ screen: 'error', values, error: result.error })
      }
    } finally {
      sending.current = false
    }
  }

  /** Wysyła formularz; przy błędach walidacji zostaje na formularzu z komunikatami przy polach. */
  async function submit(values: FormValues, website = '') {
    const check = validateForm(values)
    if (!check.ok) {
      setState({ screen: 'form', values, errors: check.errors })
      return
    }
    await send(check.value, website)
  }

  /** „Spróbuj ponownie” po BUSY albo SERVER: te same dane jeszcze raz. */
  async function retry() {
    if (state.screen === 'error') await send(state.values, '')
  }

  /** Powrót z ekranu błędu do formularza z wpisanymi danymi (np. literówka przy DUPLICATE). */
  function backToForm() {
    if (state.screen === 'error') setState({ screen: 'form', values: state.values, errors: {} })
  }

  return { state, submit, retry, backToForm }
}
