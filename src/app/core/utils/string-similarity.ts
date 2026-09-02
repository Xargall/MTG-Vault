function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }

  return dist[rows - 1][cols - 1];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Normalized similarity between two strings, 0 (nothing alike) to 1 (identical), case/whitespace-insensitive. */
export function similarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  const maxLength = Math.max(normA.length, normB.length);
  if (maxLength === 0) return 1;
  return 1 - levenshtein(normA, normB) / maxLength;
}

/** Collapses raw OCR output (line breaks, stray symbols) into a single search-friendly line. */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\n+/g, ' ')
    .replace(/[^\p{L}\p{N}\s',.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tesseract regularly mis-reads German umlauts as plain-letter digraphs - undo the common cases before searching. */
export function fixUmlauts(text: string): string {
  return text
    .replace(/\bii\b/gi, 'ü')
    .replace(/ii([a-z])/gi, 'ü$1')
    .replace(/([a-z])ii/gi, '$1ü')
    .replace(/Ae/g, 'Ä')
    .replace(/ae/g, 'ä')
    .replace(/Oe/g, 'Ö')
    .replace(/oe/g, 'ö')
    .replace(/Ue/g, 'Ü')
    .replace(/ue/g, 'ü');
}

export interface OcrLineLike {
  text: string;
  confidence: number;
}

const LINE_CONFIDENCE_THRESHOLD = 70;
const UPPERCASE_LINE_PATTERN = /^[A-ZÄÖÜ\s-]+$/;
const DISALLOWED_LINE_CHARS = /[{}[\]()©/]/;

/**
 * Picks the most plausible card-name line out of a whole card image's OCR
 * output: card names are printed as their own line, so this keeps only
 * confident lines (Tesseract's per-line confidence, not the whole-image
 * one), drops anything containing symbols that only ever show up in mana
 * costs/rules text/copyright lines ({}, [], (), ©, /), prefers lines that
 * are purely letters/spaces/hyphens (how names are typically printed) over
 * ones that also have a few other characters mixed in, and finally takes
 * the longest survivor - the fullest name is more useful to search on than
 * a truncated fragment. Returns null if nothing survives the filters.
 */
export function extractNameFromLines(lines: OcrLineLike[]): string | null {
  const candidates = lines
    .filter((line) => line.confidence > LINE_CONFIDENCE_THRESHOLD)
    .map((line) => line.text.trim())
    .filter((text) => text.length > 0 && !DISALLOWED_LINE_CHARS.test(text));

  if (candidates.length === 0) return null;

  const uppercaseOnly = candidates.filter((text) => UPPERCASE_LINE_PATTERN.test(text));
  const pool = uppercaseOnly.length > 0 ? uppercaseOnly : candidates;

  const longest = pool.reduce((best, current) => (current.length > best.length ? current : best));
  return fixUmlauts(longest);
}
