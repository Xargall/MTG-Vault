/** Raw edit distance, exported for callers that need the count itself (not the normalized 0-1 ratio `similarity` derives from it) - e.g. comparing a scanned Yu-Gi-Oh! set prefix against a cached one. */
export function levenshtein(a: string, b: string): number {
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

export interface OcrLineLike {
  text: string;
  confidence: number;
}
