// Inicjalizacja strony: nawigacja, motyw i elementy wspólne.
// Moduły sekcji (wykresy, Canvas, odtwarzacz, galeria) ładują się osobno – patrz <head> w index.html.

import { wczytaj } from './dane.js';

// Klasa "js" na <html> pozwala w CSS odróżnić wersję z działającym JavaScriptem
// od wersji awaryjnej (progressive enhancement).
document.documentElement.classList.add('js');

// ---------- Podświetlenie aktualnej sekcji w nawigacji ----------
// IntersectionObserver zgłasza, która sekcja przecina wąski pas na środku ekranu.
// Link do niej dostaje aria-current="location": czytnik ekranu ogłasza „bieżąca lokalizacja”,
// a CSS pogrubia go selektorem [aria-current]. Bez nasłuchiwania „scroll” – przeglądarka
// sama liczy przecięcia, więc nie obciążamy przewijania.
const linkiMenu = document.querySelectorAll('.nawigacja a');

const obserwator = new IntersectionObserver((wpisy) => {
  for (const wpis of wpisy) {
    if (!wpis.isIntersecting) continue;
    for (const link of linkiMenu) {
      if (link.hash === `#${wpis.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
}, { rootMargin: '-45% 0px -50% 0px' }); // pas od 45% do 50% wysokości okna

// Obserwujemy wszystkie sekcje, także #start (nie ma jej w menu – wtedy nic nie jest podświetlone)
document.querySelectorAll('main section[id]').forEach((sekcja) => obserwator.observe(sekcja));

// ======================================================================
// Sekcja START: karty liderów i ticker najlepszych strzelców
// Wszystkie liczby pochodzą z plików data/*.json (wspólny moduł dane.js Artura).
// ======================================================================

/** Liczba po polsku z jednym miejscem po przecinku, np. 33.5 → „33,5”. */
const liczba = (x) => x.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Zawodnik z najwyższą wartością pola, np. najlepszy(zawodnicy, 'pkt'). */
const najlepszy = (zawodnicy, pole) => zawodnicy.reduce((a, b) => (b[pole] > a[pole] ? b : a));

/** Karty liderów: najlepszy bilans drużyny i najlepsi zawodnicy w trzech kategoriach. */
function kartyLiderow(druzyny, zawodnicy) {
  const lista = document.querySelector('.karty-liderow');
  if (!lista) return;

  const druzyna = druzyny[0]; // druzyny.json jest posortowany od największej liczby zwycięstw
  const strzelec = najlepszy(zawodnicy, 'pkt');
  const zbierajacy = najlepszy(zawodnicy, 'zb');
  const podajacy = najlepszy(zawodnicy, 'as');

  const karty = [
    { etykieta: 'Najlepszy bilans', wartosc: `${druzyna.wygrane}–${druzyna.porazki}`, opis: `${druzyna.miasto} ${druzyna.nazwa}`, cel: '#sezon' },
    { etykieta: 'Punkty na mecz', wartosc: liczba(strzelec.pkt), opis: `${strzelec.imie} ${strzelec.nazwisko} (${strzelec.druzyna})`, cel: '#zawodnicy' },
    { etykieta: 'Zbiórki na mecz*', wartosc: liczba(zbierajacy.zb), opis: `${zbierajacy.imie} ${zbierajacy.nazwisko} (${zbierajacy.druzyna})`, cel: '#zawodnicy' },
    { etykieta: 'Asysty na mecz*', wartosc: liczba(podajacy.as), opis: `${podajacy.imie} ${podajacy.nazwisko} (${podajacy.druzyna})`, cel: '#zawodnicy' },
  ];

  // Każda karta to link do sekcji z wykresem – dzięki temu efekt hover ma sens i działa też z klawiatury
  lista.innerHTML = karty.map((k) => `
    <li>
      <a class="karta" href="${k.cel}">
        <span class="karta-etykieta">${k.etykieta}</span>
        <span class="karta-wartosc">${k.wartosc}</span>
        <span class="karta-opis">${k.opis}</span>
      </a>
    </li>`).join('');

  lista.insertAdjacentHTML('afterend',
    '<p class="przypis">* wśród 20 najlepszych strzelców sezonu (tylu zawodników obejmują nasze dane).</p>');
}

/**
 * Ticker: pasek z 20 najlepszymi strzelcami przesuwający się w pętli.
 * Taśma zawiera listę DWA razy; animacja przesuwa ją o połowę szerokości (-50%),
 * więc w chwili „przeskoku” na ekranie jest identyczny obraz – pętla jest płynna, bez szarpnięcia.
 */
function ticker(zawodnicy) {
  const pasek = document.querySelector('.ticker');
  if (!pasek) return;
  const tasma = pasek.querySelector('.ticker-tasma');
  const przycisk = pasek.querySelector('.ticker-pauza');

  const posortowani = [...zawodnicy].sort((a, b) => b.pkt - a.pkt);
  const elementy = posortowani
    .map((z, i) => `<li>${i + 1}. ${z.imie} ${z.nazwisko} <span>${z.druzyna}</span> <strong>${liczba(z.pkt)} pkt</strong></li>`)
    .join('');

  // Druga kopia jest tylko dla oka – czytnik ekranu przeczyta listę raz (aria-hidden)
  tasma.innerHTML = `<ul>${elementy}</ul><ul aria-hidden="true">${elementy}</ul>`;

  // Czas jednego okrążenia zależy od długości taśmy: stała prędkość ok. 50 px/s
  pasek.hidden = false;
  const sekundy = Math.round(tasma.scrollWidth / 2 / 50);
  tasma.style.setProperty('--czas-tickera', `${sekundy}s`);

  // Pauza (WCAG 2.2.2: ruch dłuższy niż 5 s musi dać się zatrzymać)
  przycisk.addEventListener('click', () => {
    const wstrzymany = pasek.classList.toggle('ticker--wstrzymany');
    przycisk.querySelector('.ticker-pauza-tekst').textContent = wstrzymany ? 'Wznów' : 'Wstrzymaj';
    przycisk.querySelector('use').setAttribute('href', `./svg/ikony.svg#ikona-${wstrzymany ? 'play' : 'pauza'}`);
  });
}

Promise.all([wczytaj('druzyny'), wczytaj('zawodnicy')])
  .then(([druzyny, zawodnicy]) => {
    kartyLiderow(druzyny, zawodnicy);
    ticker(zawodnicy);
  })
  .catch((blad) => console.error(blad)); // bez danych sekcja start pokazuje sam tytuł i opis
