# Rejestracja na EPIC ROLL, opis technologii

Stan na 21.10.2026 · Wojtek Mankowski

Wymagania i kontrakt API są w SPEC.md. Ten plik opisuje, z czego i jak prototyp jest zbudowany.

## Stos

| Warstwa | Technologia | Rola |
| --- | --- | --- |
| Strona uczestnika | React + TypeScript, budowane przez Vite | formularz, walidacja, wysyłanie, ekran z ID, localStorage |
| Style | Tailwind CSS (wtyczka `@tailwindcss/vite`) | układ dla telefonu, ekran z ID |
| Hosting strony | GitHub Pages, publikacja przez GitHub Actions | statyczne pliki z katalogu `dist/` |
| API | Google Apps Script (JavaScript, środowisko V8), aplikacja internetowa | walidacja serwerowa, duplikaty, nadanie ID, odczyt listy biletów, zapis |
| Kod API | clasp (CLI Google do Apps Script) w tym samym repozytorium | wysyłanie kodu i wdrażanie z terminala |
| Baza | Google Sheets: arkusz obsługi (karta „Rejestracje”) i osobny arkusz z listą biletów | rejestracje, ksywy, typy biletów, uwagi obsługi |

Wersje pakietów: aktualne stabilne z npm w dniu założenia repozytorium, zapisane w `package-lock.json`. Kod Apps Script zostaje w JavaScript; TypeScript dotyczy tylko strony.

## Struktura repozytorium

```
<repo>/
├── .github/workflows/deploy.yml   publikacja na GitHub Pages
├── apps-script/
│   ├── .clasp.json                scriptId projektu Apps Script
│   ├── appsscript.json            manifest: strefa czasowa, V8, ustawienia aplikacji internetowej
│   ├── Code.js                    doPost, handleRequest (walidacja → registerPerson, błędy → SERVER), productionEnv
│   ├── Code.test.js               testy całego API na atrapach usług Google
│   ├── validation.js              walidacja żądania (funkcje bez efektów ubocznych)
│   ├── validation.test.js         testy Vitest, ładują validation.js w Node
│   ├── registrations.js           odczyt karty „Rejestracje”, wykrywanie duplikatów
│   ├── registrations.test.js
│   ├── tickets.js                 wyszukiwanie ksywy i typu biletu w liście biletów
│   ├── tickets.test.js
│   ├── register.js                nadanie Lp i zapis wiersza pod blokadą (registerPerson)
│   ├── register.test.js
│   ├── triggers.js                installTriggers, onStatusEdit: data wyjścia po zmianie „Status”
│   ├── triggers.test.js
│   └── diagnoza.js                sprawdzenie konfiguracji z edytora Apps Script
├── scripts/api-test.mjs           testy M3.T działającego API: npm run test:api -- <adres /exec>
├── src/
│   ├── main.tsx
│   ├── App.tsx                    stan ekranu i przejścia
│   ├── api.ts                     wywołanie API, typy żądania i odpowiedzi, ponawianie
│   ├── storage.ts                 odczyt i zapis localStorage w try/catch
│   ├── validation.ts              reguły pól (te same co w apps-script/validation.js)
│   ├── components/
│   │   ├── RegistrationForm.tsx
│   │   └── IdScreen.tsx
│   └── index.css                  @import "tailwindcss";
├── test-data/validation-cases.json  przypadki testowe walidacji, wspólne dla API i strony
├── .env.production                VITE_API_URL=<adres /exec aplikacji Apps Script>
├── index.html
├── vite.config.ts                 base: '/<repo>/', wtyczki react i tailwindcss
└── package.json
```

## Strona (React + TypeScript)

### Typy kontraktu

