// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

// triggers.js korzysta ze stałych z registrations.js i register.js (wspólny zasięg Apps Script).
const FILES = ['registrations.js', 'tickets.js', 'register.js', 'triggers.js']
const source = FILES.map((f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')).join('\n')
const load = (google = {}) =>
  new Function('PropertiesService', 'ScriptApp', 'console', `${source}\nreturn { exitAction, onStatusEdit, installTriggers };`)(
    google.PropertiesService, google.ScriptApp, google.console ?? { log: () => {} },
  )

/** Atrapa zakresu po edycji: domyślnie pojedyncza komórka G5 karty „Rejestracje”. */
function fakeRange({ sheet = 'Rejestracje', column = 7, row = 5, rows = 1, columns = 1 } = {}) {
  const exitCell = { setValue: vi.fn(), clearContent: vi.fn() }
  return {
    exitCell,
    getSheet: () => ({ getName: () => sheet }),
    getColumn: () => column,
    getRow: () => row,
    getNumRows: () => rows,
    getNumColumns: () => columns,
    offset: vi.fn(() => exitCell),
  }
}

describe('onStatusEdit', () => {
  const { exitAction, onStatusEdit } = load()

  it('„Wyszedł na stałe” wpisuje bieżącą datę do kolumny I (T12)', () => {
    const range = fakeRange()
    const before = Date.now()
    onStatusEdit({ range, value: 'Wyszedł na stałe' })
    expect(range.offset).toHaveBeenCalledWith(0, 2)
    const written = range.exitCell.setValue.mock.calls[0][0]
    expect(written).toBeInstanceOf(Date)
    expect(written.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('powrót do „Na terenie” czyści datę wyjścia (T13)', () => {
    const range = fakeRange()
    onStatusEdit({ range, value: 'Na terenie' })
    expect(range.exitCell.clearContent).toHaveBeenCalledOnce()
    expect(range.exitCell.setValue).not.toHaveBeenCalled()
  })

  it('spacje wokół wartości nie przeszkadzają', () => {
    expect(exitAction({ range: fakeRange(), value: ' Wyszedł na stałe ' })).toBe('set')
  })

  it.each([
    ['inna kolumna (F, Działanie)', { column: 6 }, 'Wyszedł na stałe'],
    ['wiersz nagłówka', { row: 1 }, 'Wyszedł na stałe'],
    ['inna karta', { sheet: 'Arkusz2' }, 'Wyszedł na stałe'],
    ['kilka wierszy naraz', { rows: 3 }, 'Wyszedł na stałe'],
    ['kilka kolumn naraz', { columns: 2 }, 'Wyszedł na stałe'],
    ['wyczyszczony status', {}, undefined],
    ['inna wartość statusu', {}, 'Wyszedł na chwilę'],
  ])('nic nie robi: %s', (_name, rangeOptions, value) => {
    const range = fakeRange(rangeOptions)
    onStatusEdit({ range, value })
    expect(range.offset).not.toHaveBeenCalled()
  })
})

describe('installTriggers', () => {
  function fakeGoogle(sheetId, existing) {
    const builder = { forSpreadsheet: vi.fn(() => builder), onEdit: vi.fn(() => builder), create: vi.fn() }
    return {
      builder,
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => sheetId }) },
      ScriptApp: {
        getProjectTriggers: () => existing.map((name) => ({ getHandlerFunction: () => name })),
        deleteTrigger: vi.fn(),
        newTrigger: vi.fn(() => builder),
      },
    }
  }

  it('usuwa stare wyzwalacze onStatusEdit i tworzy jeden nowy dla SHEET_ID', () => {
    const google = fakeGoogle('arkusz-obslugi', ['onStatusEdit', 'innaFunkcja', 'onStatusEdit'])
    load(google).installTriggers()
    expect(google.ScriptApp.deleteTrigger).toHaveBeenCalledTimes(2)
    expect(google.ScriptApp.newTrigger).toHaveBeenCalledWith('onStatusEdit')
    expect(google.builder.forSpreadsheet).toHaveBeenCalledWith('arkusz-obslugi')
    expect(google.builder.create).toHaveBeenCalledOnce()
  })

  it('bez SHEET_ID: błąd i żadnych zmian w wyzwalaczach', () => {
    const google = fakeGoogle(null, ['onStatusEdit'])
    expect(() => load(google).installTriggers()).toThrow('SHEET_ID')
    expect(google.ScriptApp.deleteTrigger).not.toHaveBeenCalled()
  })
})
