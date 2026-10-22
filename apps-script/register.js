// M3.4: nadanie Lp i zapis wiersza pod blokadą.
// Korzysta z readRegistrations, findDuplicate, displayName (registrations.js)
// oraz findTicket i NOT_ON_LIST (tickets.js). doPost (M3.5) podaje prawdziwe
// LockService, arkusze i datę; testy podają atrapy.

const STATUS_ON_SITE = 'Na terenie';
const LOCK_TIMEOUT_MS = 10000;

/** Kolejne Lp: największa liczba w kolumnie A + 1; puste i nieliczbowe komórki pomijane. */
function nextLp(rows) {
  let max = 0;
  for (const row of rows) {
    const lp = Number(row[0]);
    if (row[0] !== '' && Number.isFinite(lp) && lp > max) max = lp;
  }
  return Math.floor(max) + 1;
}

/** Wiersz A–I karty „Rejestracje”. */
function buildRow({ lp, firstName, lastInitial, nickname, orderNumber, ticketType, now }) {
  return [
    lp, // A Lp
    displayName(firstName, lastInitial), // B Imię i Nazwisko Podane w formularz
    nickname, // C Ksywa
    orderNumber, // D Nr Zamówienia
    ticketType, // E Typ Biletu
    '', // F Działanie (obsługa)
    STATUS_ON_SITE, // G Status
    now, // H Data wejścia
    '', // I Data wyjścia
  ];
}

/**
 * Rejestruje osobę. `person` to wynik validateRegistration (pole value).
 * `env`: { lock, sheet, readTicketValues, now, flush }.
 * Zwraca odpowiedź API: sukces, DUPLICATE albo BUSY. Inne błędy rzuca dalej (doPost → SERVER).
 */
function registerPerson(person, env) {
  const { orderNumber, firstName, lastInitial } = person;

  // Lista biletów jest tylko czytana, więc odczyt może być przed blokadą.
  const ticket = findTicket(env.readTicketValues(), orderNumber, firstName, lastInitial);

  if (!env.lock.tryLock(LOCK_TIMEOUT_MS)) {
    return { ok: false, error: 'BUSY' };
  }
  try {
    const rows = readRegistrations(env.sheet);
    if (findDuplicate(rows, orderNumber, firstName, lastInitial)) {
      return { ok: false, error: 'DUPLICATE' };
    }

    const lp = nextLp(rows);
    const now = env.now();
    env.sheet.appendRow(buildRow({
      lp,
      firstName,
      lastInitial,
      nickname: ticket ? ticket.nickname : '',
      orderNumber,
      ticketType: ticket ? ticket.ticketType : NOT_ON_LIST,
      now,
    }));
    env.flush();

    return {
      ok: true,
      id: lp,
      nickname: ticket && ticket.nickname ? ticket.nickname : null,
      ticketType: ticket ? ticket.ticketType : null,
      registeredAt: now.toISOString(),
    };
  } finally {
    env.lock.releaseLock();
  }
}
