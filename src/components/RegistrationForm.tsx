import { useEffect, useRef, type FormEvent } from 'react'
import type { FieldName } from '../api'
import type { FieldErrors, FormValues } from '../validation'

// M5.1: formularz rejestracji (SPEC.md F1–F3, „Walidacja i komunikaty”).

type Field = {
  name: FieldName
  label: string
  hint?: string
  inputMode?: 'numeric' | 'text'
  autoComplete: string
  maxLength?: number
  autoCapitalize?: 'words' | 'characters' | 'off'
}

const FIELDS: Field[] = [
  { name: 'orderNumber', label: 'Numer zamówienia', hint: '7 cyfr, np. 3078012', inputMode: 'numeric', autoComplete: 'off', maxLength: 9, autoCapitalize: 'off' },
  { name: 'firstName', label: 'Imię', autoComplete: 'given-name', maxLength: 40, autoCapitalize: 'words' },
  { name: 'lastInitial', label: 'Pierwsza litera nazwiska', hint: 'Samą literę, bez całego nazwiska', autoComplete: 'off', maxLength: 1, autoCapitalize: 'characters' },
]

type Props = {
  values: FormValues
  errors: FieldErrors
  sending: boolean
  onSubmit: (values: FormValues, website: string) => void
}

export function RegistrationForm({ values, errors, sending, onSubmit }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  // Po błędach fokus wraca na pierwsze błędne pole, żeby od razu je poprawić.
  useEffect(() => {
    const first = FIELDS.find((f) => errors[f.name])
    if (first) formRef.current?.querySelector<HTMLInputElement>(`#${first.name}`)?.focus()
  }, [errors])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit(
      {
        orderNumber: String(data.get('orderNumber') ?? ''),
        firstName: String(data.get('firstName') ?? ''),
        lastInitial: String(data.get('lastInitial') ?? ''),
      },
      String(data.get('website') ?? ''),
    )
  }

  return (
    <form ref={formRef} className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
      {FIELDS.map((field) => {
        const error = errors[field.name]
        const describedBy = [field.hint && `${field.name}-hint`, error && `${field.name}-error`].filter(Boolean).join(' ')
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={field.name} className="text-lg font-semibold">{field.label}</label>
            {field.hint && <p id={`${field.name}-hint`} className="text-base text-muted">{field.hint}</p>}
            <input
              id={field.name}
              name={field.name}
              defaultValue={values[field.name]}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete}
              autoCapitalize={field.autoCapitalize}
              autoCorrect="off"
              spellCheck={false}
              maxLength={field.maxLength}
              enterKeyHint={field.name === 'lastInitial' ? 'send' : 'next'}
              disabled={sending}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              className={`h-14 w-full rounded-lg border-2 bg-white px-4 text-xl text-ink transition-colors
                disabled:bg-paper disabled:text-muted
                ${error ? 'border-alert' : 'border-mist focus:border-ink'}
                ${field.name === 'lastInitial' ? 'max-w-20 text-center font-semibold' : ''}`}
            />
            {error && (
              <p id={`${field.name}-error`} className="text-base font-medium text-alert">{error}</p>
            )}
          </div>
        )
      })}

      {/* Pole-pułapka na boty: poza ekranem i poza kolejnością tabulacji; człowiek go nie wypełni. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Strona internetowa</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={sending}
        aria-busy={sending || undefined}
        className="mt-2 h-14 w-full rounded-lg bg-ink px-6 font-display text-2xl font-bold tracking-wide text-paper
          transition-opacity disabled:opacity-70"
      >
        {sending ? 'Rejestruję…' : 'Zarejestruj'}
      </button>
    </form>
  )
}
