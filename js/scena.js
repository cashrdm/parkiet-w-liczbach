// W4 – Canvas 2D: mapa rzutów zawodnika · odpowiada: Czarek
// Etap 1: rysowanie połowy parkietu, ostrość na ekranach o dużej gęstości pikseli (devicePixelRatio).
// Etap 2: rzuty wybranego zawodnika z data/rzuty.json, animacja pojawiania w pętli requestAnimationFrame.
// Etap 3: strefy rzutowe, hit-test pod kursorem, dymek ze skutecznością, pulsowanie wskazanej strefy.

import { wczytaj, formatProcent, odmiana } from './dane.js';
import { mniejRuchu } from './config.js';

// ---------- Wymiary boiska ----------
// Używamy tych samych jednostek co dane NBA: 1/10 stopy, kosz w punkcie (0, 0).
// Linia końcowa jest 4,75 stopy za koszem (y = -47,5), linia środkowa 42,25 stopy przed nim (y = 422,5).
const BOISKO = { lewo: -250, prawo: 250, gora: -47.5, dol: 422.5 };
const SZEROKOSC_BOISKA = BOISKO.prawo - BOISKO.lewo; // 500 = 50 stóp
const WYSOKOSC_BOISKA = BOISKO.dol - BOISKO.gora;    // 470 = 47 stóp

// Linia za 3 punkty: łuk o promieniu 23,75 stopy, w rogach prosta 22 stopy od kosza
const LUK_3PKT = 237.5;
const ROG_3PKT = 220;
const Y_KONCA_ROGU = Math.sqrt(LUK_3PKT ** 2 - ROG_3PKT ** 2); // ≈ 89,5 – tu prosta przechodzi w łuk (Pitagoras)

const KOLORY = {
  parkiet: '#f1dcb4',
  trumna: '#e6c28c',
  linie: '#5c3d1e',
  obrecz: '#d9480f',
  celny: '#1f7a35',
  niecelny: '#c92a2a',
};

// Animacja pojawiania się rzutów (ms): wszystkie rzuty „spadają” na parkiet w ciągu CZAS_POJAWIANIA,
// a każdy pojedynczy rzut wpada w ciągu CZAS_SPADANIA.
const CZAS_POJAWIANIA = 1500;
const CZAS_SPADANIA = 300;
const PROMIEN_RZUTU = 4; // w jednostkach boiska (0,4 stopy)

// ---------- Stan modułu ----------
// Wszystko, co się zmienia, trzymamy w jednym obiekcie – łatwo sprawdzić w konsoli i wyjaśnić.
const stan = {
  zawodnicy: [],      // z zawodnicy.json
  rzuty: {},          // z rzuty.json: id zawodnika → [[x, y, celny, kwarta], …]
  zawodnik: null,     // aktualnie wybrany zawodnik
  widoczne: [],       // rzuty, które rysujemy: { x, y, celny, kwarta, strefa }
  statystykiStref: new Map(), // nazwa strefy → { proby, celne }
  podswietlona: null, // strefa pod kursorem (null = żadna)
  naEkranie: true,    // czy mapa jest widoczna (IntersectionObserver)
  startAnimacji: 0,   // czas (performance.now) rozpoczęcia animacji pojawiania
  ramka: null,        // numer zaplanowanej klatki requestAnimationFrame (null = pętla nie działa)
};

// ---------- Canvas ----------
const canvas = document.getElementById('parkiet');
const ctx = canvas ? canvas.getContext('2d') : null;
const wybor = document.getElementById('scena-zawodnik');
const podsumowanie = document.querySelector('.scena-podsumowanie');
const dymek = document.querySelector('.scena-dymek');

// Ile pikseli CSS przypada na 1 jednostkę boiska (np. canvas 500 px szerokości → 1 px na jednostkę)
let skala = 1;

/**
 * Dopasowuje rozdzielczość płótna do jego rozmiaru na ekranie.
 * Canvas ma dwa rozmiary: wyświetlany (CSS) i wewnętrzny (atrybuty width/height = liczba pikseli bitmapy).
 * Na ekranie z devicePixelRatio = 2 (telefony, Retina) 1 px CSS to 2×2 piksele fizyczne,
 * więc bitmapa musi być 2× większa – inaczej obraz jest rozmyty.
 */
