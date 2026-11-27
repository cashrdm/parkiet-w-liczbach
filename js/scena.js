// W4 – Canvas 2D: mapa rzutów zawodnika · odpowiada: Czarek
// Etap 1: rysowanie połowy parkietu, ostrość na ekranach o dużej gęstości pikseli (devicePixelRatio).

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
};

// ---------- Canvas ----------
const canvas = document.getElementById('parkiet');
const ctx = canvas ? canvas.getContext('2d') : null;

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

function rysujScene() {
  dopasujRozmiar();
  rysujBoisko();
}

if (canvas && ctx) {
  rysujScene();
  // Zmiana szerokości strony (obrót telefonu, zmiana okna, zoom) → nowa rozdzielczość i przerysowanie
  new ResizeObserver(rysujScene).observe(canvas);
}