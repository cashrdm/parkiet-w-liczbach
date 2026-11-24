import { SEZON, TYP_SEZONU, pobierzNBA, tabelaNaObiekty, zapiszJSON } from './nba-api.mjs';

const LICZBA_ZAWODNIKOW = 20; // tylu najlepszych strzelców trafia do danych
const MIN_MECZE = 50;         // pomijamy zawodników, którzy zagrali mało meczów

// ---------------------------------------------------------------------------
// 1. Mecze – jeden wiersz to jedna drużyna w jednym meczu (każdy mecz występuje 2 razy).
console.log('1/4 Mecze…');
const wierszeMeczow = tabelaNaObiekty(await pobierzNBA('leaguegamelog', {
  Counter: 0, DateFrom: '', DateTo: '', Direction: 'ASC', LeagueID: '00',
  PlayerOrTeam: 'T', Season: SEZON, SeasonType: TYP_SEZONU, Sorter: 'DATE',
}));

const mecze = wierszeMeczow
  .map((w) => ({
    data: w.GAME_DATE,
    druzyna: w.TEAM_ABBREVIATION,
    rywal: w.MATCHUP.slice(-3),      // "HOU @ OKC" albo "POR vs. SAC" → ostatnie 3 znaki to rywal
    dom: w.MATCHUP.includes('vs.'),  // "vs." = mecz u siebie, "@" = na wyjeździe
    wygrana: w.WL === 'W',
    pkt: w.PTS,
    pktRywala: w.PTS - w.PLUS_MINUS, // PLUS_MINUS drużyny = różnica punktów w meczu
  }))
  .sort((a, b) => a.data.localeCompare(b.data) || a.druzyna.localeCompare(b.druzyna));

// ---------------------------------------------------------------------------
// 2. Drużyny – końcowa tabela sezonu z podziałem na konferencje.
console.log('2/4 Drużyny…');
const skroty = new Map(wierszeMeczow.map((w) => [w.TEAM_ID, w.TEAM_ABBREVIATION]));
const tabela = tabelaNaObiekty(await pobierzNBA('leaguestandingsv3', {
  LeagueID: '00', Season: SEZON, SeasonType: TYP_SEZONU, SeasonYear: '',
}));

const druzyny = tabela
  .map((w) => ({
    id: w.TeamID,
    skrot: skroty.get(w.TeamID),
    miasto: w.TeamCity,
    nazwa: w.TeamName,
    konferencja: w.Conference === 'East' ? 'Wschód' : 'Zachód',
    wygrane: w.WINS,
    porazki: w.LOSSES,
  }))
  .sort((a, b) => b.wygrane - a.wygrane);

// ---------------------------------------------------------------------------
// 3. Zawodnicy – średnie na mecz + pozycja i numer z indeksu zawodników.
console.log('3/4 Zawodnicy…');
const statystyki = tabelaNaObiekty(await pobierzNBA('leaguedashplayerstats', {
  College: '', Conference: '', Country: '', DateFrom: '', DateTo: '', Division: '', DraftPick: '',
  DraftYear: '', GameScope: '', GameSegment: '', Height: '', ISTRound: '', LastNGames: 0, LeagueID: '00',
  Location: '', MeasureType: 'Base', Month: 0, OpponentTeamID: 0, Outcome: '', PORound: 0, PaceAdjust: 'N',
  PerMode: 'PerGame', Period: 0, PlayerExperience: '', PlayerPosition: '', PlusMinus: 'N', Rank: 'N',
  Season: SEZON, SeasonSegment: '', SeasonType: TYP_SEZONU, ShotClockRange: '', StarterBench: '',
  TeamID: 0, VsConference: '', VsDivision: '', Weight: '',
}));
const indeks = tabelaNaObiekty(await pobierzNBA('playerindex', {
  LeagueID: '00', Season: SEZON, Historical: 1, Active: '', TeamID: 0, Country: '', College: '',
  DraftYear: '', DraftPick: '', PlayerPosition: '', Height: '', Weight: '', AllStar: '',
}));
const infoZawodnika = new Map(indeks.map((w) => [w.PERSON_ID, w]));

const zawodnicy = statystyki
  .filter((w) => w.GP >= MIN_MECZE)
  .sort((a, b) => b.PTS - a.PTS)
  .slice(0, LICZBA_ZAWODNIKOW)
  .map((w) => {
    const info = infoZawodnika.get(w.PLAYER_ID) ?? {};
    const [imie, ...reszta] = w.PLAYER_NAME.split(' '); // zapas, gdyby zawodnika nie było w indeksie
    return {
      id: w.PLAYER_ID,
      imie: info.PLAYER_FIRST_NAME ?? imie,
      nazwisko: info.PLAYER_LAST_NAME ?? reszta.join(' '),
      druzyna: w.TEAM_ABBREVIATION,
      pozycja: (info.POSITION || '?')[0], // "F-G" → "F" (G = obrońca, F = skrzydłowy, C = środkowy)
      numer: info.JERSEY_NUMBER ?? '',
      mecze: w.GP,
      minuty: w.MIN,
      pkt: w.PTS,
      zb: w.REB,
      as: w.AST,
      prz: w.STL,
      blk: w.BLK,
      fg: w.FG_PCT,
      tp: w.FG3_PCT,
      ft: w.FT_PCT,
    };
  });

// ---------------------------------------------------------------------------
// 4. Zapis plików + metadane (źródło i data pobrania pokazujemy na stronie i w README).
console.log('4/4 Zapis…');
await zapiszJSON('mecze.json', mecze);
await zapiszJSON('druzyny.json', druzyny);
await zapiszJSON('zawodnicy.json', zawodnicy);
await zapiszJSON('meta.json', {
  zrodlo: 'NBA.com/stats',
  sezon: '2025/26',
  rodzaj: 'sezon zasadniczy',
  pobrano: new Date().toISOString().slice(0, 10),
});

console.log(`Gotowe: ${mecze.length} wpisów meczowych, ${druzyny.length} drużyn, ${zawodnicy.length} zawodników.`);