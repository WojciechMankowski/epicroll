// M3.7: data wyjścia po zmianie „Status” (SPEC.md F13).
// Skrypt jest samodzielny, więc prosty onEdit nie działa; installTriggers() tworzy
// wyzwalacz instalowany dla arkusza obsługi. Uruchom ją raz z edytora Apps Script.

const STATUS_LEFT = 'Wyszedł na stałe';
const STATUS_COLUMN = 7; // G
const EXIT_OFFSET = 2; // z G do I („Data wyjścia”)

/** Tworzy wyzwalacz onStatusEdit dla arkusza SHEET_ID; wcześniejsze usuwa, żeby się nie dublowały. */
function installTriggers() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!sheetId) {
    throw new Error('Brak SHEET_ID we Właściwościach skryptu');
  }
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'onStatusEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('onStatusEdit').forSpreadsheet(sheetId).onEdit().create();
  console.log('Wyzwalacz onStatusEdit ustawiony dla arkusza ' + sheetId);
}

/**
 * Co zrobić z „Data wyjścia” po edycji: 'set', 'clear' albo null.
 * Reaguje tylko na pojedynczą komórkę G karty „Rejestracje” poniżej nagłówka.
 */
function exitAction(e) {
  const range = e.range;
  if (range.getSheet().getName() !== REGISTRATIONS_SHEET_NAME) return null;
  if (range.getColumn() !== STATUS_COLUMN || range.getRow() < 2) return null;
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return null;

  const value = String(e.value ?? '').trim();
  if (value === STATUS_LEFT) return 'set';
  if (value === STATUS_ON_SITE) return 'clear';
  return null;
}

function onStatusEdit(e) {
  const action = exitAction(e);
  if (!action) return;
  const exitCell = e.range.offset(0, EXIT_OFFSET);
  if (action === 'set') {
    exitCell.setValue(new Date());
  } else {
    exitCell.clearContent();
  }
}
