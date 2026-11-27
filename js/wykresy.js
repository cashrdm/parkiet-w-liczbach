// Wykres 1 „Wyścig sezonu”: liczba zwycięstw drużyn narastająco, mecz po meczu.
// Etap 2: wybór drużyn (szybkie zestawy + lista), zakres dat (dwa suwaki), animowane przejścia osi i linii.
// D3 jest wczytane w <head> zwykłym skryptem (js/vendor/d3.v7.min.js), więc jest dostępne jako globalne `d3`.

import { wczytaj, bilanseDruzyn, formatDaty } from './dane.js';
import { czasAnimacji } from './config.js';

// Kolory linii: 8 odcieni o kontraście ≥ 4,5:1 z białym tłem (czytelne też jako kolor tekstu etykiet).
// Tyle też drużyn można pokazać naraz – więcej linii byłoby nieczytelne.
const KOLORY = ['#1d4ed8', '#c2410c', '#15803d', '#7e22ce', '#be123c', '#0f766e', '#a16207', '#475569'];
const MAKS_DRUZYN = KOLORY.length;

// Marginesy wewnątrz SVG: miejsce na osie (lewo, dół) i etykiety drużyn (prawo)
const MARGINES = { gora: 12, prawo: 64, dol: 32, lewo: 40 };

// Ile drużyn pokazujemy na starcie (druzyny.json jest posortowany od największej liczby zwycięstw)
const LICZBA_NA_START = 6;
const LICZBA_Z_KONFERENCJI = 5;  // zestawy „Czołówka Wschodu / Zachodu”
const MIN_DNI_ZAKRESU = 7;       // suwaki nie mogą się zbliżyć bardziej niż na tydzień

