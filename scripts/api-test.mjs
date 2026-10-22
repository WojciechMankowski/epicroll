// Testy M3.T działającego API (SPEC.md T3, T4, T7, T9, T11).
// Uruchomienie: npm run test:api -- <adres /exec>
// Wymaga pustej karty „Rejestracje” i testowej bazy biletów. Zapisuje 29 wierszy;
// po teście usuń je z arkusza.

const url = process.argv[2]
if (!url || !url.endsWith('/exec')) {
  console.error('Podaj adres aplikacji Apps Script: npm run test:api -- https://script.google.com/macros/s/.../exec')
  process.exit(2)
}

const PARALLEL = 25

async function post(data) {
  const started = performance.now()
  const res = await fetch(url, { method: 'POST', body: JSON.stringify({ website: '', ...data }) })
  const text = await res.text()
  const ms = Math.round(performance.now() - started)
  try {
    return { body: JSON.parse(text), ms }
  } catch {
    return { body: { ok: false, error: `nie-JSON (HTTP ${res.status}): ${text.slice(0, 80)}` }, ms }
  }
}

/** Jak strona (TECH.md): BUSY i błąd sieci ponawiane do 2 razy, po 1 s i 2 s. */
async function postWithRetry(data) {
  let last
  for (const delay of [0, 1000, 2000]) {
    if (delay) await new Promise((r) => setTimeout(r, delay))
    try {
      last = await post(data)
      if (last.body.error !== 'BUSY') return last
    } catch (err) {
      last = { body: { ok: false, error: `sieć: ${err.message}` }, ms: 0 }
    }
  }
  return last
}

const results = []
function check(name, actual, expected) {
  const ok = Object.entries(expected).every(([k, v]) => JSON.stringify(actual[k]) === JSON.stringify(v))
  results.push({ ok, name })
  console.log(`${ok ? 'OK  ' : 'BŁĄD'} ${name}`)
  if (!ok) console.log(`     oczekiwano ${JSON.stringify(expected)}\n     otrzymano  ${JSON.stringify(actual)}`)
}

const jasmina = { orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K' }

console.log(`API: ${url}\n`)

const first = await post(jasmina)
check('pierwsza rejestracja: Lp 1, ksywa i typ z listy (T1)', first.body,
  { ok: true, id: 1, nickname: 'ksywa 4', ticketType: 'Gość' })

check('ta sama osoba drugi raz: DUPLICATE (T3)', (await post(jasmina)).body,
  { ok: false, error: 'DUPLICATE' })

check('ten sam numer ze spacją: DUPLICATE (T4)', (await post({ ...jasmina, orderNumber: '3023 567' })).body,
  { ok: false, error: 'DUPLICATE' })

check('druga osoba z zamówienia: Lp 2, jej ksywa i typ (T11)',
  (await post({ orderNumber: '3023567', firstName: 'Katarzyna', lastInitial: 'J' })).body,
  { ok: true, id: 2, nickname: 'ksywa 8', ticketType: 'Program' })

check('osoba spoza listy: Lp 3, bez ksywy i typu (T9)',
  (await post({ orderNumber: '7777777', firstName: 'Anna', lastInitial: 'K' })).body,
  { ok: true, id: 3, nickname: null, ticketType: null })

check('wypełnione pole-pułapka: VALIDATION', (await post({ ...jasmina, website: 'spam' })).body,
  { ok: false, error: 'VALIDATION' })

check('numer z 2 cyframi: VALIDATION przy numerze', (await post({ ...jasmina, orderNumber: '12' })).body,
  { ok: false, error: 'VALIDATION', field: 'orderNumber' })

// T7: 25 równoległych rejestracji różnych osób spoza listy (Testa T … Testy T).
console.log(`\nT7: ${PARALLEL} równoległych żądań…`)
const started = performance.now()
const parallel = await Promise.all(
  Array.from({ length: PARALLEL }, (_, i) =>
    postWithRetry({
      orderNumber: `90000${String(i).padStart(2, '0')}`,
      firstName: `Test${String.fromCharCode(97 + i)}`,
      lastInitial: 'T',
    }),
  ),
)
const totalMs = Math.round(performance.now() - started)
const failed = parallel.filter((r) => !r.body.ok)
const ids = parallel.filter((r) => r.body.ok).map((r) => r.body.id).sort((a, b) => a - b)
const contiguous = ids.length === PARALLEL && ids.every((id, i) => id === 4 + i)
const times = parallel.map((r) => r.ms).sort((a, b) => a - b)

check(`T7: wszystkie ${PARALLEL} zapisane`, { failed: failed.length }, { failed: 0 })
check('T7: Lp 4–28 bez luk i powtórzeń', { contiguous }, { contiguous: true })
if (failed.length) console.log(`     błędy: ${[...new Set(failed.map((r) => r.body.error))].join(', ')}`)
console.log(`     czas całości ${totalMs} ms; pojedyncze żądanie: min ${times[0]} ms, mediana ${times[Math.floor(times.length / 2)]} ms, max ${times.at(-1)} ms`)

const bad = results.filter((r) => !r.ok).length
console.log(`\n${results.length - bad}/${results.length} sprawdzeń OK. Usuń teraz wiersze testowe z karty „Rejestracje”.`)
process.exit(bad ? 1 : 0)
