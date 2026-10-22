import { EVENT_NAME, EVENT_SUBTITLE } from './event'

// Szkielet z M2. Formularz i ekran z ID dochodzą w M4 i M5.
export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-2 px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight">{EVENT_NAME}</h1>
      <p className="text-base text-gray-600">{EVENT_SUBTITLE}</p>
      <p className="mt-8 text-gray-500">Rejestracja będzie dostępna wkrótce.</p>
    </main>
  )
}