// ======================================================================
// Wykres 1 – Wyścig sezonu
// ======================================================================
async function wykresSezonu() {
  const sekcja = document.querySelector('#sezon');
  const figura = document.querySelector('#wykres-sezon');
  if (!figura) return;
  const obszar = figura.querySelector('.wykres-obszar');
  const status = sekcja.querySelector('.wykres-status');

  // Trzy pliki naraz: Promise.all czeka, aż wszystkie się wczytają
  const [mecze, druzyny, meta] = await Promise.all([wczytaj('mecze'), wczytaj('druzyny'), wczytaj('meta')]);

  // Bilans narastająco liczymy od razu dla wszystkich 30 drużyn – wybór drużyn tylko je pokazuje/ukrywa
  const bilanse = bilanseDruzyn(mecze, druzyny.map((d) => d.skrot));

  // Wszystkie dni z meczami (posortowane) – po nich „chodzą” suwaki zakresu dat
  const dni = [...new Set(mecze.map((m) => m.data))].sort().map((d) => new Date(d));

  // ---------- Stan wykresu ----------
  const stan = {
    wybrane: [],              // skróty widocznych drużyn, w kolejności dodania
    kolory: new Map(),        // skrót → kolor (kolor zostaje przy drużynie, dopóki jej nie odznaczymy)
    od: 0,                    // indeks pierwszego dnia zakresu w tablicy dni
    do: dni.length - 1,       // indeks ostatniego dnia
  };

  // ---------- Skale ----------
  const x = d3.scaleTime();
  const y = d3.scaleLinear();

  // ---------- Szkielet SVG (tworzony raz) ----------
  const svg = d3.select(obszar).append('svg')
    .attr('role', 'img')
    .attr('aria-labelledby', 'sezon-svg-tytul sezon-svg-opis');
  svg.append('title').attr('id', 'sezon-svg-tytul').text('Wyścig sezonu: zwycięstwa drużyn narastająco');
  const opis = svg.append('desc').attr('id', 'sezon-svg-opis');

  // clipPath: linie rysujemy w całości, ale widać tylko część wewnątrz pola wykresu.
  // Dzięki temu przy zmianie zakresu dat linia ma zawsze tyle samo punktów i D3 może ją płynnie „przesunąć”.
  const przyciecie = svg.append('clipPath').attr('id', 'sezon-przyciecie').append('rect');

  const osX = svg.append('g').attr('class', 'os os-x');
  const osY = svg.append('g').attr('class', 'os os-y');
  const grupaLinii = svg.append('g').attr('class', 'linie').attr('clip-path', 'url(#sezon-przyciecie)');
  const grupaEtykiet = svg.append('g').attr('class', 'etykiety');

  let ostatniaSzerokosc = 0;

  /** Liczba zwycięstw drużyny w danym dniu = ostatni punkt z datą ≤ dzień (bisekcja w posortowanej tablicy). */
  const szukajDaty = d3.bisector((p) => p.data).right;
  function wygraneWDniu(skrot, dzien) {
    const punkty = bilanse.get(skrot);
    const i = szukajDaty(punkty, dzien) - 1;
    return i >= 0 ? punkty[i].wygrane : 0;
  }

  // ---------- Rysowanie / aktualizacja ----------
  // Ta sama funkcja rysuje wykres pierwszy raz i aktualizuje go po każdej zmianie (rozmiar, drużyny, daty).
  function rysuj({ animuj = true } = {}) {
    const szer = obszar.clientWidth;
    const wys = Math.round(Math.min(440, Math.max(300, szer * 0.6)));
    ostatniaSzerokosc = szer;
    const czas = animuj ? czasAnimacji() : 0; // 0 ms przy prefers-reduced-motion
    const [dzienOd, dzienDo] = [dni[stan.od], dni[stan.do]];

    // SVG ma dokładnie szerokość kontenera: 1 jednostka = 1 piksel, więc tekst ma zawsze tę samą wielkość
    svg.attr('viewBox', `0 0 ${szer} ${wys}`).attr('width', szer).attr('height', wys);
    przyciecie
      .attr('x', MARGINES.lewo).attr('y', 0)
      .attr('width', szer - MARGINES.lewo - MARGINES.prawo + 3) // +3: grubość linii na prawej krawędzi
      .attr('height', wys - MARGINES.dol);

    // Skale: oś X = wybrany zakres dat; oś Y = od najmniejszej liczby zwycięstw na początku zakresu
    // do największej na końcu – wykres „przybliża” się do wybranego fragmentu wyścigu.
    const naPoczatku = stan.wybrane.map((s) => wygraneWDniu(s, dzienOd));
    const naKoncu = stan.wybrane.map((s) => wygraneWDniu(s, dzienDo));
    x.domain([dzienOd, dzienDo]).range([MARGINES.lewo, szer - MARGINES.prawo]);
    y.domain(stan.wybrane.length ? [d3.min(naPoczatku), d3.max(naKoncu)] : [0, 10]).nice()
      .range([wys - MARGINES.dol, MARGINES.gora]); // odwrotnie: mniej zwycięstw na dole

    // Osie – przy zmianie zakresu przesuwają się płynnie (transition na grupie osi)
    osX.attr('transform', `translate(0, ${wys - MARGINES.dol})`)
      .transition().duration(czas)
      .call(d3.axisBottom(x)
        .ticks(szer < 500 ? 4 : 7)
        .tickFormat((d) => d.toLocaleDateString('pl-PL', { month: 'short', day: stan.do - stan.od < 60 ? 'numeric' : undefined })));
    osY.attr('transform', `translate(${MARGINES.lewo}, 0)`)
      .transition().duration(czas)
      .call(d3.axisLeft(y)
        .ticks(6)
        .tickSize(-(szer - MARGINES.lewo - MARGINES.prawo))); // ujemna długość kresek = linie siatki

    // Dane do narysowania: jedna seria na wybraną drużynę
    const serie = stan.wybrane.map((skrot) => ({ skrot, punkty: bilanse.get(skrot) }));

    // Generator linii: tablica punktów → atrybut d ścieżki. curveStepAfter = „schodki” (bilans zmienia się skokowo).
    const linia = d3.line()
      .x((p) => x(p.data))
      .y((p) => y(p.wygrane))
      .curve(d3.curveStepAfter);

    // .join() łączy dane z elementami po kluczu (skrót drużyny):
    // enter = nowa drużyna → nowa linia, update = istniejąca → przesuwa się do nowych skal, exit = odznaczona → znika
    grupaLinii.selectAll('path')
      .data(serie, (s) => s.skrot)
      .join(
        (enter) => enter.append('path')
          .attr('stroke', (s) => stan.kolory.get(s.skrot))
          .attr('d', (s) => linia(s.punkty))
          .call(animujRysowanie, czas),
        (update) => update.transition().duration(czas).attr('d', (s) => linia(s.punkty)),
        (exit) => exit.transition().duration(czas).attr('opacity', 0).remove(),
      );

    // Etykiety: skrót i liczba zwycięstw na KOŃCU wybranego zakresu
    const etykiety = stan.wybrane.map((skrot) => {
      const wygrane = wygraneWDniu(skrot, dzienDo);
      return { skrot, wygrane, tekst: `${skrot} ${wygrane}`, x: x(dzienDo) + 6, y: y(wygrane) };
    });
    rozsunEtykiety(etykiety, 14);

    grupaEtykiet.selectAll('text')
      .data(etykiety, (e) => e.skrot)
      .join(
        (enter) => enter.append('text')
          .attr('fill', (e) => stan.kolory.get(e.skrot))
          .attr('x', (e) => e.x)
          .attr('y', (e) => e.y)
          .attr('opacity', 0)
          .text((e) => e.tekst)
          .call((t) => t.transition().delay(czas).duration(czas / 2).attr('opacity', 1)),
        (update) => update
          .text((e) => e.tekst)
          .transition().duration(czas).attr('x', (e) => e.x).attr('y', (e) => e.y),
        (exit) => exit.remove(),
      );

    // Opis dla czytników ekranu: w SVG (desc) i w regionie aria-live (ogłaszany po każdej zmianie)
    const zakres = `od ${formatDaty(dzienOd)} do ${formatDaty(dzienDo)}`;
    if (etykiety.length) {
      const lider = etykiety.reduce((a, b) => (a.wygrane >= b.wygrane ? a : b));
      const tekst = `Zwycięstwa narastająco ${zakres}. Drużyny: ${etykiety.map((e) => e.tekst).join(', ')}. Prowadzi ${lider.tekst}.`;
      opis.text(`Wykres liniowy. ${tekst}`);
      status.textContent = tekst;
    } else {
      opis.text('Wykres liniowy bez wybranych drużyn.');
      status.textContent = 'Nie wybrano żadnej drużyny. Zaznacz co najmniej jedną.';
    }
  }

  // ======================================================================
  // Sterowanie: wybór drużyn
  // ======================================================================
  const pola = new Map(); // skrót → <input type="checkbox">
  const licznik = sekcja.querySelector('.wykres-licznik');

  // Lista wszystkich drużyn w dwóch grupach (konferencje) – checkboxy generujemy z danych
  const kontenerListy = sekcja.querySelector('.wykres-konferencje');
  for (const konferencja of ['Wschód', 'Zachód']) {
    const grupa = document.createElement('fieldset');
    grupa.innerHTML = `<legend>${konferencja}</legend>`;
    for (const d of druzyny.filter((t) => t.konferencja === konferencja)) {
      const etykieta = document.createElement('label');
      etykieta.innerHTML = `<input type="checkbox" value="${d.skrot}"> <span class="probka" aria-hidden="true"></span>
        ${d.skrot} <span class="wykres-bilans">${d.wygrane}–${d.porazki}</span>`;
      const pole = etykieta.querySelector('input');
      pole.addEventListener('change', () => przelaczDruzyne(d.skrot, pole.checked));
      pola.set(d.skrot, pole);
      grupa.append(etykieta);
    }
    kontenerListy.append(grupa);
  }

  /** Dodaje lub usuwa drużynę z wykresu. Kolor bierzemy z pierwszego wolnego miejsca palety. */
  function przelaczDruzyne(skrot, zaznaczona, { odswiez = true } = {}) {
    if (zaznaczona && !stan.wybrane.includes(skrot) && stan.wybrane.length < MAKS_DRUZYN) {
      const zajete = new Set(stan.kolory.values());
      stan.kolory.set(skrot, KOLORY.find((k) => !zajete.has(k)));
      stan.wybrane.push(skrot);
    } else if (!zaznaczona) {
      stan.wybrane = stan.wybrane.filter((s) => s !== skrot);
      stan.kolory.delete(skrot);
    }
    if (odswiez) {
      odswiezPola();
      rysuj();
    }
  }

  /** Ustawia cały zestaw drużyn naraz (szybkie przyciski). */
  function ustawZestaw(skroty) {
    for (const s of [...stan.wybrane]) przelaczDruzyne(s, false, { odswiez: false });
    for (const s of skroty) przelaczDruzyne(s, true, { odswiez: false });
    odswiezPola();
    rysuj();
  }

  /** Checkboxy pokazują stan: zaznaczenie, kolor próbki; po wybraniu 8 drużyn pozostałe są zablokowane. */
  function odswiezPola() {
    const pelno = stan.wybrane.length >= MAKS_DRUZYN;
    for (const [skrot, pole] of pola) {
      pole.checked = stan.wybrane.includes(skrot);
      pole.disabled = pelno && !pole.checked;
      pole.parentElement.style.setProperty('--kolor-druzyny', stan.kolory.get(skrot) || 'transparent');
    }
    licznik.textContent = `(${stan.wybrane.length} z maks. ${MAKS_DRUZYN})`;
  }

  // Szybkie zestawy
  const czolowka = (konf) => druzyny.filter((d) => d.konferencja === konf).slice(0, LICZBA_Z_KONFERENCJI).map((d) => d.skrot);
  const ZESTAWY = {
    najlepsze: () => druzyny.slice(0, LICZBA_NA_START).map((d) => d.skrot),
    wschod: () => czolowka('Wschód'),
    zachod: () => czolowka('Zachód'),
    brak: () => [],
  };
  sekcja.querySelectorAll('[data-zestaw]').forEach((przycisk) => {
    przycisk.addEventListener('click', () => ustawZestaw(ZESTAWY[przycisk.dataset.zestaw]()));
  });

  // ======================================================================
  // Sterowanie: zakres dat (dwa suwaki <input type="range"> po indeksach dni)
  // ======================================================================
  const suwakOd = sekcja.querySelector('#sezon-od');
  const suwakDo = sekcja.querySelector('#sezon-do');
  for (const suwak of [suwakOd, suwakDo]) {
    suwak.min = 0;
    suwak.max = dni.length - 1;
    suwak.step = 1;
  }
  suwakOd.value = stan.od;
  suwakDo.value = stan.do;

  /** Pilnuje, żeby „od” było przed „do” (min. tydzień) i pokazuje daty obok suwaków. */
  function czytajSuwaki(ktory) {
    let od = Number(suwakOd.value);
    let doIdx = Number(suwakDo.value);
    if (doIdx - od < MIN_DNI_ZAKRESU) {
      if (ktory === suwakOd) od = Math.max(0, doIdx - MIN_DNI_ZAKRESU);
      else doIdx = Math.min(dni.length - 1, od + MIN_DNI_ZAKRESU);
    }
    suwakOd.value = od;
    suwakDo.value = doIdx;
    stan.od = od;
    stan.do = doIdx;
    // aria-valuetext: czytnik ekranu przeczyta datę zamiast numeru pozycji suwaka
    for (const [suwak, idx] of [[suwakOd, od], [suwakDo, doIdx]]) {
      const tekst = formatDaty(dni[idx]);
      suwak.setAttribute('aria-valuetext', tekst);
      sekcja.querySelector(`output[for="${suwak.id}"]`).textContent = tekst;
    }
  }

  // 'input' – w trakcie przesuwania tylko podpis daty (szybko); 'change' – po puszczeniu: animowany wykres
  for (const suwak of [suwakOd, suwakDo]) {
    suwak.addEventListener('input', () => czytajSuwaki(suwak));
    suwak.addEventListener('change', () => {
      czytajSuwaki(suwak);
      rysuj();
    });
  }

  // ---------- Start ----------
  czytajSuwaki();
  ustawZestaw(ZESTAWY.najlepsze());

  // Podpis ze źródłem danych – z meta.json, żeby data pobrania zawsze się zgadzała
  figura.querySelector('.wykres-zrodlo').textContent =
    `Liczba zwycięstw narastająco w wybranym okresie. `
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