// W5 – multimedia: własny odtwarzacz wideo · odpowiada: Czarek
// Etap 1: sterowanie – odtwórz/wstrzymaj, pasek postępu, czas, głośność, wyciszenie, prędkość, pełny ekran, skróty klawiszowe.
// Używamy wyłącznie API elementu <video> (HTMLMediaElement) – bez bibliotek.

const odtwarzacz = document.querySelector('.odtwarzacz');

if (odtwarzacz) {
  const wideo = odtwarzacz.querySelector('.odtwarzacz-wideo');
  const pasek = odtwarzacz.querySelector('.odtwarzacz-pasek');
  const przyciskPlay = odtwarzacz.querySelector('.odtwarzacz-play');
  const postep = odtwarzacz.querySelector('.odtwarzacz-postep');
  const biezacy = odtwarzacz.querySelector('.odtwarzacz-biezacy');
  const calosc = odtwarzacz.querySelector('.odtwarzacz-calosc');
  const przyciskWycisz = odtwarzacz.querySelector('.odtwarzacz-wycisz');
  const glosnosc = odtwarzacz.querySelector('.odtwarzacz-glosnosc');
  const predkosc = odtwarzacz.querySelector('.odtwarzacz-predkosc select');
  const przyciskPelny = odtwarzacz.querySelector('.odtwarzacz-pelny');

  // Progressive enhancement: bez JS działają natywne kontrolki; z JS – nasze
  wideo.controls = false;
  pasek.hidden = false;

  /** Sekundy → „m:ss”, np. 83.4 → „1:23”. */
  const formatCzasu = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  /** Zmienia ikonę ze sprite'a Artura w danym przycisku. */
  const ustawIkone = (przycisk, nazwa) => przycisk.querySelector('use').setAttribute('href', `./svg/ikony.svg#ikona-${nazwa}`);

  // ---------- Odtwórz / wstrzymaj ----------
  function przelaczOdtwarzanie() {
    if (wideo.paused || wideo.ended) wideo.play();
    else wideo.pause();
  }

  // Wygląd przycisku zmieniamy w reakcji na zdarzenia wideo (play/pause), a nie na kliknięcie –
  // dzięki temu zgadza się też, gdy film zatrzyma się sam (koniec) albo z klawiatury systemowej.
  function pokazStanOdtwarzania() {
    const gra = !wideo.paused && !wideo.ended;
    ustawIkone(przyciskPlay, gra ? 'pauza' : 'play');
    przyciskPlay.setAttribute('aria-label', gra ? 'Wstrzymaj' : 'Odtwórz');
  }

  przyciskPlay.addEventListener('click', przelaczOdtwarzanie);
  wideo.addEventListener('click', przelaczOdtwarzanie); // kliknięcie w obraz też działa
  wideo.addEventListener('play', pokazStanOdtwarzania);
  wideo.addEventListener('pause', pokazStanOdtwarzania);
  wideo.addEventListener('ended', pokazStanOdtwarzania);

  // ---------- Postęp i czas ----------
  // loadedmetadata: znamy już długość filmu (dzięki preload="metadata" bez pobierania całości)
  wideo.addEventListener('loadedmetadata', () => {
    postep.max = wideo.duration;
    calosc.textContent = formatCzasu(wideo.duration);
    pokazPostep();
  });

  /** Pasek i licznik czasu odpowiadają aktualnej pozycji filmu. */
  function pokazPostep() {
    postep.value = wideo.currentTime;
    biezacy.textContent = formatCzasu(wideo.currentTime);
    // czytnik ekranu przeczyta „1:23 z 2:36” zamiast „83,4”
    postep.setAttribute('aria-valuetext', `${formatCzasu(wideo.currentTime)} z ${formatCzasu(wideo.duration || 0)}`);
  }

  // timeupdate przychodzi kilka razy na sekundę podczas odtwarzania
  wideo.addEventListener('timeupdate', pokazPostep);

  // Przesunięcie suwaka (mysz, palec, strzałki) = przewinięcie filmu
  postep.addEventListener('input', () => {
    wideo.currentTime = Number(postep.value);
    pokazPostep();
  });

  // ---------- Głośność i wyciszenie ----------
  function pokazGlosnosc() {
    const cicho = wideo.muted || wideo.volume === 0;
    ustawIkone(przyciskWycisz, cicho ? 'wycisz' : 'glosnosc');
    przyciskWycisz.setAttribute('aria-label', cicho ? 'Włącz dźwięk' : 'Wycisz');
    glosnosc.value = wideo.muted ? 0 : wideo.volume;
  }

  przyciskWycisz.addEventListener('click', () => {
    wideo.muted = !wideo.muted;
    if (!wideo.muted && wideo.volume === 0) wideo.volume = 0.5; // odciszenie przy zerowej głośności – dajemy połowę
  });

  glosnosc.addEventListener('input', () => {
    wideo.volume = Number(glosnosc.value);
    wideo.muted = wideo.volume === 0;
  });

  // volumechange: jedno miejsce aktualizacji wyglądu dla przycisku, suwaka i skrótu M
  wideo.addEventListener('volumechange', pokazGlosnosc);

  // ---------- Prędkość ----------
  predkosc.addEventListener('change', () => {
    wideo.playbackRate = Number(predkosc.value);
  });

  // ---------- Pełny ekran ----------
  // Na pełny ekran przechodzi cały <figure>, a nie samo <video> – inaczej zniknąłby nasz pasek
  function przelaczPelnyEkran() {
    if (document.fullscreenElement) document.exitFullscreen();
    else odtwarzacz.requestFullscreen?.();
  }
  przyciskPelny.addEventListener('click', przelaczPelnyEkran);
  document.addEventListener('fullscreenchange', () => {
    przyciskPelny.setAttribute('aria-label', document.fullscreenElement ? 'Zamknij pełny ekran' : 'Pełny ekran');
  });

  // ---------- Skróty klawiszowe ----------
  // Działają, gdy fokus jest gdzieś w odtwarzaczu (nie przechwytujemy klawiszy całej strony).
  odtwarzacz.addEventListener('keydown', (e) => {
    const naKontrolce = ['BUTTON', 'INPUT', 'SELECT'].includes(e.target.tagName);
    const klawisz = e.key.toLowerCase();

    if (klawisz === 'k' || (e.key === ' ' && !naKontrolce)) przelaczOdtwarzanie();      // Spacja na przycisku „kliknie” go sama
    else if (e.key === 'ArrowLeft' && !naKontrolce) wideo.currentTime = Math.max(0, wideo.currentTime - 5);
    else if (e.key === 'ArrowRight' && !naKontrolce) wideo.currentTime = Math.min(wideo.duration, wideo.currentTime + 5);
    else if (klawisz === 'm') wideo.muted = !wideo.muted;
    else if (klawisz === 'f') przelaczPelnyEkran();
    else return; // inny klawisz – zostawiamy przeglądarce

    e.preventDefault(); // np. Spacja nie przewija strony
  });

  // ---------- Błąd wczytania ----------
  wideo.addEventListener('error', () => {
    pasek.hidden = true;
    wideo.controls = true; // zostawiamy natywne kontrolki z komunikatem przeglądarki
    console.error('Nie udało się wczytać filmu', wideo.error);
  }, true);

  // Stan początkowy (gdyby metadane wczytały się, zanim skrypt zdążył podpiąć zdarzenia)
  if (wideo.readyState >= 1) wideo.dispatchEvent(new Event('loadedmetadata'));
  pokazStanOdtwarzania();
  pokazGlosnosc();
}