interface TtlCacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Reads a JSON value previously written by writeTtlCache(), or `fallback` if it's missing, unparseable, or older than `ttlMs`. */
export function readTtlCache<T>(key: string, ttlMs: number, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const { data, timestamp } = JSON.parse(raw) as TtlCacheEntry<T>;
    if (Date.now() - timestamp >= ttlMs) return fallback;
    return data;
  } catch {
    return fallback;
  }
}

export function writeTtlCache<T>(key: string, data: T): void {
  try {
    const entry: TtlCacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Storage full/unavailable (private browsing) - not fatal, just means
    // the next session fetches fresh instead of from cache.
  }
}
