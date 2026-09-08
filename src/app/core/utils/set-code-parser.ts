export type CollectorFinish = 'nonfoil' | 'halo';

export interface SetCodeMatch {
  setCode: string;
  collectorNumber: string;
  isToken: boolean;
  finish: CollectorFinish;
}

export interface CollectorNumberMatch {
  /** Bare printed number, unpadded, never carrying a flag prefix (e.g. "17", "82"). */
  number: string;
  isToken: boolean;
  finish: CollectorFinish;
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
// Old format (through March of the Machine, 2023): "NR/TOTAL" with an
// optional trailing flag letter - "017/017 T" (token #17), "020/020 H"
// (halo #20), "150/350" (plain #150). The flag trails the fraction here,
// unlike the new format below where it leads the number. Excludes a number
// directly after a ©/™ symbol for the same reason as the new-format pattern
// below (copyright-line years look exactly as plausible otherwise).
const OLD_FORMAT_COLLECTOR_PATTERN = /(?<![©™]\s*)\b(\d{3,5})\/\d{3,5}(?:\s+([A-Z]))?\b/;
// New format (March of the Machine, 2023 onward): always a zero-padded
// 4-digit number, no fraction, with an optional leading flag letter -
// "T 0003" (token #3), "H 0020" (halo #20), "0082" (plain #82). Gemini
// sometimes prints the flag glued to the digits ("T0003") rather than
// spaced - `\s*` (zero-or-more) matches both. Excludes a number directly
// after a ©/™ symbol - the card's copyright line ("© 2025 Wizards of the
// Coast") sits right next to the actual set-code/collector-number line and
// its year is exactly as plausible-looking a 4-digit match, but is never
// the real collector number.
const NEW_FORMAT_COLLECTOR_PATTERN = /(?<![©™]\s*)\b(?:([A-Z])\s*)?(\d{4})\b/;

/**
 * Robust collector-number parser covering both formats MTG has printed:
 * the pre-2023 "NR/TOTAL [FLAG]" fraction and the March of the Machine-
 * onward "[FLAG] NNNN" fixed 4-digit form. Either format's flag letter is
 * only meaningful as T (token) or H (halo) - any other letter (a rarity
 * code like U/C/R/M glued to the digits) is read and discarded exactly as
 * before, just via one unified pattern instead of a separate normalization
 * pass. Tried old-format first since its fraction ("/") makes it
 * unambiguous when present; the new format never contains one.
 */
export function parseCollectorNumber(rawText: string): CollectorNumberMatch | null {
  const text = rawText.toUpperCase();

  const oldMatch = OLD_FORMAT_COLLECTOR_PATTERN.exec(text);
  if (oldMatch) {
    const [, number, flag] = oldMatch;
    return { number: String(parseInt(number, 10)), isToken: flag === 'T', finish: flag === 'H' ? 'halo' : 'nonfoil' };
  }

  const newMatch = NEW_FORMAT_COLLECTOR_PATTERN.exec(text);
  if (newMatch) {
    const [, flag, number] = newMatch;
    return { number: String(parseInt(number, 10)), isToken: flag === 'T', finish: flag === 'H' ? 'halo' : 'nonfoil' };
  }

  return null;
}
// Fallback only, used when the real Scryfall set-code list (see
// MtgApiService.getValidSetCodes) hasn't loaded yet or failed to fetch -
// common uppercase English/German words and rules-text keywords/
// abbreviations that OCR frequently produces and that would otherwise
// false-positive as a set code.
const IGNORED_SET_TOKENS = [
  'EN', 'U', 'X', 'M', 'A', 'EZ', 'DD',
  // Bare 2-letter language codes printed next to the set code:
  'DE', 'FR', 'ES', 'IT', 'PT', 'JA', 'KO', 'RU', 'ZH',
  'ENG', 'DEU', 'GER', 'FRA', 'ITA', 'ESP', 'POR', 'THE', 'AND',
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
  // Rarity abbreviations and further common OCR noise around the
  // set-code/collector-number line:
  'COM', 'UNC', 'RAR', 'MYT', 'DES', 'ANS', 'INS',
  'EEN', 'ADI', 'SBE', 'PRE', 'EEE', 'NSA', 'NSS', 'SRE', 'LRE', 'TAA',
];

// Gemini's own MTG prompt (see gemini-ocr's MTG_PROMPT) asks it to normalize
// every printed format itself - "0082", "082/350", "T 0003", "016/017 T",
// "017/017T", "H 0020", "020/020 H" all become exactly one of "MSH 82" /
// "MSH T3" / "MSH H20" (unpadded, no fraction, flag always leading, single
// line). That means parsing its answer needs no fuzzy OCR recovery, just a
// strict check against that one shape - reusing parseSetCode/
// parseCollectorNumber here would actually be wrong, since their new-format
// pattern requires a zero-padded 4-digit number (matching what's printed on
// the card), which Gemini's unpadded "82"/"T3"/"H20" answer never is.
const GEMINI_MTG_RESULT_PATTERN = /^([A-Z]{2,4})\s+([TH]?)(\d{1,4})$/;

/**
 * Parses Gemini's normalized MTG answer into the same shape parseSetCode
 * produces, so both feed the same set+number lookup (see
 * MtgApiService.identifyByGeminiResult). Returns null for anything that
 * doesn't match that exact shape, including Gemini's own "UNKNOWN" answer.
 */
export function parseGeminiMtgResult(text: string): SetCodeMatch | null {
  const match = GEMINI_MTG_RESULT_PATTERN.exec(text.trim().toUpperCase());
  if (!match) return null;

  const [, setCode, flag, digits] = match;
  return {
    setCode: setCode.toLowerCase(),
    collectorNumber: String(parseInt(digits, 10)),
    isToken: flag === 'T',
    finish: flag === 'H' ? 'halo' : 'nonfoil',
  };
}

/** Standalone bare-number extraction for callers that only need the number, not the format/flag details - see parseCollectorNumber. */
export function extractCollectorNumber(rawText: string): number | null {
  const match = parseCollectorNumber(rawText);
  return match ? parseInt(match.number, 10) : null;
}

// Tesseract frequently splits a card's tiny bottom info strip (rarity
// symbol, set code, collector number, language code, copyright line) into
// more OCR lines than just "the set code's line and its immediate
// neighbor" - a ±1-line window missed the number entirely whenever it
// landed 2+ lines away, silently killing the exact lookup even though both
// "MSH" and "0082" were clearly present in the frame. This wider tail
// window is only tried as a second pass, after the tight one below comes
// up empty, so the original problem this guarded against (grabbing an
// unrelated number from mid-frame rules text) still can't win when the
// number legitimately is right next to the set code.
const COLLECTOR_NUMBER_TAIL_LINES = 6;
// The real info line ("MSH · DE U 0329") is always a handful of short
// tokens, never a sentence - excluding longer, prose-like lines from the
// wider tail pass keeps it from picking up a number out of an
// unfortunately-nearby rules-text line (e.g. "...deals 400 damage...") on
// a short card where that line still falls within the tail window.
const MAX_WORDS_FOR_INFO_LINE = 6;
function isCompactInfoLine(line: string): boolean {
  return line.split(/\s+/).filter(Boolean).length <= MAX_WORDS_FOR_INFO_LINE;
}

/**
 * `validSetCodes`: the real, current Scryfall set-code list (uppercase),
 * when available - matched against directly instead of the much cruder
 * IGNORED_SET_TOKENS heuristic. Pass null to fall back to that heuristic
 * (e.g. before the real list has finished loading for the first time).
 */
export function parseSetCode(rawText: string, validSetCodes: ReadonlySet<string> | null): SetCodeMatch | null {
  const isValidToken = (token: string) =>
    validSetCodes ? validSetCodes.has(token) : !IGNORED_SET_TOKENS.includes(token);

  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Primary read: the card's actual bottom strip - set code (+ language,
  // artist, copyright) prints on the very last OCR line, the collector
  // number (+ rarity letter, brand watermark) on the second-to-last, e.g.
  // "c 0082 © MARVEL" / "MSH*DE > Mateus Manhanini & © 2026 Wizards...".
  // Checked first and most strictly, since it's the most reliable
  // positional signal observed in practice.
  const lastLine = lines[lines.length - 1];
  const secondLastLine = lines.length >= 2 ? lines[lines.length - 2] : null;

  const setCodeFromLastLine = lastLine ? lastLine.match(SET_CODE_TOKEN_PATTERN)?.find(isValidToken) : undefined;
  if (setCodeFromLastLine) {
    // A frame can also OCR the whole strip as one merged last line - fall
    // back to that same line for the number if the second-to-last one
    // doesn't have it.
    const collectorMatch =
      (secondLastLine && parseCollectorNumber(secondLastLine)) ?? parseCollectorNumber(lastLine);
    if (collectorMatch) {
      return {
        setCode: setCodeFromLastLine.toLowerCase(),
        collectorNumber: collectorMatch.number,
        isToken: collectorMatch.isToken,
        finish: collectorMatch.finish,
      };
    }
  }

  // Fallback: the set code wasn't on the last line at all, or neither of
  // the last two lines had a number next to it - search the whole frame
  // for a valid set-code token, then look for the number near wherever
  // that landed instead of giving up outright.
  const setMatches = rawText.match(SET_CODE_TOKEN_PATTERN);
  const setCodeMatch = setMatches?.find(isValidToken);
  if (!setCodeMatch) return null;

  const setCodeLineIndex = lines.findIndex((line) => line.includes(setCodeMatch));

  // Pass 1: the set code's own line and its immediate neighbor - covers the
  // common case (same line, or split across exactly two) without touching
  // anything further away.
  const nearbyLines =
    setCodeLineIndex === -1 ? lines : lines.slice(Math.max(0, setCodeLineIndex - 1), setCodeLineIndex + 2);
  let collectorMatch = parseCollectorNumber(nearbyLines.join(' '));

  // Pass 2: only if that came up empty - widen to the last few lines of the
  // whole frame, where this info strip always prints (same reasoning as
  // extractPowerToughness's tail-lines restriction), rather than the entire
  // OCR blob.
  if (!collectorMatch) {
    const tailLines = lines.slice(-COLLECTOR_NUMBER_TAIL_LINES).filter(isCompactInfoLine);
    collectorMatch = parseCollectorNumber(tailLines.join(' '));
  }

  if (!collectorMatch) return null;
  return {
    setCode: setCodeMatch.toLowerCase(),
    collectorNumber: collectorMatch.number,
    isToken: collectorMatch.isToken,
    finish: collectorMatch.finish,
  };
}
