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

const MIN_WORD_LENGTH = 4;
const MAX_CANDIDATE_WORDS = 3;

/**
 * Turns noisy, unstructured OCR output (a whole card image, not just a
 * cropped name strip) into an ordered list of card-name guesses to try
 * against the API: words shorter than 4 characters are almost always OCR
 * noise or unrelated card text rather than part of the name, so they're
 * dropped; the remaining words are combined from most specific (all of
 * them, up to 3) down to just the first, so a caller can retry with a
 * shorter guess if the more specific one comes back with no match.
 */
export function extractNameCandidates(raw: string): string[] {
  const words = cleanOcrText(raw)
    .split(' ')
    .filter((word) => word.length >= MIN_WORD_LENGTH)
    .slice(0, MAX_CANDIDATE_WORDS);

  const candidates: string[] = [];
  for (let take = words.length; take >= 1; take--) {
    const candidate = words.slice(0, take).join(' ');
    if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
  }
  return candidates;
}
