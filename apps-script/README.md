# API w Apps Script

Kod API rejestracji. Do Apps Script trafiają pliki `.js` i `appsscript.json`; testy (`*.test.js`) i ten plik pomija `.claspignore`.

Projekt: skrypt samodzielny „EPIC ROLL API”, identyfikator w `.clasp.json`.

## Pierwsze uruchomienie (raz, na swoim komputerze)

1. Włącz „Google Apps Script API” na https://script.google.com/home/usersettings.
2. `npm install -g @google/clasp`
3. `clasp login` (otwiera przeglądarkę, logujesz się kontem, które jest właścicielem arkuszy).
4. W tym katalogu: `clasp create --type standalone --title "EPIC ROLL API"`. Polecenie tworzy `.clasp.json` z identyfikatorem skryptu.
5. Jeśli `clasp create` nadpisało `appsscript.json`, przywróć wersję z repozytorium: `git checkout appsscript.json`.
6. `clasp push`, potem w edytorze Apps Script sprawdź w ustawieniach projektu strefę czasową Europe/Warsaw.
7. Dodaj `.clasp.json` do commita. Identyfikator skryptu nie jest tajny.

Nazwy poleceń zależą od wersji clasp; `clasp --help` pokazuje te z zainstalowanej wersji.

## Właściwości skryptu

Edytor Apps Script → Ustawienia projektu → Właściwości skryptu:

| Właściwość | Wartość |
| --- | --- |
| `SHEET_ID` | identyfikator arkusza obsługi (karta „Rejestracje”) |
| `TICKETS_SHEET_ID` | identyfikator arkusza z listą biletów |

Identyfikator to fragment adresu arkusza między `/d/` a `/edit`. Zmiana właściwości działa od następnego żądania, bez ponownego wdrożenia.

## Wdrożenie jako aplikacja internetowa

1. Edytor → Wdróż → Nowe wdrożenie → typ „Aplikacja internetowa”.
2. „Wykonaj jako: Ja”, „Kto ma dostęp: Każdy”.
3. Przy pierwszym wdrożeniu „Autoryzuj dostęp”. Ekran „Google hasn’t verified this app” jest normalny dla własnego skryptu: Advanced → „Go to EPIC ROLL API (unsafe)”. Lista uprawnień powinna zawierać tylko arkusze Google.
4. Zapisz adres `/exec` (trafi do `VITE_API_URL` w `.env.production`) i identyfikator wdrożenia.

Kolejne zmiany kodu: `clasp push`, potem w edytorze Wdróż → Zarządzaj wdrożeniami → edycja istniejącego wdrożenia → Wersja: „Nowa wersja”. Adres `/exec` się nie zmienia. Samo `clasp push` nie zmienia działającego wdrożenia.

## Sprawdzenie

Konfiguracja: w edytorze wybierz funkcję `diagnoza` (plik `diagnoza.js`) i kliknij „Uruchom”. Dziennik wykonywania pokazuje właściwości, nazwę karty obsługi i kolumny bazy biletów; brak czegokolwiek kończy się błędem z opisem. Funkcja niczego nie zapisuje.

API (zapisuje wiersz w arkuszu obsługi; po teście usuń go):

```
U='<adres /exec>'
curl -sL -H 'Content-Type: text/plain' --data '{"orderNumber":"3023567","firstName":"Jasmina","lastInitial":"K","website":""}' "$U"; echo
```

Odpowiedź `{"ok":false,"error":"SERVER"}` oznacza błąd konfiguracji albo arkusza: uruchom `diagnoza`. Lista „Wykonania” nie pokazuje treści logów dla wywołań aplikacji internetowej.
