// M3.3: wyszukiwanie ksywy i typu biletu w osobnym arkuszu z listą biletów.
// Kolumny rozpoznawane po nagłówkach z wiersza 1, więc kolejność kolumn
// i dodatkowe kolumny nie mają znaczenia (SPEC.md, „Struktura arkusza Google”).
// Korzysta z personKey i inputKey z registrations.js (wspólny zasięg Apps Script).

const NOT_ON_LIST = 'brak na liście';

// Nagłówek pasuje, gdy po trim() i bez wielkości liter zaczyna się od podanego tekstu.
const TICKET_HEADERS = {
  name: 'Imię i Nazwisko',
  nickname: 'Ksywa',
  orderNumber: 'Nr Zamówienia',
  ticketType: 'Typ Biletu',
};

/**
 * Numery kolumn (od 0) po nagłówkach. Brak nagłówka rzuca błąd z jego nazwą;
 * doPost zamienia go na odpowiedź SERVER i zapisuje w logach.
 */
function findColumns(headerRow) {
  const headers = headerRow.map((h) => String(h ?? '').trim().toLocaleLowerCase('pl'));
  const columns = {};
  for (const [field, label] of Object.entries(TICKET_HEADERS)) {
    const wanted = label.toLocaleLowerCase('pl');
    const index = headers.findIndex((h) => h.startsWith(wanted));
    if (index === -1) {
      throw new Error(`Lista biletów: brak nagłówka „${label}”`);
    }
    columns[field] = index;
  }
  return columns;
}

/** Wszystkie wartości pierwszej karty arkusza z listą biletów, z nagłówkiem. */
function readTickets(spreadsheet) {
  return spreadsheet.getSheets()[0].getDataRange().getValues();
}

/**
 * Szuka osoby z tym numerem zamówienia: imię się zgadza, nazwisko zaczyna się od inicjału.
 * Zwraca { nickname, ticketType } (puste komórki jako '') albo null, gdy osoby nie ma.
 */
function findTicket(values, orderNumber, firstName, lastInitial) {
  if (values.length === 0) {
    throw new Error('Lista biletów: arkusz jest pusty');
  }
  const col = findColumns(values[0]);
  const key = inputKey(firstName, lastInitial);
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[col.orderNumber]).trim() !== orderNumber) continue;
    if (personKey(row[col.name]) !== key) continue;
    return {
      nickname: String(row[col.nickname] ?? '').trim(),
      ticketType: String(row[col.ticketType] ?? '').trim(),
    };
  }
  return null;
}
