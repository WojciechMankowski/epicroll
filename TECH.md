# Rejestracja na wydarzenie, opis technologii

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
| Baza | Google Sheets, karty „Rejestracje” i „Bilety” | rejestracje, ksywy, typy biletów, uwagi obsługi |

Wersje pakietów: aktualne stabilne z npm w dniu założenia repozytorium, zapisane w `package-lock.json`. Kod Apps Script zostaje w JavaScript; TypeScript dotyczy tylko strony.

## Struktura repozytorium

```
<repo>/
├── .github/workflows/deploy.yml   publikacja na GitHub Pages
├── apps-script/
│   ├── .clasp.json                scriptId projektu Apps Script
│   ├── appsscript.json            manifest: strefa czasowa, V8, ustawienia aplikacji internetowej
│   └── Code.js                    doPost i funkcje pomocnicze
├── src/
│   ├── main.tsx
│   ├── App.tsx                    stan ekranu i przejścia
│   ├── api.ts                     wywołanie API, typy żądania i odpowiedzi, ponawianie
│   ├── storage.ts                 odczyt i zapis localStorage w try/catch
│   ├── validation.ts              reguły pól (te same co w Code.js)
│   ├── components/
│   │   ├── RegistrationForm.tsx
│   │   └── IdScreen.tsx
│   └── index.css                  @import "tailwindcss";
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
  registeredAt: string; // ISO 8601
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

Ponawianie: przy `BUSY` albo błędzie sieci `api.ts` ponawia żądanie automatycznie do 2 razy, po 1 s i po 2 s. Gdy nadal się nie uda, strona pokazuje komunikat i przycisk „Spróbuj ponownie”. `DUPLICATE` i `VALIDATION` nie są ponawiane.

### Stany ekranu w `App.tsx`

| Stan | Kiedy | Co widać |
| --- | --- | --- |
| `form` | brak wpisu w localStorage | formularz z trzema polami |
| `sending` | po kliknięciu „Zarejestruj” | zablokowany przycisk, „Rejestruję…” |
| `done` | `ok: true` albo wpis w localStorage przy starcie | `IdScreen` |
| `error` | `DUPLICATE`, `BUSY` lub `SERVER` po ponowieniach | komunikat, przy `BUSY`/`SERVER` przycisk „Spróbuj ponownie” |

Błąd `VALIDATION` wraca do stanu `form` z komunikatem przy polu z `field`.

### localStorage

Klucz `rejestracja-<slug-wydarzenia>-v1`, wartość to JSON z polami `id`, `orderNumber`, `firstName`, `lastInitial`, `nickname`, `ticketType`, `registeredAt`. `storage.ts` opakowuje `getItem` i `setItem` w `try/catch`. Gdy zapis się nie uda (tryb prywatny), `IdScreen` pokazuje prośbę o zrzut ekranu.

### Walidacja

`validation.ts` i `Code.js` mają te same wyrażenia regularne. Przy zmianie reguły trzeba poprawić oba pliki.

| Pole | Wyrażenie |
| --- | --- |
| Numer zamówienia (po usunięciu spacji) | `^\d{4,12}$` |
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

Identyfikator arkusza leży we Właściwościach skryptu pod kluczem `SHEET_ID` i nie trafia do repozytorium. Skrypt otwiera arkusz przez `SpreadsheetApp.openById(SHEET_ID)`.

### Logika `doPost(e)`

1. Parsuj `e.postData.contents` jako JSON, przytnij spacje, sprawdź reguły walidacji. Niepuste `website` → `VALIDATION`.
2. Usuń spacje z numeru zamówienia.
3. Załóż blokadę `LockService.getScriptLock().tryLock(10000)`. Brak blokady → `BUSY`.
4. Odczytaj kolumny A, B i D karty „Rejestracje” jednym `getValues()`.
5. Jest wiersz z tym samym numerem w D (porównanie jako tekst, `String(v).trim()`) i tym samym „Imię I.” w B (bez rozróżniania wielkości liter) → zwolnij blokadę, zwróć `DUPLICATE`.
6. Odczytaj kartę „Bilety” i znajdź wiersz z tym numerem, w którym imię zgadza się z podanym, a nazwisko zaczyna się od inicjału (porównanie bez wielkości liter, z polskimi znakami). Weź z niego ksywę i typ biletu. Brak → pusta ksywa i „brak na liście”.
7. Nowe ID = największa wartość w kolumnie A + 1 (działa także po ręcznym usunięciu wiersza).
8. `appendRow([id, "Anna K.", ksywa, numer, typBiletu, "", ""])`, potem `SpreadsheetApp.flush()`.
9. Zwolnij blokadę (`finally`), zwróć `ok: true` z ID, ksywą i typem biletu.

Każda odpowiedź przechodzi przez jedną funkcję pomocniczą:

```js
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Nieprzewidziany wyjątek łapie `try/catch` wokół całego `doPost`, zapisuje go przez `console.error` (widać go w zakładce „Wykonania”) i zwraca `SERVER`.

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
4. `clasp push` wysyła `Code.js` i `appsscript.json`.
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
