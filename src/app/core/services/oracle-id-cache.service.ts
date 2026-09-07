import { Injectable, inject } from '@angular/core';

import { MtgApiService } from './mtg-api.service';

// EDHREC's average-deck/card-page responses carry only card names, never a
// Scryfall id - resolving each name's oracle_id lets EDHREC-driven matching
// (commander recommendations) recognize a card owned under a different
// printing (or a localized/German print name, which a plain name match
// would otherwise silently miss - see commander-recommendations-stats.ts).
const RESOLVE_DELAY_MS = 100;

/**
 * In-memory only, per session - not IndexedDB. A card's oracle_id itself
 * never changes, but the cache key here is a free-text name pulled from
 * EDHREC, not a stable id - cheap enough to resolve fresh each session
 * (paced through MtgApiService's own rate-limited queue either way) rather
 * than risk trusting a persisted name->id mapping indefinitely.
 */
@Injectable({ providedIn: 'root' })
export class OracleIdCacheService {
  private readonly mtgApi = inject(MtgApiService);
  private readonly cache = new Map<string, Promise<string | null>>();

  resolveOracleId(cardName: string): Promise<string | null> {
    const key = cardName.toLowerCase();
    let cached = this.cache.get(key);
    if (!cached) {
      cached = this.mtgApi
        .getCardByFuzzyName(cardName)
        .then((card) => card?.oracleId ?? null)
        .catch(() => null);
      this.cache.set(key, cached);
    }
    return cached;
  }

  /** Sequential with an explicit gap between lookups - a second, more conservative layer of rate-limiting on top of MtgApiService's own queue, specifically for a burst of many uncached names at once (a fresh commander's full average decklist). Already-cached names resolve instantly with no gap. */
  async resolveMany(cardNames: string[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    for (const name of cardNames) {
      const key = name.toLowerCase();
      const wasCached = this.cache.has(key);
      result.set(name, await this.resolveOracleId(name));
      if (!wasCached) await new Promise((r) => setTimeout(r, RESOLVE_DELAY_MS));
    }
    return result;
  }
}
