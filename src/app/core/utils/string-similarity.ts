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

const MIN_CANDIDATE_LENGTH = 4;
const MAX_CANDIDATE_WORDS = 3;
const SHORT_TOKEN = /^\w{1,2}$/;

/**
 * Reduces raw, noisy OCR output to a plausible card-name candidate: isolated
 * 1-2 character tokens are almost always OCR noise rather than part of the
 * name, so this keeps only the longest contiguous run of words longer than
 * that, then caps the result at a few words (card names are rarely longer).
 * Returns null if nothing long enough survives - callers should skip the
 * API lookup entirely in that case rather than search on noise.
 */
export function extractNameCandidate(raw: string): string | null {
  const words = cleanOcrText(raw).split(' ').filter(Boolean);

  let bestRun: string[] = [];
  let currentRun: string[] = [];
  for (const word of words) {
    if (SHORT_TOKEN.test(word)) {
      if (currentRun.length > bestRun.length) bestRun = currentRun;
      currentRun = [];
    } else {
      currentRun.push(word);
    }
  }
  if (currentRun.length > bestRun.length) bestRun = currentRun;

  const candidate = bestRun.slice(0, MAX_CANDIDATE_WORDS).join(' ');
  return candidate.length >= MIN_CANDIDATE_LENGTH ? candidate : null;
}
