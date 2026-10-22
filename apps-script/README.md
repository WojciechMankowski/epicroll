# API w Apps Script

Kod API rejestracji. Do Apps Script trafiają tylko `Code.js` i `appsscript.json`; testy i ten plik pomija `.claspignore`.

## Pierwsze uruchomienie (raz, na swoim komputerze)

1. Włącz „Google Apps Script API” w ustawieniach użytkownika na script.google.com (Ustawienia).
2. `npm install -g @google/clasp`
3. `clasp login` (otwiera przeglądarkę, logujesz się kontem, które jest właścicielem arkuszy).
4. W tym katalogu: `clasp create --type standalone --title "EPIC ROLL API"`. Polecenie tworzy `.clasp.json` z identyfikatorem skryptu.
5. Jeśli `clasp create` nadpisało `appsscript.json`, przywróć wersję z repozytorium: `git checkout appsscript.json`.
6. `clasp push`, potem w edytorze Apps Script sprawdź w ustawieniach projektu strefę czasową Europe/Warsaw.
7. Dodaj `.clasp.json` do commita. Identyfikator skryptu nie jest tajny.

Nazwy poleceń zależą od wersji clasp; `clasp --help` pokazuje te z zainstalowanej wersji.

Wdrożenie jako aplikacja internetowa i Właściwości skryptu (`SHEET_ID`, `TICKETS_SHEET_ID`) to zadanie M3.6.
