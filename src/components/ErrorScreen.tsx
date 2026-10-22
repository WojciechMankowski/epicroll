import { useEffect, useRef } from 'react'
import { ERROR_MESSAGES, ERROR_TITLES, type ScreenError } from '../useRegistration'
import type { FormValues } from '../validation'

// M5.3: ekran błędu (SPEC.md „Walidacja i komunikaty”, tabela stanów po wysłaniu).
// Mówi, co się stało, pokazuje wpisane dane (literówka przy DUPLICATE) i co zrobić dalej.

type Props = {
  error: ScreenError
  values: FormValues
  onRetry: () => void
  onEdit: () => void
}

export function ErrorScreen({ error, values, onRetry, onEdit }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Fokus na tytuł: użytkownik klawiatury i czytnika ekranu trafia od razu na opis błędu.
  useEffect(() => {
    headingRef.current?.focus()
  }, [error])

  const canRetry = error !== 'DUPLICATE'

  return (
    <section aria-labelledby="error-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border-l-4 border-alert bg-white p-5">
        <h2 id="error-heading" ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold">
          {ERROR_TITLES[error]}
        </h2>
        <p role="alert" className="text-lg">{ERROR_MESSAGES[error]}</p>
        <dl className="mt-1 text-base text-muted">
          <div className="flex gap-1">
            <dt>Zamówienie</dt>
            <dd className="font-medium text-ink">{values.orderNumber}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="sr-only">Osoba</dt>
            <dd className="font-medium text-ink">{values.firstName} {values.lastInitial}.</dd>
          </div>
        </dl>
      </div>

      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-14 w-full rounded-lg bg-ink px-6 font-display text-2xl font-bold tracking-wide text-paper"
        >
          Spróbuj ponownie
        </button>
      )}
      <button
        type="button"
        onClick={onEdit}
        className="h-14 w-full rounded-lg border-2 border-ink px-6 font-display text-2xl font-bold tracking-wide text-ink"
      >
        Popraw dane
      </button>
    </section>
  )
}
