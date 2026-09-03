import { extractCollectorNumber, parseSetCode } from './set-code-parser';
import { OcrLineLike } from './string-similarity';

export interface ExtractedKeywords {
  menace: boolean;
  trample: boolean;
  reach: boolean;
  flying: boolean;
  lifelink: boolean;
  vigilance: boolean;
  haste: boolean;
}

export interface ExtractedFields {
  setCode: string | null;
  collectorNumber: number | null;
  powerToughness: string | null;
  name: string | null;
  hasKeyword: ExtractedKeywords;
  isCreature: boolean;
  isInstant: boolean;
  isSorcery: boolean;
  isLegendary: boolean;
  artist: string | null;
}

// The real P/T box is always at the very bottom-right of the card, after all
// rules text - restricting the search to the last few lines (rather than
// the whole frame) keeps an in-text "+1/+1 counter" mention from being
// mistaken for it. The lookaround additionally rejects a number directly
// preceded/followed by +/-, so a counter reference that does end up in that
// tail (e.g. "+1/+1") still can't match even there.
const POWER_TOUGHNESS_TAIL_LINES = 3;
const POWER_TOUGHNESS_PATTERN = /(?<![+-])\b(\d{1,2})\s*\/\s*(\d{1,2})\b(?![+-])/;

const KEYWORD_PATTERNS: Record<keyof ExtractedKeywords, RegExp> = {
  menace: /Menace|Bedrohung/i,
  trample: /Trample|Trampelschaden/i,
  reach: /Reach|Reichweite/i,
  flying: /Flying|Flugfähigkeit/i,
  lifelink: /Lifelink|Lebensband/i,
  vigilance: /Vigilance|Wachsamkeit/i,
  haste: /Haste|Eile/i,
};

export function extractPowerToughness(text: string): string | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const tail = lines.slice(-POWER_TOUGHNESS_TAIL_LINES).join(' ');
  const match = POWER_TOUGHNESS_PATTERN.exec(tail);
  return match ? `${match[1]}/${match[2]}` : null;
}

/** Artist credit prints at the very bottom of the card, often after a "©" copyright line. */
export function extractArtist(lines: OcrLineLike[]): string | null {
  const copyrightLine = lines.find((line) => line.text.includes('©'));
  if (copyrightLine) {
    const afterSymbol = copyrightLine.text.split('©')[1]?.trim();
    if (afterSymbol) return afterSymbol;
  }
  const last = lines[lines.length - 1]?.text.trim();
  return last || null;
}

// The printed name is always the very first line on the card. Anything from
// an opening bracket onward is set-symbol/mana-cost OCR noise picked up on
// the same line (e.g. "Red Hulk (Dee" from a mangled mana cost render), and
// remaining non-letter characters are further OCR noise - both stripped
// rather than letting them reach Scryfall.
const NAME_BRACKET_ONWARD_PATTERN = /\s*[([{].*$/;
const NAME_DISALLOWED_CHARS_PATTERN = /[^a-zA-ZäöüÄÖÜß\s\-']/g;

export function extractCleanName(lines: OcrLineLike[]): string | null {
  const firstLine = lines[0]?.text;
  if (!firstLine) return null;

  const cleaned = firstLine
    .replace(NAME_BRACKET_ONWARD_PATTERN, '')
    .replace(NAME_DISALLOWED_CHARS_PATTERN, '')
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Pulls every scoreable structural field out of one frame's OCR output:
 * set code + collector number, power/toughness, common keyword abilities,
 * coarse type flags, and a cleaned-up printed name - all independently
 * extractable signals that feed the multi-field scoring system. Deliberately
 * no CMC estimate - OCR too often confuses an unrelated number on the card
 * for the mana cost. The name is a supporting signal only (run through
 * Scryfall's fuzzy lookup alongside the structural filter search, not
 * trusted on its own) precisely because it's the field OCR mangles most.
 */
export function extractFields(
  text: string,
  lines: OcrLineLike[],
  validSetCodes: ReadonlySet<string> | null,
): ExtractedFields {
  const setCodeMatch = parseSetCode(text, validSetCodes);

  const hasKeyword = {} as ExtractedKeywords;
  for (const key of Object.keys(KEYWORD_PATTERNS) as (keyof ExtractedKeywords)[]) {
    hasKeyword[key] = KEYWORD_PATTERNS[key].test(text);
  }

  return {
    setCode: setCodeMatch?.setCode ?? null,
    // Prefer the number paired with a valid set code; otherwise still worth
    // pulling a bare collector number out for scoring, even with no set
    // code to pair it with for an exact lookup.
    collectorNumber: setCodeMatch ? parseInt(setCodeMatch.collectorNumber, 10) : extractCollectorNumber(text),
    powerToughness: extractPowerToughness(text),
    name: extractCleanName(lines),
    hasKeyword,
    isCreature: /Creature|Kreatur/i.test(text),
    isInstant: /Instant|Spontanzauber/i.test(text),
    isSorcery: /Sorcery|Hexerei/i.test(text),
    isLegendary: /Legendary|Legendär/i.test(text),
    artist: extractArtist(lines),
  };
}
