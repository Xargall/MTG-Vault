export interface SetCodeMatch {
  setCode: string;
  collectorNumber: string;
}

// Case-sensitive on purpose: matching only already-uppercase tokens avoids
// the previous approach's false positives (e.g. uppercasing the whole text
// first turned "Spider-Man" into "SPIDER-MAN", making "MAN" match as a
// bogus set code) - a real printed name's mixed case never matches this.
// Exactly 3 letters - real Scryfall set codes are (near-)universally 3
// characters, and a looser 2-4 range let far too many ordinary English/
// German three-letter words through as bogus "set codes".
const SET_CODE_TOKEN_PATTERN = /\b([A-Z]{3})\b/g;
const COLLECTOR_NUMBER_PATTERN = /\b(0\d{3}|\d{4})\b/;
// Common uppercase three-letter English/German words and rules-text
// keywords/abbreviations that OCR frequently produces and that would
// otherwise false-positive as a set code.
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
];

export function parseSetCode(rawText: string): SetCodeMatch | null {
  const setMatches = rawText.match(SET_CODE_TOKEN_PATTERN);
  const numMatch = COLLECTOR_NUMBER_PATTERN.exec(rawText);

  const setCode = setMatches?.find((s) => !IGNORED_SET_TOKENS.includes(s))?.toLowerCase();
  const collectorNum = numMatch ? parseInt(numMatch[1], 10) : null;

  if (!setCode || collectorNum === null) return null;
  return { setCode, collectorNumber: String(collectorNum) };
}
