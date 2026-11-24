// Wspólne funkcje do pobierania danych z oficjalnego API statystyk NBA (stats.nba.com).
//
// Skrypty uruchamiamy LOKALNIE w Node.js (wersja 18 lub nowsza), a nie na stronie:
// serwer NBA nie wysyła nagłówków CORS, więc przeglądarka nie może go zapytać bezpośrednio.
// Dlatego dane pobieramy raz i zapisujemy jako pliki JSON w folderze data/.

import { mkdir, writeFile } from 'node:fs/promises';

export const SEZON = '2025-26';
export const TYP_SEZONU = 'Regular Season'; // sezon zasadniczy (bez play-off)

// Serwer NBA odrzuca zapytania, które nie wyglądają na pochodzące ze strony nba.com.
const NAGLOWKI = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const czekaj = (ms) => new Promise((gotowe) => setTimeout(gotowe, ms));

// Pobiera jeden endpoint API. Do 3 prób, bo serwer NBA czasem nie odpowiada za pierwszym razem.
export async function pobierzNBA(endpoint, parametry) {
  const url = `https://stats.nba.com/stats/${endpoint}?${new URLSearchParams(parametry)}`;

  for (let proba = 1; proba <= 3; proba++) {
    try {
      const odpowiedz = await fetch(url, { headers: NAGLOWKI, signal: AbortSignal.timeout(30000) });
      if (!odpowiedz.ok) throw new Error(`HTTP ${odpowiedz.status}`);
      const json = await odpowiedz.json();
      await czekaj(600); // krótka przerwa, żeby nie zasypywać serwera zapytaniami
      return json;
    } catch (blad) {
      console.warn(`  ${endpoint}: próba ${proba} nieudana (${blad.message})`);
      if (proba === 3) throw blad;
      await czekaj(2000 * proba);
    }
  }
}

// API zwraca tabelę w postaci { headers: ['A', 'B'], rowSet: [[1, 2], [3, 4]] }.
// Zamieniamy każdy wiersz na obiekt: { A: 1, B: 2 } – wygodniej się z tym pracuje.
export function tabelaNaObiekty(json, indeks = 0) {
  const { headers, rowSet } = json.resultSets[indeks];
  return rowSet.map((wiersz) => Object.fromEntries(headers.map((kolumna, i) => [kolumna, wiersz[i]])));
}

// Zapisuje dane do data/<nazwa>. Jeden rekord w jednej linii:
// plik jest czytelny dla człowieka, a `git diff` pokazuje dokładnie, który rekord się zmienił.
export async function zapiszJSON(nazwa, dane) {
  let tekst;
  if (Array.isArray(dane)) {
    tekst = '[\n' + dane.map((rekord) => '  ' + JSON.stringify(rekord)).join(',\n') + '\n]\n';
  } else {
    tekst = '{\n' + Object.entries(dane).map(([klucz, wartosc]) => `  ${JSON.stringify(klucz)}: ${JSON.stringify(wartosc)}`).join(',\n') + '\n}\n';
  }
  const folder = new URL('../data/', import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL(nazwa, folder), tekst, 'utf8');
  console.log(`  zapisano data/${nazwa} (${(Buffer.byteLength(tekst) / 1024).toFixed(0)} KB)`);
}