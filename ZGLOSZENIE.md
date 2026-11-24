# Karta zgłoszenia projektu

| Pole | Do uzupełnienia |
|---|---|
| Grupa laboratoryjna | lab/4/Inf-PAI NS |
| Osoba 1 (imię, nazwisko, nr albumu) | Łukasz Gębski, 21269 |
| Osoba 2 (imię, nazwisko, nr albumu) | Artur Sadkowski, 21054 |
| Osoba 3 (imię, nazwisko, nr albumu) | Czarek Strzelczyk, 21003 |
| Temat projektu | Statystyki sportowe ligi – „Parkiet w liczbach”: sezon zasadniczy NBA 2025/26 |
| Odbiorca i cel aplikacji | Fani koszykówki; interaktywne podsumowanie sezonu: przebieg rywalizacji drużyn, porównanie zawodników i mapy rzutów, bez przekopywania się przez tabele statystyk. |
| Źródło danych do wykresów (W3) | Oficjalne statystyki ligi NBA.com/stats (sezon zasadniczy 2025/26), pobrane jednorazowo własnym skryptem Node.js i zapisane jako JSON: wyniki meczów, tabela, statystyki zawodników, współrzędne rzutów. |
| Planowany element Canvas/3D (W4) | Canvas 2D „mapa rzutów” – połowa parkietu z rzutami wybranego zawodnika (celne/niecelne, skuteczność w strefach); pętla requestAnimationFrame, reakcja na mysz, dotyk, klawiaturę i wybór zawodnika na wykresie. |
| Planowane multimedia (W5) | Własny film z naszego meczu 3×3 z własnym odtwarzaczem (bez domyślnych kontrolek), napisami i rozdziałami WebVTT oraz tablicą wyników zsynchronizowaną z czasem filmu. |
| Adres repozytorium | https://github.com/cashrdm/parkiet-w-liczbach |
| Planowany podział pracy | Łukasz: struktura HTML, animacje CSS, galeria, dostępność (W1, W6, W7). Artur: dane, wykresy D3, grafika SVG (W2, W3). Czarek: Canvas, film i odtwarzacz, wdrożenie (W4, W5, W9). Wspólnie: README, Lighthouse, przygotowanie do obrony. |