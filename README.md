# Parkiet w liczbach – sezon NBA 2025/26

**Autorzy:** Łukasz Gębski (21269), Artur Sadkowski (21054), Cezary Strzelczyk (21003)
**Adres wdrożenia:** _(uzupełnimy po wdrożeniu)_
**Repozytorium:** https://github.com/cashrdm/parkiet-w-liczbach
**Przedmiot:** Interaktywna grafika i wizualizacja danych na stronach WWW, AHNS Radom

## Opis
Interaktywne podsumowanie sezonu zasadniczego NBA 2025/26 oparte na oficjalnych statystykach ligi.
Aplikacja pokazuje, jak zmieniał się bilans drużyn w trakcie sezonu, porównuje najlepszych strzelców
i rysuje mapę rzutów wybranego zawodnika na parkiecie. Uzupełnieniem jest skrót naszego własnego meczu 3×3
z własnym odtwarzaczem oraz galeria. Odbiorcy: fani koszykówki, którzy chcą szybko porównać drużyny
i zawodników bez przekopywania się przez tabele statystyk.

## Realizacja wymagań
| Wymaganie | Gdzie w aplikacji | Pliki | Technologie |
|-----------|-------------------|-------|-------------|
| W1 Animacje CSS | _w realizacji_ | `css/animacje.css` | transition, transform 2D/3D, @keyframes, prefers-reduced-motion |
| W2 SVG | _w realizacji_ | `svg/`, `js/infografika.js` | SVG inline, stroke-dashoffset, `<symbol>`/`<use>` |
| W3 Wizualizacja danych | sekcje „Wyścig sezonu” i „Zawodnicy” | `js/wykresy.js`, `data/` | D3.js v7, `.join()`, `transition()` |
| W4 Canvas | sekcja „Mapa rzutów” | `js/scena.js` | Canvas 2D, requestAnimationFrame |
| W5 Multimedia | sekcja „Nasz mecz 3×3” | `js/odtwarzacz.js`, `media/` | HTMLMediaElement, WebVTT, TextTrack |
| W6 Galeria | sekcja „Galeria” | `js/galeria.js`, `css/galeria.css` | `<dialog>`, Pointer Events, View Transitions API |
| W7 Responsywność i dostępność | cała aplikacja | `css/style.css` | mobile-first, ARIA, :focus-visible |
| W8 Jakość kodu | repozytorium | – | moduły ES, osobne pliki na moduły |
| W9 Wdrożenie | GitHub Pages | – | – |

## Struktura plików
Struktura zgodna z zalecaną w instrukcji, z dwiema świadomymi zmianami:
- **osobny plik CSS dla każdego modułu** (`wykresy.css`, `scena.css`, `odtwarzacz.css`, `galeria.css`) –
  każdy moduł rozwija inna osoba, więc nie ma konfliktów w Git;
- **folder `scripts/`** – skrypty Node.js pobierające dane z API NBA. Nie są częścią strony, uruchamiamy je lokalnie.

## Dane i materiały
- **Dane:** NBA.com/stats (oficjalne statystyki ligi), sezon zasadniczy 2025/26. Pobrane skryptem
  `scripts/pobierz-dane.mjs` i `scripts/pobierz-rzuty.mjs`, data pobrania w `data/meta.json`.
  Dane pobieramy raz, bo API NBA nie obsługuje CORS (przeglądarka nie może go zapytać bezpośrednio).
  Wykorzystujemy wyłącznie liczby i fakty, bez logotypów, zdjęć i filmów NBA.
- **Film i zdjęcia:** _(uzupełnimy)_
- **Biblioteki:** _(uzupełnimy)_

## Uruchomienie lokalne
Strona nie wymaga instalacji ani budowania. Potrzebny jest dowolny serwer HTTP
(moduły ES i `fetch` nie działają po otwarciu pliku przez `file://`):
```
npx --yes http-server -c-1 -p 5500
```
i otwarcie http://localhost:5500.

Ponowne pobranie danych (Node.js 18+):
```
node scripts/pobierz-dane.mjs
node scripts/pobierz-rzuty.mjs
```

## Podział pracy
- **Łukasz Gębski** – struktura HTML, animacje CSS, galeria, dostępność (W1, W6, W7)
- **Artur …** – dane NBA, wykresy D3, grafika SVG (W2, W3)
- **Czarek …** – Canvas (mapa rzutów), film i odtwarzacz, wdrożenie (W4, W5, W9)

## Wykorzystanie narzędzi AI
_(uzupełnimy)_

## Wyniki Lighthouse
Performance: .. | Accessibility: .. | Best Practices: .. | SEO: ..

## Znane ograniczenia i dalszy rozwój
_(uzupełnimy)_