```ts
export type RegisterRequest = {
  orderNumber: string;
  firstName: string;
  lastInitial: string;
  website: string; // pułapka na boty, zawsze pusta u człowieka
};

export type RegisterSuccess = {
  ok: true;
  id: number;
  nickname: string | null;
  ticketType: string | null;
  registeredAt: string; // ISO 8601 w UTC, np. 2026-12-05T08:42:05.000Z; strona pokazuje czas polski
};

export type RegisterError = {
  ok: false;
  error: 'DUPLICATE' | 'VALIDATION' | 'BUSY' | 'SERVER';
  field?: 'orderNumber' | 'firstName' | 'lastInitial';
};

export type RegisterResponse = RegisterSuccess | RegisterError;
```

### Wywołanie API

```ts
const res = await fetch(import.meta.env.VITE_API_URL, {
  method: 'POST',
  body: JSON.stringify(request), // bez nagłówka Content-Type
});
const data = (await res.json()) as RegisterResponse;
```

Ciało typu string wysyła się domyślnie jako `text/plain;charset=UTF-8`. Takie żądanie nie wywołuje zapytania wstępnego CORS (OPTIONS), którego Apps Script nie obsługuje. Apps Script odpowiada przekierowaniem na `script.googleusercontent.com`, a `fetch` wykonuje je domyślnie i odczytuje JSON.

Limit czasu: `api.ts` czeka na odpowiedź do 30 s (`AbortController`). Krótszy limit jest ryzykowny: w teście T7 odpowiedzi trwały do 15 s, a przerwane żądanie mogło już zapisać wiersz, więc ponowienie dałoby `DUPLICATE`.

Ponawianie: przy `BUSY` albo błędzie sieci `registerAttendee` w `api.ts` ponawia żądanie automatycznie do 2 razy, po 1 s i po 2 s. Przekroczenia limitu czasu nie ponawia i zwraca `SERVER`. Odpowiedź, która nie jest JSON-em albo nie ma kształtu z kontraktu (`parseResponse`), też daje `SERVER`. Gdy nadal się nie uda, strona pokazuje komunikat i przycisk „Spróbuj ponownie”. `DUPLICATE` i `VALIDATION` nie są ponawiane.

### Stany ekranu w `App.tsx`

| Stan | Kiedy | Co widać |
| --- | --- | --- |
| `form` | brak wpisu w localStorage | formularz z trzema polami |
| `sending` | po kliknięciu „Zarejestruj” | zablokowany przycisk, „Rejestruję…” |
| `done` | `ok: true` albo wpis w localStorage przy starcie | `IdScreen` |
| `error` | `DUPLICATE`, `BUSY` lub `SERVER` po ponowieniach | komunikat, przy `BUSY`/`SERVER` przycisk „Spróbuj ponownie” |

Błąd `VALIDATION` wraca do stanu `form` z komunikatem przy polu z `field`.

### localStorage

Klucz `rejestracja-epic-roll-v1`, wartość to JSON z polami `id`, `orderNumber`, `firstName`, `lastInitial`, `nickname`, `ticketType`, `registeredAt`. `storage.ts` opakowuje `getItem` i `setItem` w `try/catch`. Gdy zapis się nie uda (tryb prywatny), `IdScreen` pokazuje prośbę o zrzut ekranu.

### Walidacja

`src/validation.ts` i `apps-script/validation.js` mają te same wyrażenia regularne i przechodzą te same przypadki z `test-data/validation-cases.json`. Przy zmianie reguły trzeba poprawić oba pliki i przypadki testowe.

| Pole | Wyrażenie |
| --- | --- |
| Numer zamówienia (po usunięciu spacji) | `^\d{7}$` |
| Imię | `^[\p{L}][\p{L} -]{1,29}$` (flaga `u`) |
| Inicjał nazwiska | `^\p{L}$` (flaga `u`) |

### Tailwind

Tailwind v4 nie potrzebuje pliku konfiguracyjnego: wystarczy wtyczka `@tailwindcss/vite` w `vite.config.ts` i `@import "tailwindcss";` w `index.css`. Wymagania N1 i N3 ze SPEC.md (pola 44 px, numer ID 72 px) dają się ustawić klasami `min-h-11` i `text-7xl`.

## API (Google Apps Script)

### Manifest `appsscript.json`

