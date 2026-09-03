export interface SetCodeMatch {
  setCode: string;
  collectorNumber: string;
}

// Case-sensitive on purpose: matching only already-uppercase tokens avoids
// the previous approach's false positives (e.g. uppercasing the whole text
// first turned "Spider-Man" into "SPIDER-MAN", making "MAN" match as a
// bogus set code) - a real printed name's mixed case never matches this.
// 2-6 letters - real Scryfall set codes aren't all exactly 3 characters
// (older/promo sets run 2-6) - callers are expected to validate a match
// against the real Scryfall set-code list (see MtgApiService), which
// disambiguates far better than any fixed length ever could. A token like
// "WAR" (War of the Spark - a genuine set code that's also an ordinary
// English word) only works with that real check, not a length restriction.
const SET_CODE_TOKEN_PATTERN = /\b([A-Z]{2,6})\b/g;
// 3-5 digits, no leading-zero requirement - matches Scryfall's actual
// collector_number range (many modern cards print an unpadded 3-digit
// number, which a stricter "always 4 digits" pattern would never catch).
const COLLECTOR_NUMBER_PATTERN = /\b(\d{3,5})\b/;
// Fallback only, used when the real Scryfall set-code list (see
// MtgApiService.getValidSetCodes) hasn't loaded yet or failed to fetch -
// common uppercase English/German words and rules-text keywords/
// abbreviations that OCR frequently produces and that would otherwise
// false-positive as a set code.
const IGNORED_SET_TOKENS = [
  'EN', 'U', 'X', 'M', 'A', 'EZ', 'DD',
  'ENG', 'DEU', 'GER', 'THE', 'AND',
  'FOR', 'YOU', 'HIS', 'HER', 'ITS', 'ARE',
  'NOT', 'BUT', 'ALL', 'CAN', 'HAD', 'HIM',
  'HAS', 'WAS', 'ONE', 'OUR', 'OUT', 'WHO',
  'GET', 'GOT', 'PUT', 'SAY', 'SHE', 'USE',
  'WAY', 'WIN', 'WON', 'TOO', 'TWO', 'TOP',
  'OFF', 'OWN', 'AGO', 'ACT', 'ADD', 'AGE',
  'BOX', 'BOY', 'BIG', 'BIT', 'DIE', 'EAT',
  'EYE', 'FAR', 'FEW', 'GOD', 'GUN', 'HIT',
  'HOW', 'JOB', 'LAW', 'LAY', 'LET', 'LOT',
  'LOW', 'MAN', 'MAP', 'MET', 'MIX', 'MOM',
  'NEW', 'NOW', 'NOR', 'ODD', 'OLD', 'PAY',
  'PER', 'PLY', 'RAN', 'RAW', 'RED', 'RUN',
  'SET', 'SIT', 'SIX', 'SKY', 'SON', 'SUN',
  'TAX', 'TEN', 'TIE', 'TIN', 'TIP', 'TRY',
  'TUB', 'TUG', 'TUN', 'TUP', 'VAT', 'VIA',
  'WAR', 'WEB', 'WET', 'WHY', 'WIG', 'WIT',
  'WOE', 'WOK', 'WON', 'WOO', 'WOP', 'WOT',
  // MTG-Karten-Keywords die 3 Buchstaben haben:
  'FLY', 'TAP', 'DIE', 'ETB', 'EOT', 'CMC',
  'PTL', 'LTB', 'MTG',
  // OCR-Rauschen aus Kartentexten:
  'FOTN', 'DER', 'DIE', 'DAS', 'UND', 'AUF',
  'VON', 'MIT', 'AUS', 'BEI', 'ZUR', 'ZUM',
  'EIN', 'WEN', 'WEM', 'WER', 'IHM', 'IHN',
  'SIE', 'MIR', 'MAN', 'NUR', 'OFT', 'SEI',
  'TUT', 'WIE', 'ZIE', 'ZUR',
  // Printed on every card of a licensed/crossover product line, not a set code:
  'MARVEL', 'WIZARDS', 'COAST', 'HASBRO',
  'FOIL', 'RARE', 'MYTHIC', 'COMMON',
];

/** Standalone collector-number extraction, independent of finding a valid set code alongside it - lets a caller still use the number for scoring even when the set code couldn't be read. */
export function extractCollectorNumber(rawText: string): number | null {
  const numMatch = COLLECTOR_NUMBER_PATTERN.exec(rawText);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

/**
 * `validSetCodes`: the real, current Scryfall set-code list (uppercase),
 * when available - matched against directly instead of the much cruder
 * IGNORED_SET_TOKENS heuristic. Pass null to fall back to that heuristic
 * (e.g. before the real list has finished loading for the first time).
 */
export function parseSetCode(rawText: string, validSetCodes: ReadonlySet<string> | null): SetCodeMatch | null {
  const setMatches = rawText.match(SET_CODE_TOKEN_PATTERN);
  const collectorNum = extractCollectorNumber(rawText);

  const isValidToken = (token: string) =>
    validSetCodes ? validSetCodes.has(token) : !IGNORED_SET_TOKENS.includes(token);
  const setCode = setMatches?.find(isValidToken)?.toLowerCase();

  if (!setCode || collectorNum === null) return null;
  return { setCode, collectorNumber: String(collectorNum) };
}
