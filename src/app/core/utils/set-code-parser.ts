export interface SetCodeMatch {
  setCode: string;
  collectorNumber: string;
}

// Looks for a short uppercase set-code token followed later in the text by
// a 3-4 digit collector number - lenient on purpose since real OCR output
// rarely preserves the printed "·"/"•" separators cleanly (e.g. "SPM ...
// 0067" reads out of a full card image, not a clean "SPM · EN · 67/281").
const SET_CODE_PATTERN = /\b([A-Z]{2,4})\b.*?\b(\d{3,4})\b/;

export function parseSetCode(rawText: string): SetCodeMatch | null {
  const match = SET_CODE_PATTERN.exec(rawText.toUpperCase());
  if (!match) return null;
  // Collector numbers are often printed zero-padded ("0067") but Scryfall's
  // own numbering usually isn't - normalize away the leading zeros.
  return { setCode: match[1].toLowerCase(), collectorNumber: String(parseInt(match[2], 10)) };
}
