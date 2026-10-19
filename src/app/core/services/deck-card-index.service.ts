import { Injectable, inject, signal } from '@angular/core';

import { PreconIndexData } from '../models/precon.model';
import { idbClear, idbGet, idbGetAll, idbPut, openIndexedDb } from './indexed-db.util';
import { MtgPreconService } from './mtg-precon.service';

const DB_NAME = 'mtg-vault';
const DB_VERSION = 3;
const STORE_DECKS = 'deck-index';
const STORE_META = 'deck-index-meta';
const BATCH_SIZE = 8;
// Bumped whenever MtgjsonService.getDeckIndexData's own parsing logic
// changes in a way that invalidates already-cached entries - not just
// newly-available Scryfall data, which skippedCount already recovers from
// on its own (see the comment below). Live-confirmed gap: precon bonus
// tokens (e.g. Keen Engineering's Thopter tokens) were added to that
// parsing, but an already-cached, fully-resolved entry has no way to know
// the *parsing itself* changed - skippedCount stays 0, so it never gets
// refetched. Bumping this clears the whole cache once and rebuilds it.
const SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = 'schemaVersion';

// Only types where the fetch cost (one full deck JSON per entry) stays small
// enough to index eagerly in the background. Bigger buckets (Theme Deck, Intro
// Pack, ...) are also less commonly searched for by a contained card/character
// name, so they're left out to keep the one-time download bounded.
const INDEXED_TYPES = ['Commander Deck', 'Starter Kit'];

/**
 * Indexes every card name and the resolved card+quantity list (commander +
 * mainboard + bonus tokens) for each Commander Deck / Starter Kit precon, so the deck
 * browser can be searched by any character or card it contains (not just
 * the retail product title), and so a "which precons am I already mostly
 * done with" scan can run entirely offline against this cache - building it
 * means downloading one full deck JSON per entry anyway (~200 requests), so
 * extracting everything from that same file costs no extra network bytes.
 * It happens once in the background and the result is cached permanently in
 * IndexedDB - later sessions load instantly.
 */
@Injectable({ providedIn: 'root' })
export class DeckCardIndexService {
  private readonly mtgPrecon = inject(MtgPreconService);

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
        // is suspect, not just the ones with skipped cards, so start clean
        // rather than mixing old- and new-shape entries together.
        await idbClear(db, STORE_DECKS);
        await idbPut(db, STORE_META, SCHEMA_VERSION_KEY, SCHEMA_VERSION);
      } else {
        const cached = await idbGetAll(db, STORE_DECKS);
        for (const [key, value] of cached) {
          this.entries.set(String(key), value as PreconIndexData);
        }
        this.indexedCount.set(this.entries.size);

        // A completed cache is usable right away - the refresh pass below
        // still runs, but only re-fetches the few entries that need it.
        const complete = await idbGet(db, STORE_META, 'complete');
        if (complete) this.ready.set(true);
      }
    }

    // Not just "anything missing from the cache": a precon that MTGJSON
    // lists from its decklist announcement on has no scryfallIds yet until
    // Scryfall catches up, so it got cached with every card skipped - and
    // the old "complete, never look again" shortcut froze it like that for
    // good. Reported on Keen Engineering (FDC, listed before its release):
    // adding it created a deck stuck at 0% completion. Newly
    // released precons were never picked up after the first build either.
    const list = await this.mtgPrecon.getDeckList();
    const targets = list.filter((deck) => {
      if (!INDEXED_TYPES.includes(deck.type)) return false;
      const cached = this.entries.get(deck.fileName);
      return !cached || cached.skippedCount > 0;
    });
    if (targets.length === 0) {
      this.ready.set(true);
      return;
    }
    this.totalCount.set(this.entries.size + targets.length);

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (deck) => {
          try {
            const data = await this.mtgPrecon.getDeckIndexData(deck.fileName);
            const indexed: PreconIndexData = { ...data, names: data.names.map((name) => name.toLowerCase()) };
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
