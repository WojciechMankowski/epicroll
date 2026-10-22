// Formatowanie dat na ekranie (czas polski niezależnie od strefy telefonu).

const TIME_ZONE = 'Europe/Warsaw'
const dateFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: TIME_ZONE, day: 'numeric', month: 'long' })
const timeFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })

/** „Zarejestrowano 5 grudnia, 09:42” w czasie polskim; null dla błędnej daty. */
export function formatRegisteredAt(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return `Zarejestrowano ${dateFormat.format(date)}, ${timeFormat.format(date)}`
}
