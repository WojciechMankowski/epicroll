import { type FormEvent } from 'react'
import { EVENT_NAME, EVENT_SUBTITLE } from './event'
import { ERROR_MESSAGES, useRegistration, type RegistrationDeps } from './useRegistration'
import type { FieldErrors, FormValues } from './validation'

// M4.4: logika ekranów z prostym widokiem. Wygląd, komponenty RegistrationForm i IdScreen: M5.

const FIELDS: Array<{ name: keyof FormValues; label: string; inputMode?: 'numeric' }> = [
  { name: 'orderNumber', label: 'Numer zamówienia', inputMode: 'numeric' },
  { name: 'firstName', label: 'Imię' },
  { name: 'lastInitial', label: 'Pierwsza litera nazwiska' },
]

type Props = { deps?: RegistrationDeps }

export default function App({ deps }: Props) {
  const { state, submit, retry, backToForm } = useRegistration(deps)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values: FormValues = {
      orderNumber: String(data.get('orderNumber') ?? ''),
      firstName: String(data.get('firstName') ?? ''),
      lastInitial: String(data.get('lastInitial') ?? ''),
    }
    void submit(values, String(data.get('website') ?? ''))
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-2 px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight">{EVENT_NAME}</h1>
      <p className="text-base text-gray-600">{EVENT_SUBTITLE}</p>

      {state.screen === 'done' && (
        <section aria-label="Twoja rejestracja" className="mt-8 flex flex-col gap-2">
          <p className="text-7xl font-bold" data-testid="registration-id">{state.registration.id}</p>
          <p>{state.registration.firstName} {state.registration.lastInitial}.</p>
          {state.registration.nickname && <p>Ksywa: {state.registration.nickname}</p>}
          <p>Numer zamówienia: {state.registration.orderNumber}</p>
          {state.registration.ticketType && <p>Typ biletu: {state.registration.ticketType}</p>}
          <p className="font-semibold">Pokaż ten ekran obsłudze.</p>
          {!state.saved && <p>Zrób zrzut ekranu: przeglądarka nie zapamięta tej rejestracji.</p>}
        </section>
      )}

      {state.screen === 'error' && (
        <section aria-label="Błąd rejestracji" className="mt-8 flex flex-col gap-3">
          <p role="alert">{ERROR_MESSAGES[state.error]}</p>
          {state.error !== 'DUPLICATE' && (
            <button type="button" className="min-h-11 rounded border px-4" onClick={() => void retry()}>
              Spróbuj ponownie
            </button>
          )}
          <button type="button" className="min-h-11 rounded border px-4" onClick={backToForm}>
            Popraw dane
          </button>
        </section>
      )}

      {(state.screen === 'form' || state.screen === 'sending') && (
        <RegistrationFormView
          // Nowy obiekt wartości (np. po błędzie z serwera) odświeża domyślne wartości pól.
          key={JSON.stringify(state.values)}
          values={state.values}
          errors={state.screen === 'form' ? state.errors : {}}
          sending={state.screen === 'sending'}
          onSubmit={onSubmit}
        />
      )}
    </main>
  )
}

type FormViewProps = {
  values: FormValues
  errors: FieldErrors
  sending: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function RegistrationFormView({ values, errors, sending, onSubmit }: FormViewProps) {
  return (
    <form className="mt-8 flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      {FIELDS.map(({ name, label, inputMode }) => (
        <div key={name} className="flex flex-col gap-1">
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            name={name}
            defaultValue={values[name]}
            inputMode={inputMode}
            autoComplete="off"
            aria-invalid={errors[name] ? true : undefined}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            className="min-h-11 rounded border px-3"
          />
          {errors[name] && <p id={`${name}-error`} className="text-red-700">{errors[name]}</p>}
        </div>
      ))}
      {/* Pole-pułapka na boty: niewidoczne i pomijane przez klawiaturę; człowiek go nie wypełni. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">Strona internetowa</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" disabled={sending} className="min-h-11 rounded bg-black px-4 text-white disabled:opacity-60">
        {sending ? 'Rejestruję…' : 'Zarejestruj'}
      </button>
    </form>
  )
}
