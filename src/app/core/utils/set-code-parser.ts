export interface SetCodeMatch {
  setCode: string;
  collectorNumber: string;
}

// Matches the collector strip printed on the bottom of MTG cards, e.g.
// "IKO · EN · 123/274" -> set code "IKO", collector number "123".
const SET_CODE_PATTERN = /([A-Z]{2,4})\s*[·•]\s*\w+\s*[·•]\s*(\d+)/;

export function parseSetCode(rawText: string): SetCodeMatch | null {
  const match = SET_CODE_PATTERN.exec(rawText.toUpperCase());
  if (!match) return null;
  return { setCode: match[1], collectorNumber: match[2] };
}
