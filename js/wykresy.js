// W3 – wizualizacja danych (D3.js v7) · odpowiada: Artur
// Wykres 1 „Wyścig sezonu”: liczba zwycięstw drużyn narastająco, mecz po meczu.
// D3 jest wczytane w <head> zwykłym skryptem (js/vendor/d3.v7.min.js), więc jest dostępne jako globalne `d3`.

import { wczytaj, bilanseDruzyn, formatDaty } from './dane.js';
import { czasAnimacji } from './config.js';

// Kolory linii: 8 odcieni o kontraście ≥ 4,5:1 z białym tłem (czytelne też jako kolor tekstu etykiet)
const KOLORY = ['#1d4ed8', '#c2410c', '#15803d', '#7e22ce', '#be123c', '#0f766e', '#a16207', '#475569'];

// Marginesy wewnątrz SVG: miejsce na osie (lewo, dół) i etykiety drużyn (prawo)
const MARGINES = { gora: 12, prawo: 64, dol: 32, lewo: 40 };

// Ile drużyn pokazujemy na starcie (druzyny.json jest posortowany od największej liczby zwycięstw)
const LICZBA_NA_START = 6;

// ======================================================================
// Wykres 1 – Wyścig sezonu
// ======================================================================
async function wykresSezonu() {
  const figura = document.querySelector('#wykres-sezon');
  if (!figura) return;
  const obszar = figura.querySelector('.wykres-obszar');

  // Trzy pliki naraz: Promise.all czeka, aż wszystkie się wczytają
  const [mecze, druzyny, meta] = await Promise.all([wczytaj('mecze'), wczytaj('druzyny'), wczytaj('meta')]);

  // Bilans narastająco liczymy od razu dla wszystkich 30 drużyn – wybór drużyn tylko je pokazuje/ukrywa
  const bilanse = bilanseDruzyn(mecze, druzyny.map((d) => d.skrot));
  const wszystkiePunkty = [...bilanse.values()].flat();

  // Stan wykresu: które drużyny są widoczne
  const wybrane = druzyny.slice(0, LICZBA_NA_START).map((d) => d.skrot);

  // ---------- Skale ----------
  // Dziedzina (domain) = zakres danych; zakres (range) = piksele, ustawiamy w rysuj(), bo zależy od szerokości
  const x = d3.scaleTime().domain(d3.extent(wszystkiePunkty, (p) => p.data));
  const y = d3.scaleLinear().domain([0, d3.max(wszystkiePunkty, (p) => p.wygrane)]).nice();
  const kolor = d3.scaleOrdinal(KOLORY); // skrót drużyny → kolor (przydziela kolejne kolory z listy)

  // ---------- Szkielet SVG (tworzony raz) ----------
  const svg = d3.select(obszar).append('svg')
    .attr('role', 'img')
    .attr('aria-labelledby', 'sezon-svg-tytul sezon-svg-opis');
  svg.append('title').attr('id', 'sezon-svg-tytul').text('Wyścig sezonu: zwycięstwa drużyn narastająco');
  const opis = svg.append('desc').attr('id', 'sezon-svg-opis');

  const osX = svg.append('g').attr('class', 'os os-x');
  const osY = svg.append('g').attr('class', 'os os-y');
  const grupaLinii = svg.append('g').attr('class', 'linie');
  const grupaEtykiet = svg.append('g').attr('class', 'etykiety');

  let ostatniaSzerokosc = 0;

  // ---------- Rysowanie / aktualizacja ----------
  // Ta sama funkcja rysuje wykres pierwszy raz i aktualizuje go po każdej zmianie (rozmiar, wybór drużyn).
  function rysuj({ animuj = true } = {}) {
    const szer = obszar.clientWidth;
    const wys = Math.round(Math.min(440, Math.max(300, szer * 0.6)));
    ostatniaSzerokosc = szer;
    const czas = animuj ? czasAnimacji() : 0; // 0 ms przy prefers-reduced-motion

    // SVG ma dokładnie szerokość kontenera: 1 jednostka = 1 piksel, więc tekst ma zawsze tę samą wielkość
    svg.attr('viewBox', `0 0 ${szer} ${wys}`).attr('width', szer).attr('height', wys);
    x.range([MARGINES.lewo, szer - MARGINES.prawo]);
    y.range([wys - MARGINES.dol, MARGINES.gora]); // odwrotnie: 0 zwycięstw na dole

    // Osie: d3.axis* tworzy linie i podpisy na podstawie skali
    osX.attr('transform', `translate(0, ${wys - MARGINES.dol})`)
      .call(d3.axisBottom(x)
        .ticks(szer < 500 ? 4 : 7)
        .tickFormat((d) => d.toLocaleDateString('pl-PL', { month: 'short' })));
    osY.attr('transform', `translate(${MARGINES.lewo}, 0)`)
      .call(d3.axisLeft(y)
        .ticks(6)
        .tickSize(-(szer - MARGINES.lewo - MARGINES.prawo))); // ujemna długość kresek = linie siatki w poprzek wykresu

    // Dane do narysowania: jedna seria na wybraną drużynę
    const serie = wybrane.map((skrot) => ({ skrot, punkty: bilanse.get(skrot) }));

    // Generator linii: zamienia tablicę punktów na atrybut d ścieżki SVG.
    // curveStepAfter = „schodki”: bilans zmienia się skokowo po meczu, a nie płynnie między meczami.
    const linia = d3.line()
      .x((p) => x(p.data))
      .y((p) => y(p.wygrane))
      .curve(d3.curveStepAfter);

    // .join() łączy dane z elementami po kluczu (skrót drużyny):
    // enter = nowa drużyna → nowa linia, update = istniejąca → przeliczona, exit = usunięta → znika
    grupaLinii.selectAll('path')
      .data(serie, (s) => s.skrot)
      .join(
        (enter) => enter.append('path')
          .attr('stroke', (s) => kolor(s.skrot))
          .attr('d', (s) => linia(s.punkty))
          .call(animujRysowanie, czas),
        (update) => update.transition().duration(czas).attr('d', (s) => linia(s.punkty)),
        (exit) => exit.transition().duration(czas).attr('opacity', 0).remove(),
      );

    // Etykiety na końcu linii: skrót drużyny i końcowa liczba zwycięstw
    const etykiety = serie.map((s) => {
      const koniec = s.punkty[s.punkty.length - 1];
      return { skrot: s.skrot, wygrane: koniec.wygrane, tekst: `${s.skrot} ${koniec.wygrane}`, x: x(koniec.data) + 6, y: y(koniec.wygrane) };
    });
    rozsunEtykiety(etykiety, 14);

    grupaEtykiet.selectAll('text')
      .data(etykiety, (e) => e.skrot)
      .join(
        (enter) => enter.append('text')
          .attr('fill', (e) => kolor(e.skrot))
          .attr('x', (e) => e.x)
          .attr('y', (e) => e.y)
          .attr('opacity', 0)
          .text((e) => e.tekst)
          .call((t) => t.transition().delay(czas).duration(czas / 2).attr('opacity', 1)),
        (update) => update.transition().duration(czas).attr('x', (e) => e.x).attr('y', (e) => e.y),
        (exit) => exit.remove(),
      );

    // Opis dla czytników ekranu (zamiast „obrazka”, którego nie widzą)
    const [od, doDaty] = x.domain();
    const lider = etykiety.reduce((a, b) => (a.wygrane >= b.wygrane ? a : b));
    opis.text(`Wykres liniowy liczby zwycięstw narastająco od ${formatDaty(od)} do ${formatDaty(doDaty)}. `
      + `Drużyny: ${etykiety.map((e) => e.tekst).join(', ')}. Najwięcej zwycięstw: ${lider.tekst}.`);
  }

  rysuj();

  // Podpis ze źródłem danych – z meta.json, żeby data pobrania zawsze się zgadzała
  figura.querySelector('.wykres-zrodlo').textContent =
    `Liczba zwycięstw narastająco, ${LICZBA_NA_START} drużyn z najlepszym bilansem. `
    + `Źródło: ${meta.zrodlo}, ${meta.rodzaj} ${meta.sezon}, pobrano ${new Date(meta.pobrano).toLocaleDateString('pl-PL')}.`;

  // Zmiana szerokości okna / obrót telefonu → przerysowanie bez animacji
  new ResizeObserver(() => {
    if (obszar.clientWidth !== ostatniaSzerokosc) rysuj({ animuj: false });
  }).observe(obszar);
}

