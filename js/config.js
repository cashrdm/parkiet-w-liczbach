// Wspólne ustawienia aplikacji – jedno miejsce do zmian
// (np. na obronie: „zmień czas animacji” = zmiana jednej liczby tutaj).

// Czas animowanych przejść (wykresy D3, elementy interfejsu) w milisekundach.
export const CZAS_ANIMACJI = 600;

// Ścieżki do danych – względne, bo GitHub Pages serwuje stronę pod adresem /nazwa-repo/.
export const SCIEZKI = {
  meta: './data/meta.json',
  druzyny: './data/druzyny.json',
  mecze: './data/mecze.json',
  zawodnicy: './data/zawodnicy.json',
  rzuty: './data/rzuty.json',
};

// true, gdy użytkownik ustawił w systemie „ogranicz ruch” (prefers-reduced-motion).
export function mniejRuchu() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Czas animacji z uwzględnieniem preferencji użytkownika: 0 = zmiana bez animacji.
export function czasAnimacji() {
  return mniejRuchu() ? 0 : CZAS_ANIMACJI;
}
