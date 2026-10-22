import { DATA_CONTACT, DATA_CONTROLLER, DATA_RETENTION, EVENT_NAME } from '../event'

// M5.4: informacja o przetwarzaniu danych pod formularzem (SPEC.md N6).
// Zdania składane z uzupełnionych pól w src/event.ts, żeby tekst roboczy nie miał luk.

type Props = {
  controller?: string
  retention?: string
  contact?: string
}

export function DataNotice({ controller = DATA_CONTROLLER, retention = DATA_RETENTION, contact = DATA_CONTACT }: Props) {
  const who = controller.trim() ? `zbiera ${controller.trim()}` : 'zbieramy'
  const sentences = [
    `Numer zamówienia, imię i pierwszą literę nazwiska ${who}, żeby potwierdzić Twój bilet przy wejściu na ${EVENT_NAME}.`,
    retention.trim()
      ? `Dane trafiają do arkusza obsługi wydarzenia i zostaną usunięte ${retention.trim()}.`
      : 'Dane trafiają do arkusza obsługi wydarzenia.',
    'Na tym telefonie zostaje zapis rejestracji, żeby ekran z numerem był pod ręką.',
  ]
  if (contact.trim()) sentences.push(`Pytania: ${contact.trim()}.`)

  return (
    <p className="mt-8 text-sm leading-relaxed text-muted" data-testid="data-notice">
      {sentences.join(' ')}
    </p>
  )
}