function dopasujRozmiar() {
  const dpr = window.devicePixelRatio || 1;
  const szerokoscCSS = canvas.clientWidth;
  const wysokoscCSS = canvas.clientHeight; // wynika z CSS: aspect-ratio 500 / 470

  canvas.width = Math.round(szerokoscCSS * dpr);
  canvas.height = Math.round(wysokoscCSS * dpr);
  skala = szerokoscCSS / SZEROKOSC_BOISKA;

  // Jedna transformacja zamiast przeliczania każdego punktu:
  //   piksel = (współrzędna boiska − lewy/górny brzeg) × skala × dpr
  // Od teraz rysujemy wprost w jednostkach boiska, np. ctx.arc(0, 0, 7.5, …) to obręcz kosza.
  ctx.setTransform(
    skala * dpr, 0,
    0, skala * dpr,
    -BOISKO.lewo * skala * dpr,
    -BOISKO.gora * skala * dpr,
  );
}

/** Rysuje połowę parkietu: tło, trumnę, linie, łuk za 3 pkt, kosz. */
function rysujBoisko() {
  // tło
  ctx.fillStyle = KOLORY.parkiet;
  ctx.fillRect(BOISKO.lewo, BOISKO.gora, SZEROKOSC_BOISKA, WYSOKOSC_BOISKA);

  // „trumna” (pole 3 sekund): 16 stóp szerokości, 19 stóp od linii końcowej
  ctx.fillStyle = KOLORY.trumna;
  ctx.fillRect(-80, BOISKO.gora, 160, 190);

  ctx.strokeStyle = KOLORY.linie;
  ctx.lineWidth = 2; // w jednostkach boiska (0,2 stopy) – skaluje się razem z boiskiem
  ctx.beginPath();

  // obrys połowy boiska i trumny
  ctx.rect(BOISKO.lewo, BOISKO.gora, SZEROKOSC_BOISKA, WYSOKOSC_BOISKA);
  ctx.rect(-80, BOISKO.gora, 160, 190);

  // koło rzutów wolnych (promień 6 stóp, środek na linii rzutów wolnych)
  ctx.moveTo(60, 142.5);
  ctx.arc(0, 142.5, 60, 0, Math.PI * 2);

  // półkole „bez szarży” pod koszem (promień 4 stopy) – kąty 0…π to dolna połowa, czyli w stronę boiska
  ctx.moveTo(40, 0);
  ctx.arc(0, 0, 40, 0, Math.PI);

  // tablica: 6 stóp szerokości, 4 stopy od linii końcowej (y = -47,5 + 40 = -7,5)
  ctx.moveTo(-30, -7.5);
  ctx.lineTo(30, -7.5);

  // linia za 3 pkt: prosta w lewym rogu → łuk → prosta w prawym rogu
  const katKoncaRogu = Math.atan2(Y_KONCA_ROGU, ROG_3PKT);
  ctx.moveTo(-ROG_3PKT, BOISKO.gora);
  ctx.lineTo(-ROG_3PKT, Y_KONCA_ROGU);
  ctx.arc(0, 0, LUK_3PKT, Math.PI - katKoncaRogu, katKoncaRogu, true); // true = przeciwnie do zegara, przez dół
  ctx.lineTo(ROG_3PKT, BOISKO.gora);

  // połowa koła środkowego na linii środkowej (wygięta w stronę kosza)
  ctx.moveTo(60, BOISKO.dol);
  ctx.arc(0, BOISKO.dol, 60, 0, Math.PI, true);

  ctx.stroke();

  // obręcz kosza (średnica 18 cali = 1,5 stopy)
  ctx.strokeStyle = KOLORY.obrecz;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------- Strefy rzutowe ----------
// Ta sama funkcja przypisuje strefę każdemu rzutowi (statystyki) i punktowi pod kursorem (hit-test).
// Kąt liczymy od osi „prosto przed koszem”: ujemny = lewa strona mapy, dodatni = prawa.

/**
 * Zwraca nazwę strefy dla punktu (x, y) w jednostkach boiska albo null (rzut zza połowy).
 */
function strefa(x, y) {
  if (y > BOISKO.dol) return null;

  const odleglosc = Math.hypot(x, y);               // odległość od kosza (Pitagoras)
  const kat = (Math.atan2(x, y) * 180) / Math.PI;   // 0° = prosto przed koszem
  let strona = 'środek';
  if (kat < -30) strona = 'lewa strona';
  if (kat > 30) strona = 'prawa strona';

  if (odleglosc <= 40) return 'Pod koszem';
  if (Math.abs(x) <= 80 && y <= 142.5) return 'Trumna';
  // rogi sprawdzamy przed półdystansem: tam linia za 3 pkt jest bliżej kosza (22 stopy, nie 23,75)
  if (Math.abs(x) >= ROG_3PKT && y <= Y_KONCA_ROGU) return x < 0 ? 'Lewy róg, 3 pkt' : 'Prawy róg, 3 pkt';
  if (odleglosc < LUK_3PKT) return `Półdystans, ${strona}`;
  return `Za 3 pkt, ${strona}`;
}

/** Liczy próby i celne rzuty w każdej strefie: Map nazwa → { proby, celne }. */
function policzStrefy(rzuty) {
  const strefy = new Map();
  for (const r of rzuty) {
    if (!r.strefa) continue;
    const s = strefy.get(r.strefa) || { proby: 0, celne: 0 };
    s.proby += 1;
    s.celne += r.celny;
    strefy.set(r.strefa, s);
  }
  return strefy;
}

// ---------- Rysowanie ----------

/**
 * Rysuje jeden rzut. postep: 0 = jeszcze nie spadł, 1 = leży na parkiecie.
 * W trakcie spadania znacznik jest większy i półprzezroczysty, potem „ląduje” w swoim rozmiarze.
 * mnoznik – dodatkowe powiększenie (pulsowanie podświetlonej strefy), alfa – przezroczystość.
 */
function rysujRzut(x, y, celny, postep, mnoznik = 1, alfa = 0.75) {
  const r = PROMIEN_RZUTU * (1 + (1 - postep) * 2) * mnoznik; // od 3× większego do normalnego
  ctx.globalAlpha = alfa * postep;

  if (celny) {
    // celny: wypełnione kółko
    ctx.fillStyle = KOLORY.celny;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // niecelny: krzyżyk
    ctx.strokeStyle = KOLORY.niecelny;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.moveTo(x + r, y - r);
    ctx.lineTo(x - r, y + r);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * Rysuje całą scenę: boisko i rzuty.
 * @param {number} uplynelo – ile ms minęło od początku animacji (Infinity = wszystko już leży)
 * @param {number} teraz – aktualny czas, potrzebny do pulsowania podświetlonej strefy
 */
function rysujScene(uplynelo = Infinity, teraz = 0) {
  rysujBoisko();

  // Pulsowanie: sinus daje płynne wahanie od -1 do 1, czyli rozmiar od 1,0× do 1,6×.
  // Przy prefers-reduced-motion – stałe powiększenie bez ruchu.
  const puls = mniejRuchu() ? 1.3 : 1.3 + 0.3 * Math.sin(teraz / 180);

  const liczba = stan.widoczne.length;
  for (let i = 0; i < liczba; i += 1) {
    // rzut nr i zaczyna spadać po czasie proporcjonalnym do swojej pozycji na liście
    const opoznienie = (i / liczba) * CZAS_POJAWIANIA;
    const postep = Math.min(1, (uplynelo - opoznienie) / CZAS_SPADANIA);
    if (postep <= 0) break; // kolejne rzuty mają jeszcze większe opóźnienie – kończymy pętlę

    const r = stan.widoczne[i];
    if (stan.podswietlona === null) {
      rysujRzut(r.x, r.y, r.celny, postep);
    } else if (r.strefa === stan.podswietlona) {
      rysujRzut(r.x, r.y, r.celny, postep, puls, 0.95); // rzuty ze wskazanej strefy: wyraźne i pulsują
    } else {
      rysujRzut(r.x, r.y, r.celny, postep, 1, 0.15);    // pozostałe: przygaszone
    }
  }
}

/**
 * Pętla animacji. Przeglądarka wywołuje ją przed każdym odświeżeniem ekranu (zwykle 60 razy na sekundę)
 * i podaje aktualny czas. Pętla działa tylko wtedy, gdy coś się rusza:
 *   - rzuty jeszcze spadają, albo
 *   - jakaś strefa jest podświetlona (pulsuje),
 * i tylko gdy mapa jest na ekranie. W przeciwnym razie nie prosimy o kolejną klatkę – zero obciążenia.
 */
function petla(teraz) {
  stan.ramka = null;
  const uplynelo = teraz - stan.startAnimacji;
  rysujScene(uplynelo, teraz);

  const trwaPojawianie = uplynelo < CZAS_POJAWIANIA + CZAS_SPADANIA;
  const pulsuje = stan.podswietlona !== null && !mniejRuchu();
  if (stan.naEkranie && (trwaPojawianie || pulsuje)) {
    stan.ramka = requestAnimationFrame(petla);
  }
}

/** Uruchamia pętlę, jeśli jeszcze nie działa (nigdy dwie pętle naraz). */
function uruchomPetle() {
  if (stan.ramka === null) stan.ramka = requestAnimationFrame(petla);
}

// ---------- Hit-test i dymek ----------

/** Zamienia pozycję kursora (piksele względem canvas) na współrzędne boiska – odwrotność skali z dopasujRozmiar(). */
function naWspolrzedneBoiska(zdarzenie) {
  const prostokat = canvas.getBoundingClientRect();
  const px = zdarzenie.clientX - prostokat.left;
  const py = zdarzenie.clientY - prostokat.top;
  return { px, py, x: px / skala + BOISKO.lewo, y: py / skala + BOISKO.gora };
}

function pokazDymek(zdarzenie) {
  const { px, py, x, y } = naWspolrzedneBoiska(zdarzenie);
  const nazwa = strefa(x, y);
  const dane = nazwa && stan.statystykiStref.get(nazwa);

  if (nazwa !== stan.podswietlona) {
    stan.podswietlona = nazwa;
    uruchomPetle(); // przerysowanie z nowym podświetleniem (i start pulsowania)
  }

  if (!nazwa) {
    dymek.hidden = true;
    return;
  }

  dymek.textContent = dane
    ? `${nazwa}: ${formatProcent(dane.celne / dane.proby)} (${dane.celne}/${dane.proby})`
    : `${nazwa}: brak rzutów`;
  dymek.hidden = false;

  // Dymek obok kursora, ale nie wychodzi poza prawą krawędź mapy
  const maksX = canvas.clientWidth - dymek.offsetWidth;
  dymek.style.left = `${Math.min(px + 12, maksX)}px`;
  dymek.style.top = `${py + 12}px`;
}

function ukryjDymek() {
  dymek.hidden = true;
  stan.podswietlona = null;
  uruchomPetle();
}

// ---------- Wybór zawodnika ----------

/** Zmiana zawodnika: nowe rzuty, statystyki stref, opis, animacja od początku. */
function wybierzZawodnika(id) {
  stan.zawodnik = stan.zawodnicy.find((z) => String(z.id) === String(id));

  // Z tablic [x, y, celny, kwarta] robimy obiekty i od razu przypisujemy strefę (liczona raz, nie co klatkę)
  stan.widoczne = (stan.rzuty[stan.zawodnik.id] || []).map(([x, y, celny, kwarta]) => (
    { x, y, celny, kwarta, strefa: strefa(x, y) }
  ));
  stan.statystykiStref = policzStrefy(stan.widoczne);

  const celne = stan.widoczne.filter((r) => r.celny === 1).length;
  const proby = stan.widoczne.length;
  const nazwa = `${stan.zawodnik.imie} ${stan.zawodnik.nazwisko}`;
  podsumowanie.textContent = `${nazwa}: ${proby} ${odmiana(proby, 'rzut', 'rzuty', 'rzutów')} z gry, trafione ${celne} (${formatProcent(celne / proby)}).`;
  canvas.setAttribute('aria-label', `Mapa rzutów. ${podsumowanie.textContent}`);

  // Przy prefers-reduced-motion pokazujemy wszystko od razu, bez spadania
  stan.startAnimacji = mniejRuchu() ? -Infinity : performance.now();
  uruchomPetle();
}

/** Lista zawodników w <select>. */
function wypelnijWybor() {
  for (const z of stan.zawodnicy) {
    const opcja = document.createElement('option');
    opcja.value = z.id;
    opcja.textContent = `${z.imie} ${z.nazwisko} (${z.druzyna})`;
    wybor.append(opcja);
  }
  wybor.addEventListener('change', () => wybierzZawodnika(wybor.value));
}

async function start() {
  // Najpierw samo boisko – widać je od razu, zanim dojdą dane
  dopasujRozmiar();
  rysujScene();

  // Zmiana szerokości strony (obrót telefonu, zmiana okna, zoom) → nowa rozdzielczość i przerysowanie
  new ResizeObserver(() => {
    dopasujRozmiar();
    rysujScene();
  }).observe(canvas);

  // Mapa poza ekranem → pętla się zatrzymuje; wraca na ekran → wznawiamy
  new IntersectionObserver(([wpis]) => {
    stan.naEkranie = wpis.isIntersecting;
    if (stan.naEkranie) uruchomPetle();
  }).observe(canvas);

  // Pointer Events obsługują mysz, dotyk i rysik jednym zestawem zdarzeń
  canvas.addEventListener('pointermove', pokazDymek);
  canvas.addEventListener('pointerdown', pokazDymek); // dotknięcie palcem też pokazuje dymek
  // Po oderwaniu palca przeglądarka wysyła pointerleave – przy dotyku dymek zostaje do następnego dotknięcia
  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'touch') ukryjDymek();
  });

  // Dane wczytuje wspólny moduł dane.js (Artura) – zawodnicy.json i rzuty.json naraz
  [stan.zawodnicy, stan.rzuty] = await Promise.all([wczytaj('zawodnicy'), wczytaj('rzuty')]);
  wypelnijWybor();
  wybierzZawodnika(stan.zawodnicy[0].id);
}

if (canvas && ctx) {
  start().catch((blad) => {
    console.error(blad);
    if (podsumowanie) podsumowanie.textContent = 'Nie udało się wczytać danych rzutów.';
  });
}