// ======================================================================
// Funkcje pomocnicze
// ======================================================================

/**
 * Animacja „rysowania” linii: kreska o długości całej ścieżki przesunięta o tę długość jest niewidoczna,
 * a przejście przesunięcia do 0 odsłania ją od początku do końca. (Ten sam trik co w logo SVG.)
 */
function animujRysowanie(sciezki, czas) {
  if (!czas) return;
  sciezki.each(function rysujJedna() {
    const dlugosc = this.getTotalLength();
    d3.select(this)
      .attr('stroke-dasharray', `${dlugosc} ${dlugosc}`)
      .attr('stroke-dashoffset', dlugosc)
      .transition().duration(czas * 2).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0)
      .on('end', function poKoncu() { d3.select(this).attr('stroke-dasharray', null); });
  });
}

/**
 * Rozsuwa etykiety w pionie, żeby się nie nakładały (drużyny z podobnym bilansem kończą blisko siebie).
 * Sortujemy od góry i każdą kolejną przesuwamy w dół, jeśli jest bliżej niż `odstep` pikseli od poprzedniej.
 */
function rozsunEtykiety(etykiety, odstep) {
  const posortowane = [...etykiety].sort((a, b) => a.y - b.y);
  for (let i = 1; i < posortowane.length; i += 1) {
    const minY = posortowane[i - 1].y + odstep;
    if (posortowane[i].y < minY) posortowane[i].y = minY;
  }
}

// Start. Błąd jednego wykresu nie może zatrzymać reszty strony – łapiemy go i pokazujemy komunikat.
wykresSezonu().catch((blad) => {
  console.error(blad);
  const obszar = document.querySelector('#wykres-sezon .wykres-obszar');
  if (obszar) obszar.textContent = 'Nie udało się wczytać danych wykresu.';
});