```json
{
  "timeZone": "Europe/Warsaw",
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

`USER_DEPLOYING` odpowiada ustawieniu „Wykonaj jako: Ja”, `ANYONE_ANONYMOUS` ustawieniu „Kto ma dostęp: Każdy”. Skrypt zapisuje do arkusza z uprawnieniami właściciela, bez kluczy API i konta serwisowego.

### Konfiguracja

Identyfikatory obu arkuszy leżą we Właściwościach skryptu i nie trafiają do repozytorium: `SHEET_ID` (arkusz obsługi, odczyt i zapis) i `TICKETS_SHEET_ID` (arkusz z listą biletów, tylko odczyt). Skrypt otwiera je przez `SpreadsheetApp.openById(...)`. Właściciel skryptu musi mieć dostęp co najmniej do odczytu arkusza z listą biletów.

### Logika `doPost(e)`

1. Parsuj `e.postData.contents` jako JSON, przytnij spacje, sprawdź reguły walidacji. Niepuste `website` → `VALIDATION`.
2. Usuń spacje z numeru zamówienia.
3. Załóż blokadę `LockService.getScriptLock().tryLock(10000)`. Brak blokady → `BUSY`.
4. Odczytaj kolumny A, B i D karty „Rejestracje” jednym `getValues()`.
5. Jest wiersz z tym samym numerem w D (porównanie jako tekst, `String(v).trim()`) i tą samą osobą w B → zwolnij blokadę, zwróć `DUPLICATE`. Osobę porównuje `personKey`: imiona i pierwsza litera ostatniego wyrazu, bez wielkości liter i nadmiarowych spacji. „Anna K.” i dopisana ręcznie „Anna Kowalska” to ta sama osoba (`apps-script/registrations.js`).
6. Odczytaj pierwszą kartę arkusza `TICKETS_SHEET_ID` jednym `getDataRange().getValues()`. Z wiersza 1 ustal numery kolumn po nagłówkach (funkcja `findColumns`: nagłówek zaczynający się od „Imię i Nazwisko”, „Ksywa”, „Nr Zamówienia”, „Typ Biletu”; porównanie po `trim()` i bez wielkości liter). Znajdź wiersz z tym numerem zamówienia, w którym imię zgadza się z podanym, a nazwisko zaczyna się od inicjału (porównanie po `trim()`, bez wielkości liter, z polskimi znakami). Weź z niego ksywę i typ biletu. Brak nagłówka → `SERVER` i `console.error` z jego nazwą. Odczyt listy może być przed założeniem blokady, bo skrypt jej nie zmienia. Brak → pusta ksywa i „brak na liście”.
7. Nowe ID = największa liczba w kolumnie A + 1, puste i nieliczbowe komórki pomijane (działa także po ręcznym usunięciu wiersza).
8. `appendRow([id, "Anna K.", ksywa, numer, typBiletu, "", "Na terenie", teraz, ""])`, gdzie `teraz = new Date()`, potem `SpreadsheetApp.flush()`.
9. Zwolnij blokadę (`finally`), zwróć `ok: true` z ID, ksywą, typem biletu i `registeredAt` równym `teraz`.

Kroki 3–9 wykonuje `registerPerson(person, env)` w `apps-script/register.js`. Dostaje blokadę, kartę, odczyt listy biletów, zegar i `flush` przez `env`, więc testy podają atrapy zamiast usług Google.

Każda odpowiedź przechodzi przez jedną funkcję pomocniczą:

```js
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Nieprzewidziany wyjątek (także brak `SHEET_ID`, `TICKETS_SHEET_ID` albo karty „Rejestracje”) łapie `try/catch` w `handleRequest`, zapisuje go przez `console.error` (widać go w zakładce „Wykonania”) i zwraca `SERVER`.

### Data wyjścia: wyzwalacz przy edycji

Skrypt jest samodzielny (nie jest przypięty do arkusza), więc prosty wyzwalacz `onEdit` nie zadziała. Kod jest w `apps-script/triggers.js`:

