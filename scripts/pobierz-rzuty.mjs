// Pobiera wszystkie rzuty z gry zawodników z data/zawodnicy.json i zapisuje je w data/rzuty.json.
// Uruchomienie z głównego folderu projektu (po pobierz-dane.mjs):  node scripts/pobierz-rzuty.mjs

import { readFile } from 'node:fs/promises';
import { SEZON, TYP_SEZONU, pobierzNBA, tabelaNaObiekty, zapiszJSON } from './nba-api.mjs';

const zawodnicy = JSON.parse(await readFile(new URL('../data/zawodnicy.json', import.meta.url), 'utf8'));
const rzuty = {};

for (const [i, z] of zawodnicy.entries()) {
  console.log(`${i + 1}/${zawodnicy.length} ${z.imie} ${z.nazwisko}`);

  const wiersze = tabelaNaObiekty(await pobierzNBA('shotchartdetail', {
    AheadBehind: '', ClutchTime: '', ContextFilter: '', ContextMeasure: 'FGA', DateFrom: '', DateTo: '',
    EndPeriod: '', EndRange: '', GameID: '', GameSegment: '', LastNGames: 0, LeagueID: '00', Location: '',
    Month: 0, OpponentTeamID: 0, Outcome: '', Period: 0, PlayerID: z.id, PlayerPosition: '', PointDiff: '',
    Position: '', RangeType: '', RookieYear: '', Season: SEZON, SeasonSegment: '', SeasonType: TYP_SEZONU,
    StartPeriod: '', StartRange: '', TeamID: 0, VsConference: '', VsDivision: '',
  }));

  // Zwarty zapis jednego rzutu: [x, y, celny, kwarta]
  //   x, y   – położenie w dziesiątych częściach stopy względem kosza (kosz = 0, 0)
  //   celny  – 1 = trafiony, 0 = niecelny
  //   kwarta – 1–4, 5 i więcej = dogrywki
  rzuty[z.id] = wiersze.map((w) => [w.LOC_X, w.LOC_Y, w.SHOT_MADE_FLAG, w.PERIOD]);
}

await zapiszJSON('rzuty.json', rzuty);
const suma = Object.values(rzuty).reduce((s, lista) => s + lista.length, 0);
console.log(`Gotowe: ${suma} rzutów ${zawodnicy.length} zawodników.`);