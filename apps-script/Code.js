// API rejestracji EPIC ROLL. Szkielet z M2; logika rejestracji powstaje w M3 (SPEC.md, TECH.md).

function doPost(e) {
  return json({ ok: false, error: 'SERVER' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
