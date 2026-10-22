import { formatRegisteredAt } from '../format'
import type { StoredRegistration } from '../storage'

// M5.2: ekran z ID (SPEC.md F10). Obsługa ma odczytać numer i imię z około metra,
// więc numer jest największym elementem, w obrysie kostki k20 (EPIC ROLL to konwent RPG).

// Rozmiar numeru (jednostki viewBox 200×200) zależny od liczby cyfr, żeby mieścił się w kostce.
const NUMBER_SIZE: Record<number, number> = { 1: 100, 2: 96, 3: 72 }

/** Obrys kostki k20: sześciokąt, środkowy trójkąt i krawędzie między nimi. */
function D20({ id }: { id: number }) {
  const text = String(id)
  const fontSize = NUMBER_SIZE[text.length] ?? 56
  const hex = '100,6 181,53 181,147 100,194 19,147 19,53'
  const tri = { top: '100,32', right: '170,152', left: '30,152' }
  const edges = [
    ['100,6', tri.top], ['181,53', tri.top], ['181,53', tri.right], ['181,147', tri.right],
    ['100,194', tri.right], ['100,194', tri.left], ['19,147', tri.left], ['19,53', tri.left], ['19,53', tri.top],
  ]
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full" aria-hidden="true">
      <g fill="none" stroke="var(--color-brass)" strokeWidth="3" strokeLinejoin="round">
        <polygon points={hex} />
        <polygon points={`${tri.top} ${tri.right} ${tri.left}`} />
        {edges.map(([a, b]) => <polyline key={`${a}-${b}`} points={`${a} ${b}`} strokeWidth="1.5" opacity="0.6" />)}
      </g>
      <text
        x="100"
        y="106"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth="10"
        paintOrder="stroke"
        className="font-display font-extrabold"
      >
        {text}
      </text>
    </svg>
  )
}

type Props = {
  registration: StoredRegistration
  saved: boolean
}

export function IdScreen({ registration, saved }: Props) {
  const registeredAt = formatRegisteredAt(registration.registeredAt)
  return (
    <section aria-label="Twoja rejestracja" className="flex flex-col gap-4">
      <div className="flex flex-col gap-5 rounded-2xl bg-ink p-6 text-paper">
        <p className="text-xl font-semibold">Pokaż ten ekran obsłudze.</p>

        <div
          role="img"
          aria-label={`Numer rejestracji ${registration.id}`}
          data-testid="registration-id"
          className="mx-auto w-full max-w-[18rem]"
        >
          <D20 id={registration.id} />
        </div>

        <div className="flex flex-col items-start gap-2">
          <p className="text-3xl font-semibold">{registration.firstName}{'\u00a0'}{registration.lastInitial}.</p>
          {registration.nickname && <p className="text-xl text-brass">{registration.nickname}</p>}
          {registration.ticketType && (
            <p className="rounded-full border border-paper/50 px-3 py-0.5 text-lg">{registration.ticketType}</p>
          )}
          <p className="text-base text-paper/75">Zamówienie {registration.orderNumber}</p>
          {registeredAt && <p className="text-base text-paper/75">{registeredAt}</p>}
        </div>
      </div>

      {!saved && (
        <p className="border-l-4 border-ink pl-3 text-lg font-semibold">
          Ta przeglądarka nie zapamięta rejestracji. Zrób zrzut ekranu.
        </p>
      )}
    </section>
  )
}
