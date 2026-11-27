// W6 – galeria · odpowiada: Łukasz
// Etap 1: siatka miniatur i podgląd dużego zdjęcia w natywnym <dialog>.
// Bez JavaScriptu miniatury są zwykłymi linkami do dużych zdjęć; skrypt tylko „przechwytuje” kliknięcie.

const siatka = document.querySelector('.galeria-siatka');
const okno = document.querySelector('.galeria-podglad');

if (siatka && okno) {
  const duze = okno.querySelector('.galeria-duze');
  const podpis = okno.querySelector('figcaption');
  let ostatniaMiniatura = null; // tu wraca fokus po zamknięciu podglądu

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

  /** Otwiera podgląd zdjęcia z danej miniatury. */
  function otworz(link) {
    const miniatura = link.querySelector('img');
    ostatniaMiniatura = link;

    // srcset: przeglądarka sama wybierze plik – na wąskim ekranie wystarczy 480 px, na dużym bierze 1600 px
    duze.srcset = `${miniatura.getAttribute('src')} 480w, ${link.getAttribute('href')} 1600w`;
    duze.src = link.getAttribute('href');
    duze.alt = miniatura.alt;
    wypelnijPodpis(link);

    okno.showModal(); // modalne okno: Esc zamyka, Tab nie wychodzi poza okno, reszta strony jest nieaktywna
  }

  // Jeden nasłuchiwacz na całej siatce zamiast osobnego na każdej miniaturze (delegowanie zdarzeń)
  siatka.addEventListener('click', (e) => {
    const link = e.target.closest('.galeria-miniatura');
    if (!link) return;
    e.preventDefault(); // nie przechodzimy pod adres zdjęcia – pokazujemy je w oknie
    otworz(link);
  });

  okno.querySelector('.galeria-zamknij').addEventListener('click', () => okno.close());

  // Kliknięcie w przyciemnione tło (poza zdjęciem) zamyka podgląd
  okno.addEventListener('click', (e) => {
    if (e.target === okno) okno.close();
  });

  // Po zamknięciu (przycisk, Esc albo tło) fokus wraca na miniaturę, od której zaczęliśmy
  okno.addEventListener('close', () => ostatniaMiniatura?.focus());
}
