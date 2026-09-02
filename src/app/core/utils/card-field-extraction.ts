import { parseSetCode } from './set-code-parser';
import { OcrLineLike, extractNameFromLines } from './string-similarity';

export interface ExtractedManaCost {
  raw: string;
  /** Generic mana + one per colored pip - a rough CMC estimate, not exact for costs like {X}. */
  number: number;
}

export interface ExtractedFields {
  name: string | null;
  setCode: string | null;
  collectorNumber: number | null;
  typeLine: string | null;
  powerToughness: string | null;
  manaCost: ExtractedManaCost | null;
  artist: string | null;
}

const TYPE_LINE_KEYWORDS = [
  'Legendary',
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Land',
  'Planeswalker',
];
const POWER_TOUGHNESS_PATTERN = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;
// Requires at least one WUBRG letter so this doesn't fire on an unrelated
// bare number (e.g. a collector number) - "3R"/"2WW"-style costs only.
const MANA_COST_PATTERN = /\b(\d{0,2})([WUBRG]{1,5})\b/;

export function extractTypeLine(lines: OcrLineLike[]): string | null {
  const match = lines.find((line) => TYPE_LINE_KEYWORDS.some((keyword) => line.text.includes(keyword)));
  return match ? match.text.trim() : null;
}

export function extractPowerToughness(text: string): string | null {
  const match = POWER_TOUGHNESS_PATTERN.exec(text);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function extractManaCost(text: string): ExtractedManaCost | null {
  const match = MANA_COST_PATTERN.exec(text);
  if (!match) return null;
  const generic = match[1] ? parseInt(match[1], 10) : 0;
  return { raw: match[0], number: generic + match[2].length };
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

/** Pulls every scoreable field out of one frame's OCR output for the multi-field scanner scoring system. */
export function extractFields(text: string, lines: OcrLineLike[]): ExtractedFields {
  const setCodeMatch = parseSetCode(text);
  return {
    name: extractNameFromLines(lines),
    setCode: setCodeMatch?.setCode ?? null,
    collectorNumber: setCodeMatch ? parseInt(setCodeMatch.collectorNumber, 10) : null,
    typeLine: extractTypeLine(lines),
    powerToughness: extractPowerToughness(text),
    manaCost: extractManaCost(text),
    artist: extractArtist(lines),
  };
}
