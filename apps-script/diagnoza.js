// Sprawdzenie konfiguracji API z edytora Apps Script (wybierz „diagnoza” i kliknij „Uruchom”).
// Niczego nie zapisuje. Brak właściwości, karty albo nagłówka kończy się błędem z opisem.

function diagnoza() {
  console.log('Klucze właściwości: ' + PropertiesService.getScriptProperties().getKeys().join(', '));
  const env = productionEnv();
  console.log('Karta obsługi: ' + env.sheet.getName());
  const values = env.readTicketValues();
  console.log('Kolumny bazy biletów: ' + JSON.stringify(findColumns(values[0])));
  console.log('Wiersze w bazie biletów (bez nagłówka): ' + (values.length - 1));
  console.log('Wszystko gotowe');
}
