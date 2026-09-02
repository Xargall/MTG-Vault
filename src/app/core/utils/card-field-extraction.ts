import { parseSetCode } from './set-code-parser';
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
  hasKeyword: ExtractedKeywords;
  isCreature: boolean;
  isInstant: boolean;
  isSorcery: boolean;
  isLegendary: boolean;
  artist: string | null;
}

const POWER_TOUGHNESS_PATTERN = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b/;

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
  const match = POWER_TOUGHNESS_PATTERN.exec(text);
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

/**
 * Pulls every scoreable structural field out of one frame's OCR output, with
 * no dependency on successfully reading the card's (often OCR-mangled) name:
 * set code + collector number, power/toughness, common keyword abilities,
 * and coarse type flags - all independently extractable signals that feed
 * the multi-field scoring system. Deliberately no CMC estimate - OCR too
 * often confuses an unrelated number on the card for the mana cost.
 */
export function extractFields(text: string, lines: OcrLineLike[]): ExtractedFields {
  const setCodeMatch = parseSetCode(text);

  const hasKeyword = {} as ExtractedKeywords;
  for (const key of Object.keys(KEYWORD_PATTERNS) as (keyof ExtractedKeywords)[]) {
    hasKeyword[key] = KEYWORD_PATTERNS[key].test(text);
  }

  return {
    setCode: setCodeMatch?.setCode ?? null,
    collectorNumber: setCodeMatch ? parseInt(setCodeMatch.collectorNumber, 10) : null,
    powerToughness: extractPowerToughness(text),
    hasKeyword,
    isCreature: /Creature|Kreatur/i.test(text),
    isInstant: /Instant|Spontanzauber/i.test(text),
    isSorcery: /Sorcery|Hexerei/i.test(text),
    isLegendary: /Legendary|Legendär/i.test(text),
    artist: extractArtist(lines),
  };
}
