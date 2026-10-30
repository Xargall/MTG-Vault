import { Injectable, inject, signal } from '@angular/core';

import { PreconIndexData } from '../models/precon.model';
import { idbClear, idbGet, idbGetAll, idbPut, openIndexedDb } from './indexed-db.util';
import { YugiohPreconService } from './yugioh-precon.service';

const DB_NAME = 'tcg-collector-yugioh-precons';
const DB_VERSION = 1;
const STORE_DECKS = 'deck-index';
const STORE_META = 'deck-index-meta';
const BATCH_SIZE = 8;
// Bumped whenever YugiohPreconService.getDeckIndexData's own parsing logic
// changes in a way that invalidates already-cached entries, same reasoning
// as DeckCardIndexService's SCHEMA_VERSION. v2: quantity went from a flat 1
// per unique card to the real per-card copy count (counted via each card's
// own card_sets entries) - an already-cached v1 entry has no way to know
// the *parsing itself* changed, so it would otherwise keep under-reporting
// quantities forever instead of getting refetched.
const SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = 'schemaVersion';

/**
 * Same purpose as DeckCardIndexService (background full-text index over
 * precon deck contents, cached in IndexedDB), but for Yu-Gi-Oh structure/
 * starter decks. Kept as a separate small service rather than a shared
 * parametrized one because the indexing policy genuinely differs: MTG only
 * eagerly indexes 2 of its many precon types to bound cost; the whole
 * Yu-Gi-Oh precon catalog (~105 decks) is cheap enough to index in full.
 */
@Injectable({ providedIn: 'root' })
export class YugiohPreconIndexService {
  private readonly precon = inject(YugiohPreconService);

  private readonly entries = new Map<string, PreconIndexData>();
  readonly ready = signal(false);
  readonly indexedCount = signal(0);
  readonly totalCount = signal(0);

  private buildPromise: Promise<void> | null = null;

  matches(fileName: string, queryLower: string): boolean {
    const entry = this.entries.get(fileName);
    return entry ? entry.names.some((name) => name.includes(queryLower)) : false;
  }

  getEntry(fileName: string): PreconIndexData | undefined {
    return this.entries.get(fileName);
  }

  ensureBuilding(): void {
    if (this.buildPromise) return;
    this.buildPromise = this.build().catch(() => {
      this.ready.set(true);
    });
  }

  private async build(): Promise<void> {
    let db: IDBDatabase | null = null;
    try {
      db = await openIndexedDb(DB_NAME, DB_VERSION, [STORE_DECKS, STORE_META]);
    } catch {
      db = null;
    }

    if (db) {
      const cachedSchemaVersion = await idbGet(db, STORE_META, SCHEMA_VERSION_KEY);
      if (cachedSchemaVersion !== SCHEMA_VERSION) {
        // Parsing itself changed since this cache was built - every entry
        // is suspect, not just the ones that look incomplete, so start
        // clean rather than mixing old- and new-shape entries together.
        await idbClear(db, STORE_DECKS);
        await idbPut(db, STORE_META, SCHEMA_VERSION_KEY, SCHEMA_VERSION);
      } else {
        const cached = await idbGetAll(db, STORE_DECKS);
        for (const [key, value] of cached) {
          this.entries.set(String(key), value as PreconIndexData);
        }
        this.indexedCount.set(this.entries.size);

        const complete = await idbGet(db, STORE_META, 'complete');
        if (complete) {
          this.ready.set(true);
          return;
        }
      }
    }

    const list = await this.precon.getDeckList();
    const targets = list.filter((deck) => !this.entries.has(deck.fileName));
    this.totalCount.set(this.entries.size + targets.length);

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (deck) => {
          try {
            const data = await this.precon.getDeckIndexData(deck.fileName);
            const indexed: PreconIndexData = {
              ...data,
              names: data.names.map((name) => name.toLowerCase()),
            };
            this.entries.set(deck.fileName, indexed);
            if (db) await idbPut(db, STORE_DECKS, deck.fileName, indexed);
          } catch {
            // Skip decks that fail to load - don't block the rest of the index.
          }
        }),
      );
      this.indexedCount.set(this.entries.size);
    }

    if (db) await idbPut(db, STORE_META, 'complete', true);
    this.ready.set(true);
  }
}
