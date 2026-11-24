// Inicjalizacja strony: nawigacja, motyw i elementy wspólne.
// Moduły sekcji (wykresy, Canvas, odtwarzacz, galeria) ładują się osobno – patrz <head> w index.html.

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
