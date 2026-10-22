// M3.2: odczyt karty „Rejestracje” i wykrywanie duplikatów.
// Duplikat to ten sam numer zamówienia i ta sama osoba (imię + inicjał nazwiska).
// Jedno zamówienie może obejmować kilka osób o różnych imionach i nazwiskach (SPEC.md, F4).

const REGISTRATIONS_SHEET_NAME = 'Rejestracje';
const COL_LP = 0; // A
const COL_NAME = 1; // B
const COL_ORDER = 3; // D

/** „Anna K.” z imienia i inicjału; tak skrypt zapisuje osobę w kolumnie B. */
function displayName(firstName, lastInitial) {
  return `${firstName} ${lastInitial}.`;
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl');
}

/**
 * Klucz osoby do porównań: imiona i pierwsza litera ostatniego wyrazu (nazwiska).
 * „Anna K.”, „anna  kowalska” i „Anna Kowalska ” dają ten sam klucz „anna|k”.
 * Dzięki temu pasuje też osoba dopisana ręcznie pełnym nazwiskiem.
 */
function personKey(fullName) {
  const words = normalizeText(fullName).split(' ').filter(Boolean);
  if (words.length < 2) return `${words.join(' ')}|`;
  const surname = words[words.length - 1];
  return `${words.slice(0, -1).join(' ')}|${surname.charAt(0)}`;
}

/** Klucz osoby z danych formularza (po validateRegistration). */
function inputKey(firstName, lastInitial) {
  return `${normalizeText(firstName)}|${normalizeText(lastInitial)}`;
}

/**
 * Wiersze danych karty „Rejestracje”, kolumny A–D, bez nagłówka.
 * Jedno wywołanie getValues(), żeby nie odpytywać arkusza wiersz po wierszu.
 */
function readRegistrations(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 4).getValues();
}

/**
 * Szuka wcześniejszej rejestracji tej samej osoby z tym samym numerem zamówienia.
 * Zwraca { lp, rowNumber } znalezionego wiersza albo null.
 * Numer porównywany jako tekst: komórka może zawierać liczbę albo tekst.
 */
function findDuplicate(rows, orderNumber, firstName, lastInitial) {
  const key = inputKey(firstName, lastInitial);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[COL_ORDER]).trim() !== orderNumber) continue;
    if (personKey(row[COL_NAME]) === key) {
      return { lp: row[COL_LP], rowNumber: i + 2 };
    }
  }
  return null;
}
