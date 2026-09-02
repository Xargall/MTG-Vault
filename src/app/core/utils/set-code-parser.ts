export interface SetCodeMatch {
  setCode: string;
  collectorNumber: string;
}

// Case-sensitive on purpose: matching only already-uppercase tokens avoids
// the previous approach's false positives (e.g. uppercasing the whole text
// first turned "Spider-Man" into "SPIDER-MAN", making "MAN" match as a
// bogus set code) - a real printed name's mixed case never matches this.
const SET_CODE_TOKEN_PATTERN = /\b([A-Z]{2,4})\b/g;
const COLLECTOR_NUMBER_PATTERN = /\b(0\d{3}|\d{4})\b/;
const IGNORED_SET_TOKENS = ['EN', 'U', 'X', 'M', 'A', 'EZ', 'DD'];

export function parseSetCode(rawText: string): SetCodeMatch | null {
  const setMatches = rawText.match(SET_CODE_TOKEN_PATTERN);
  const numMatch = COLLECTOR_NUMBER_PATTERN.exec(rawText);

  const setCode = setMatches?.find((s) => s.length >= 3 && !IGNORED_SET_TOKENS.includes(s))?.toLowerCase();
  const collectorNum = numMatch ? parseInt(numMatch[1], 10) : null;

  if (!setCode || collectorNum === null) return null;
  return { setCode, collectorNumber: String(collectorNum) };
}
