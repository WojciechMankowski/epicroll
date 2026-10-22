# Rejestracja na wydarzenie, plan działania

Stan na 21.10.2026 · Wojtek Mankowski

Prototyp na pokaz w niedzielę 25.10.2026. Działa na arkuszu testowym, przyjmuje założenia ze SPEC.md: numer zamówienia to same cyfry, jedno zamówienie może obejmować kilka osób, a karta „Bilety” ma 10 testowych wierszy. Każdy kamień milowy kończy się testami. Zadania i testy są założone jako issues na GitHubie, przypisane do kamieni milowych M1–M6.

## Harmonogram

| Dzień | Kamienie milowe |
| --- | --- |
| Środa 21.10 | M1, M2 |
| Czwartek 22.10 | M3 |
| Piątek 23.10 | M4 |
| Sobota 24.10 | M5, M6 |
| Niedziela 25.10 rano | powtórka T1–T13 na telefonach, poprawki, pokaz |

M3 i M4 są od siebie niezależne i mogą iść równolegle, bo strona testuje logikę na zamockowanym API. M6 wymaga ukończenia M3, M4 i M5.

## M1. Arkusz i dane testowe

1. Zebrać od organizatora odpowiedzi na otwarte pytania: czy numer ma stałą liczbę cyfr, gdzie są lista biletów i ksywy (pliki, kolumny). Na pokaz wystarczą założenia ze SPEC.md.
2. Utworzyć arkusz testowy z kartą „Rejestracje”: kolumny A–I według SPEC.md, kolumna D w formacie tekstu, lista rozwijana w G (Na terenie, Wyszedł na stałe), format `yyyy-mm-dd hh:mm` w H i I, zamrożony wiersz 1.
3. Dodać kartę „Bilety” z kolumnami Nr Zamówienia, Imię i nazwisko, Typ Biletu, Ksywa i wpisać 10 wierszy testowych, w tym jedno zamówienie z dwiema osobami i jeden wiersz bez ksywy.
4. Włączyć ochronę zakresów A:E i H:I na karcie „Rejestracje”.

Testy:

- Numer wpisany do kolumny D zostaje tekstem, nie zamienia się na liczbę ani notację wykładniczą.
- Nagłówki obu kart zgadzają się ze SPEC.md znak w znak.
- Osoba bez uprawnień właściciela nie zmieni ręcznie komórek A:E ani H:I, ale może zmienić F i G.
- Lista rozwijana w G przyjmuje tylko „Na terenie” i „Wyszedł na stałe”.

## M2. Repozytorium i narzędzia

1. Założyć projekt Vite z szablonu `react-ts`, dodać Tailwind v4 (`@tailwindcss/vite`), ustawić `base: '/epicroll/'`.
2. Dodać Vitest i Testing Library, skrypt `npm test` i jeden test przykładowy.
3. Utworzyć katalog `apps-script/`, wykonać `clasp login` i `clasp create`, przygotować `appsscript.json` zgodnie z TECH.md.
4. Dodać workflow `deploy.yml` i ustawić źródło Pages na „GitHub Actions”.
5. Dodać `.env.production` z tymczasowym `VITE_API_URL`.

Testy:

- `npm run build` i `npm test` przechodzą lokalnie.
- Push do `main` uruchamia workflow, a strona pod `https://wojciechmankowski.github.io/epicroll/` ładuje się bez błędów 404 dla JS i CSS.
- `clasp push` wysyła pliki, a projekt w edytorze Apps Script ma strefę Europe/Warsaw.

## M3. API w Apps Script

1. Funkcje czyste: walidacja trzech pól, pułapka `website`, usuwanie spacji z numeru. Warunkowy eksport, żeby dało się je testować w Node.
2. Odczyt kolumn A, B i D oraz wykrywanie duplikatu: ten sam numer i to samo „Imię I.”.
3. Wyszukiwanie ksywy i typu biletu na karcie „Bilety” po numerze, imieniu i inicjale nazwiska; brak dopasowania daje pustą ksywę i „brak na liście”.
4. Nadanie Lp (największa wartość w A + 1) i zapis wiersza pod blokadą `LockService`, ze „Status” = „Na terenie” i bieżącą datą w „Data przyjścia”.
5. Funkcja `json()`, `try/catch` wokół `doPost`, logowanie błędów.
6. `SHEET_ID` we Właściwościach skryptu, wdrożenie jako aplikacja internetowa.
7. Wyzwalacz instalowany `onStatusEdit`: „Wyszedł na stałe” w G wpisuje datę do I, „Na terenie” czyści I. Funkcja `installTriggers()` uruchomiona raz.

