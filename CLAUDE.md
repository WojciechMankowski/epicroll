# EPIC ROLL, zasady pracy w repozytorium

## Commity

Claude nie robi commitów ani pushy. Zmiany zostawia jako niezacommitowane w folderze Wojtka; Wojtek sprawdza je lokalnie i sam robi commit. Wyjątek: Wojtek wprost prosi o commit.

## Sposób pracy

1. Każdy kamień milowy ma osobną gałąź od `main`: `m3-api`, `m4-logika-strony`, `m5-interfejs`, `m6-integracja`.
2. Jedno zadanie (issue) naraz. Przed rozpoczęciem zadania Claude opisuje plan i czeka na akceptację Wojtka. Potem Claude zapisuje zmiany w folderze, Wojtek sprawdza je lokalnie i robi commit na gałęzi kamienia. Dopiero potem następne zadanie.
3. Po ostatnim zadaniu kamienia: testy z issue `Mx.T`.
4. Gdy testy przechodzą: PR z gałęzi kamienia do `main`. Claude przygotowuje opis PR (zamknięte issues, wyniki testów).

M1 i M2 powstały przed tą zasadą, M2 jest bezpośrednio na `main`.

## Dokumentacja

- SPEC.md: wymagania, arkusze, kontrakt API, testy akceptacyjne T1–T13
- TECH.md: stos i szczegóły implementacji
- PLAN.md: kamienie milowe M1–M6; zadania są issues na GitHubie

## Sprawdzanie zmian

- `npm test` (Vitest)
- `npm run lint` (oxlint)
- `npm run build`
- `npm run test:api -- <adres /exec>`: testy działającego API (zapisuje wiersze w arkuszu testowym; potem je usunąć)