- `installTriggers()`, uruchomiona raz z edytora, usuwa wcześniejsze wyzwalacze `onStatusEdit` i tworzy jeden wyzwalacz instalowany przy edycji arkusza `SHEET_ID`.
- `onStatusEdit(e)` reaguje tylko na pojedynczą komórkę kolumny G karty „Rejestracje” poniżej nagłówka: „Wyszedł na stałe” wpisuje bieżącą datę do I, „Na terenie” czyści I, inne wartości nic nie zmieniają.

Wyzwalacz instalowany działa z uprawnieniami osoby, która go utworzyła, więc zapisze kolumnę I mimo ochrony H:I. Uruchamia się tylko przy edycji przez człowieka; zapis wiersza przez `doPost` go nie wywołuje. Po zmianie `SHEET_ID` na inny arkusz trzeba ponownie uruchomić `installTriggers()`. Wklejenie wartości do wielu komórek G naraz nie wypełnia dat; obsługa zmienia status pojedynczo. Funkcja `diagnoza` pokazuje listę ustawionych wyzwalaczy.

### Ograniczenia Apps Script

| Ograniczenie | Wartość | Skutek dla prototypu |
| --- | --- | --- |
| Równoczesne wykonania na użytkownika | 30 ([limity Google](https://developers.google.com/apps-script/guides/services/quotas?hl=en)) | przy „Wykonaj jako: Ja” wszystkie rejestracje liczą się do limitu właściciela; strona ponawia żądania, test T7 używa 25 równoległych żądań |
| Czas jednego wykonania | 6 min | bez znaczenia, rejestracja trwa ułamek sekundy |
| Kod HTTP odpowiedzi | zawsze 200 | wynik niesie pole `ok` i kod `error` |
| Pierwsze wywołanie po przerwie | wolniejsze o kilka sekund | blokada przycisku i tekst „Rejestruję…” |
| Uruchamianie | tylko w chmurze Google | testy API przez `fetch` z konsoli albo skrypt w Node |

## clasp i wdrażanie API

1. Włącz „Google Apps Script API” w ustawieniach użytkownika Apps Script (script.google.com, Ustawienia).
2. `npm install -g @google/clasp`, potem `clasp login`.
3. W katalogu `apps-script/`: `clasp create --type standalone --title "Rejestracja API"` (albo `clasp clone <scriptId>` dla istniejącego projektu).
4. `clasp push` wysyła pliki `.js` i `appsscript.json` (testy pomija `.claspignore`).
5. Pierwsze wdrożenie w edytorze: Wdróż → Nowe wdrożenie → „Aplikacja internetowa”. Zapisz identyfikator wdrożenia i adres `/exec` w `.env.production`.
6. Kolejne zmiany: `clasp push`, potem `clasp deploy -i <deploymentId>`. Aktualizacja istniejącego wdrożenia zachowuje adres URL, więc strona nie wymaga zmian.

Nazwy poleceń zależą od wersji clasp (w nowszych wersjach `create-script` i `update-deployment`); `clasp --help` pokazuje te z zainstalowanej wersji.

## Publikacja strony

1. W repozytorium: Settings → Pages → Source: „GitHub Actions”.
2. Workflow `deploy.yml` uruchamia się przy pushu do `main`: checkout, instalacja Node, `npm ci`, `npm run build`, wysłanie `dist/` przez akcje `actions/upload-pages-artifact` i `actions/deploy-pages`.
3. `base` w `vite.config.ts` musi mieć nazwę repozytorium (`'/<repo>/'`), inaczej strona na `https://<login>.github.io/<repo>/` nie znajdzie plików JS i CSS.
4. Adres `VITE_API_URL` jest publiczny z natury (strona i tak go wysyła), więc `.env.production` może być w repozytorium.

## Środowisko testowe

Do prac używaj kopii arkusza z danymi testowymi. Przed wydarzeniem zmień `SHEET_ID` we Właściwościach skryptu na arkusz docelowy. Wdrożenie i adres `/exec` się nie zmieniają.