Testy:

- Vitest dla funkcji z kroku 1: numer z literą odrzucony, numer ze spacjami przyjęty, imię zaczynające się od „=” odrzucone, inicjał z dwóch liter odrzucony.
- Skrypt w Node wywołujący adres `/exec`: pierwsza rejestracja (sukces z ksywą i typem z listy, „Na terenie” i „Data przyjścia” w arkuszu), ten sam numer i imię (`DUPLICATE`, T3), ten sam numer ze spacją i to samo imię (`DUPLICATE`, T4), ten sam numer z inną osobą z zamówienia (sukces, nowe Lp, T11), numer spoza listy (sukces z „brak na liście”, T9), wypełnione `website` (`VALIDATION`).
- Ręcznie w arkuszu: zmiana „Status” na „Wyszedł na stałe” wpisuje „Data wyjścia” (T12), powrót na „Na terenie” ją czyści (T13).
- T7: 25 równoległych żądań daje 25 wierszy z Lp 1–25 bez luk i powtórzeń; skrypt zapisuje czasy odpowiedzi.
- Po testach skrypt czyści wiersze testowe.

## M4. Logika strony (bez wyglądu)

1. `api.ts`: typy kontraktu, `fetch` z ciałem `text/plain`, ponawianie przy `BUSY` i błędzie sieci (2 próby, 1 s i 2 s).
2. `storage.ts`: odczyt i zapis localStorage w `try/catch`.
3. `validation.ts`: te same wyrażenia regularne co w `Code.js`.
4. `App.tsx`: stany `form`, `sending`, `done`, `error` i przejścia między nimi.

Testy (Vitest):

- `api.ts` z zamockowanym `fetch`: dwa razy `BUSY`, potem sukces daje sukces po trzech wywołaniach; `DUPLICATE` daje jedno wywołanie; trzy błędy sieci z rzędu dają `SERVER`.
- `storage.ts` z localStorage, który rzuca wyjątek: funkcje nie przerywają działania strony.
- `validation.ts` przechodzi te same przypadki co testy z M3 (wspólne dane testowe).
- `App.tsx`: wpis w localStorage przy starcie pokazuje ekran z ID bez wywołania API (T2); `VALIDATION` z `field` wraca do formularza.

## M5. Interfejs i teksty

1. `RegistrationForm`: etykiety `<label>`, `inputmode="numeric"` w polu numeru, ukryte pole `website`, komunikaty przy polach z tabeli w SPEC.md.
2. `IdScreen`: numer ID 72 px, „Imię I.”, ksywa, numer zamówienia, typ biletu, instrukcja dla obsługi; przy niedziałającym localStorage prośba o zrzut ekranu.
3. Ekrany błędów z przyciskiem „Spróbuj ponownie”.
4. Informacja o przetwarzaniu danych (N6), na pokaz tekst roboczy.
5. Układ dla telefonu od 360 px, pola i przyciski co najmniej 44 px.

Testy:

- Testy komponentów: przycisk zablokowany w stanie `sending`, każdy kod błędu pokazuje właściwy komunikat, `IdScreen` pokazuje wszystkie pola z odpowiedzi.
- Ręcznie w Chrome DevTools przy 360 px: nic się nie ucina, brak poziomego przewijania.
- Lighthouse, kategoria „Ułatwienia dostępu”: bez błędów etykiet i kontrastu.

## M6. Integracja i publikacja

1. Wpisać produkcyjny adres `/exec` do `.env.production` i opublikować stronę przez workflow.
2. Połączyć opublikowaną stronę z arkuszem testowym.

Testy:

- Pełny zestaw T1–T13 ze SPEC.md na Androidzie i iPhonie, przez opublikowaną stronę.
- T6: tryb samolotowy przy wysyłaniu, potem powrót sieci i „Spróbuj ponownie”.
- T8: tryb prywatny w Safari i Chrome.
