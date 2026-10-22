import { DataNotice } from './components/DataNotice'
import { ErrorScreen } from './components/ErrorScreen'
import { IdScreen } from './components/IdScreen'
import { RegistrationForm } from './components/RegistrationForm'
import { EVENT_DATE, EVENT_NAME, EVENT_PLACE } from './event'
import { useRegistration, type RegistrationDeps } from './useRegistration'

// Ekrany: formularz (M5.1), ekran z ID (M5.2), ekran błędu (M5.3).

type Props = { deps?: RegistrationDeps }

export default function App({ deps }: Props) {
  const { state, submit, retry, backToForm } = useRegistration(deps)

  return (
    <main
      // Odstępy od wycięcia na aparat i paska iPhone'a (viewport-fit=cover w index.html).
      className="mx-auto flex min-h-dvh max-w-md flex-col
        pt-[max(2rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))]
        pb-[max(3rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]"
    >
      <header className="mb-10">
        <h1 className="font-display text-6xl leading-[0.9] font-extrabold tracking-tight">{EVENT_NAME}</h1>
        <p className="mt-3 text-lg leading-snug text-muted">
          {EVENT_DATE}
          <br />
          {EVENT_PLACE}
        </p>
      </header>

      {state.screen === 'done' && <IdScreen registration={state.registration} saved={state.saved} />}

      {state.screen === 'error' && (
        <ErrorScreen
          error={state.error}
          values={state.values}
          onRetry={() => void retry()}
          onEdit={backToForm}
        />
      )}

      {(state.screen === 'form' || state.screen === 'sending') && (
        <section aria-labelledby="registration-heading">
          <h2 id="registration-heading" className="mb-6 font-display text-3xl font-bold">Rejestracja</h2>
          <RegistrationForm
            // Nowy obiekt wartości (np. po błędzie z serwera) odświeża domyślne wartości pól.
            key={JSON.stringify(state.values)}
            values={state.values}
            errors={state.screen === 'form' ? state.errors : {}}
            sending={state.screen === 'sending'}
            onSubmit={(values, website) => void submit(values, website)}
          />
          <DataNotice />
        </section>
      )}
    </main>
  )
}
