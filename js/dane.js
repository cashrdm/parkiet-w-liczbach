// Wspólny moduł danych: wczytuje pliki JSON z folderu data/ i liczy z nich wartości pochodne.
// Z tego modułu korzystają wykresy (Artur) i mapa rzutów (Czarek).
// Zasada projektu: w JSON są tylko surowe fakty, a wszystko, co da się policzyć (bilans narastająco,
// skuteczność), liczymy tutaj w JS. Jedno źródło prawdy.

import { SCIEZKI } from './config.js';

// Pamięć podręczna: nazwa pliku → obietnica (Promise) z danymi.
// Dwa moduły proszące o ten sam plik dostają tę samą obietnicę, więc plik pobiera się tylko raz.
const pamiec = new Map();

/**
 * Wczytuje jeden plik danych, np. wczytaj('mecze').
 * @param {keyof SCIEZKI} nazwa – klucz z config.js (meta, druzyny, mecze, zawodnicy, rzuty)
 * @returns {Promise<any>} sparsowany JSON
 */
export function wczytaj(nazwa) {
  if (!pamiec.has(nazwa)) {
    const sciezka = SCIEZKI[nazwa];
    if (!sciezka) throw new Error(`Nieznany plik danych: ${nazwa}`);

    const obietnica = fetch(sciezka).then((odp) => {
      // fetch nie zgłasza błędu przy 404, więc sprawdzamy status sami
      if (!odp.ok) throw new Error(`Nie udało się wczytać ${sciezka} (HTTP ${odp.status})`);
      return odp.json();
    });
    pamiec.set(nazwa, obietnica);
  }
  return pamiec.get(nazwa);
}

/**
 * Bilans jednej drużyny mecz po meczu: ile zwycięstw i porażek miała PO każdym meczu.
 * Wejście: wszystkie wpisy z mecze.json. Wyjście: tablica punktów do wykresu liniowego.
 * @param {Array} mecze – wpisy { data, druzyna, wygrana, ... }
 * @param {string} skrot – skrót drużyny, np. 'OKC'
 * @returns {Array<{data: Date, mecz: number, wygrane: number, porazki: number}>}
 */
export function bilansNarastajaco(mecze, skrot) {
  let wygrane = 0;
  let porazki = 0;

  return mecze
    .filter((m) => m.druzyna === skrot)
    .sort((a, b) => a.data.localeCompare(b.data)) // daty w formacie RRRR-MM-DD sortują się jak tekst
    .map((m, i) => {
      if (m.wygrana) wygrane += 1;
      else porazki += 1;
      return { data: new Date(m.data), mecz: i + 1, wygrane, porazki };
    });
}

/**
 * Bilans narastająco dla wielu drużyn naraz.
 * @returns {Map<string, Array>} skrót drużyny → punkty z bilansNarastajaco()
 */
export function bilanseDruzyn(mecze, skroty) {
  return new Map(skroty.map((skrot) => [skrot, bilansNarastajaco(mecze, skrot)]));
}

/** Data jako tekst po polsku, np. „15 sty 2026”. */
export function formatDaty(data) {
  return data.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Polska odmiana rzeczownika po liczbie, np. odmiana(n, 'rzut', 'rzuty', 'rzutów'):
 * 1 rzut · 2, 3, 4, 22, 762 rzuty · 5, 12, 13, 14, 1457 rzutów (12–14 to wyjątek: „12 rzutów”)
 */
export function odmiana(liczba, jeden, kilka, wiele) {
  if (liczba === 1) return jeden;
  const jednosci = liczba % 10;        // ostatnia cyfra
  const dwieCyfry = liczba % 100;      // dwie ostatnie cyfry
  if (jednosci >= 2 && jednosci <= 4 && (dwieCyfry < 12 || dwieCyfry > 14)) return kilka;
  return wiele;
}

/** Ułamek jako procent po polsku, np. 0.476 → „47,6%”. */
export function formatProcent(ulamek) {
  return `${(ulamek * 100).toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}