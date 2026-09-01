import { Injectable, inject, signal } from '@angular/core';

import { PreconIndexData } from '../models/precon.model';
import { idbGet, idbGetAll, idbPut, openIndexedDb } from './indexed-db.util';
import { YugiohPreconService } from './yugioh-precon.service';

const DB_NAME = 'tcg-collector-yugioh-precons';
const DB_VERSION = 1;
const STORE_DECKS = 'deck-index';
const STORE_META = 'deck-index-meta';
const BATCH_SIZE = 8;

/**
 * Same purpose as DeckCardIndexService (background full-text index over
 * precon deck contents, cached in IndexedDB), but for Yu-Gi-Oh structure/
 * starter decks. Kept as a separate small service rather than a shared
 * parametrized one because the indexing policy genuinely differs: MTG only
 * eagerly indexes 2 of its many precon types to bound cost; the whole
 * Yu-Gi-Oh precon catalog (~85 decks) is cheap enough to index in full.
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
