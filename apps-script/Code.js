// API rejestracji EPIC ROLL (SPEC.md „Kontrakt API”, TECH.md „Logika doPost”).
// M3.5: doPost łączy walidację (validation.js), odczyt arkuszy i registerPerson (register.js).
// Każda odpowiedź to JSON z polem ok; Apps Script zawsze zwraca HTTP 200.

function doPost(e) {
  const body = e && e.postData ? e.postData.contents : '';
  return json(handleRequest(body, productionEnv));
}

/**
 * Obsługa jednego żądania bez zależności od usług Google: makeEnv buduje
 * środowisko dla registerPerson dopiero po udanej walidacji.
 * Nieprzewidziany wyjątek: wpis w logach („Wykonania”) i odpowiedź SERVER.
 */
function handleRequest(body, makeEnv) {
  try {
    const parsed = parseRegistration(body);
    if (!parsed.ok) return parsed;
    return registerPerson(parsed.value, makeEnv());
  } catch (err) {
    console.error(err && err.stack ? err.stack : String(err));
    return { ok: false, error: 'SERVER' };
  }
}

/** Prawdziwe usługi Google; identyfikatory arkuszy z Właściwości skryptu (M3.6). */
function productionEnv() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty('SHEET_ID');
  const ticketsSheetId = props.getProperty('TICKETS_SHEET_ID');
  if (!sheetId || !ticketsSheetId) {
    throw new Error('Brak SHEET_ID lub TICKETS_SHEET_ID we Właściwościach skryptu');
  }

  const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(REGISTRATIONS_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Arkusz obsługi: brak karty „${REGISTRATIONS_SHEET_NAME}”`);
  }

  return {
    lock: LockService.getScriptLock(),
    sheet,
    readTicketValues: () => readTickets(SpreadsheetApp.openById(ticketsSheetId)),
    now: () => new Date(),
    flush: () => SpreadsheetApp.flush(),
  };
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
