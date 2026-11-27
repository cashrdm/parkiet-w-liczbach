// W6 – galeria · odpowiada: Łukasz
// Etap 1: siatka miniatur i podgląd dużego zdjęcia w natywnym <dialog>.
// Etap 2: przechodzenie między zdjęciami – przyciski, klawiatura (← → Home End) i gest przesunięcia (Pointer Events).
// Bez JavaScriptu miniatury są zwykłymi linkami do dużych zdjęć; skrypt tylko „przechwytuje” kliknięcie.

const siatka = document.querySelector('.galeria-siatka');
const okno = document.querySelector('.galeria-podglad');

// Minimalna długość przesunięcia (px), żeby uznać je za gest „następne/poprzednie”, a nie przypadkowe drgnięcie
const PROG_GESTU = 50;

if (siatka && okno) {
  const miniatury = [...siatka.querySelectorAll('.galeria-miniatura')];
  const scena = okno.querySelector('.galeria-scena');
  const duze = okno.querySelector('.galeria-duze');
  const podpis = okno.querySelector('figcaption');
  const licznik = okno.querySelector('.galeria-licznik');
  let indeks = 0; // które zdjęcie jest w podglądzie

  /** Podpis: tytuł + autor i licencja (wymóg licencji CC: uznanie autorstwa i link do licencji). */
  function wypelnijPodpis(link) {
    const { tytul, autor, licencja, licencjaUrl, zrodlo } = link.dataset;
    podpis.replaceChildren(); // czyścimy poprzedni podpis

    const naglowek = document.createElement('strong');
    naglowek.textContent = tytul;

    const licencjaEl = licencjaUrl ? Object.assign(document.createElement('a'), { href: licencjaUrl }) : document.createElement('span');
    licencjaEl.textContent = licencja;

    const zrodloEl = Object.assign(document.createElement('a'), { href: zrodlo, textContent: 'Wikimedia Commons' });

    // textContent zamiast innerHTML: dane z atrybutów nigdy nie są interpretowane jako HTML
    podpis.append(naglowek, document.createElement('br'), `Fot. ${autor}, `, licencjaEl, ', ', zrodloEl);
  }

  /**
   * Pokazuje zdjęcie nr i. Indeks „zawija się”: za ostatnim jest pierwsze, przed pierwszym ostatnie.
   * Działa tak samo dla przycisków, klawiatury i gestu – jedno miejsce z logiką.
   */
  function pokaz(i) {
    indeks = (i + miniatury.length) % miniatury.length; // + długość: bez ujemnych indeksów przy cofaniu
    const link = miniatury[indeks];
    const miniatura = link.querySelector('img');

    // srcset: przeglądarka sama wybierze plik – na wąskim ekranie wystarczy 480 px, na dużym bierze 1600 px
    duze.srcset = `${miniatura.getAttribute('src')} 480w, ${link.getAttribute('href')} 1600w`;
    duze.src = link.getAttribute('href');
    duze.alt = miniatura.alt;
    wypelnijPodpis(link);
    licznik.textContent = `Zdjęcie ${indeks + 1} z ${miniatury.length}`;
  }

  // ---------- Otwieranie i zamykanie ----------

  // Jeden nasłuchiwacz na całej siatce zamiast osobnego na każdej miniaturze (delegowanie zdarzeń)
  siatka.addEventListener('click', (e) => {
    const link = e.target.closest('.galeria-miniatura');
    if (!link) return;
    e.preventDefault(); // nie przechodzimy pod adres zdjęcia – pokazujemy je w oknie
    pokaz(miniatury.indexOf(link));
    okno.showModal(); // modalne okno: Esc zamyka, Tab nie wychodzi poza okno, reszta strony jest nieaktywna
  });

  okno.querySelector('.galeria-zamknij').addEventListener('click', () => okno.close());

  // Kliknięcie w przyciemnione tło (poza zawartością okna) zamyka podgląd
  okno.addEventListener('click', (e) => {
    if (e.target === okno) okno.close();
  });

  // Po zamknięciu (przycisk, Esc albo tło) fokus wraca na miniaturę zdjęcia oglądanego jako ostatnie
  okno.addEventListener('close', () => miniatury[indeks].focus());

  // ---------- Przyciski ----------
  okno.querySelector('.galeria-poprzednie').addEventListener('click', () => pokaz(indeks - 1));
  okno.querySelector('.galeria-nastepne').addEventListener('click', () => pokaz(indeks + 1));

  // ---------- Klawiatura ----------
  // Esc obsługuje sam <dialog>. Tu dokładamy strzałki oraz Home/End (pierwsze/ostatnie zdjęcie).
  okno.addEventListener('keydown', (e) => {
    const akcje = {
      ArrowLeft: () => pokaz(indeks - 1),
      ArrowRight: () => pokaz(indeks + 1),
      Home: () => pokaz(0),
      End: () => pokaz(miniatury.length - 1),
    };
    if (!akcje[e.key]) return;
    e.preventDefault(); // np. Home nie przewija strony
    akcje[e.key]();
  });

  // ---------- Gest przesunięcia (Pointer Events: palec, mysz i rysik jednym kodem) ----------
  let startX = null;

  scena.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // naciśnięcie strzałki to nie gest
    startX = e.clientX;
    scena.setPointerCapture(e.pointerId); // dalsze zdarzenia tego palca trafiają do sceny, nawet poza nią
  });

  scena.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const przesuniecie = e.clientX - startX;
    startX = null;
    if (przesuniecie <= -PROG_GESTU) pokaz(indeks + 1);     // przesunięcie w lewo → następne
    else if (przesuniecie >= PROG_GESTU) pokaz(indeks - 1); // w prawo → poprzednie
  });

  // Przeglądarka przejęła gest (np. przewijanie w pionie) – zapominamy punkt startu
  scena.addEventListener('pointercancel', () => { startX = null; });
}
