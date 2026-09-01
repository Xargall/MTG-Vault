import { Injectable, inject, signal } from '@angular/core';

import { MtgjsonResolvedCard, MtgjsonService } from './mtgjson.service';

export interface IndexedDeck {
  names: string[];
  heroScryfallId: string | null;
  cards: MtgjsonResolvedCard[];
  skippedCount: number;
}

const DB_NAME = 'mtg-vault';
const DB_VERSION = 3;
const STORE_DECKS = 'deck-index';
const STORE_META = 'deck-index-meta';
const BATCH_SIZE = 8;

// Only types where the fetch cost (one full deck JSON per entry) stays small
// enough to index eagerly in the background. Bigger buckets (Theme Deck, Intro
// Pack, ...) are also less commonly searched for by a contained card/character
// name, so they're left out to keep the one-time download bounded.
const INDEXED_TYPES = ['Commander Deck', 'Starter Kit'];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DECKS)) db.createObjectStore(STORE_DECKS);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGetAll(db: IDBDatabase, store: string): Promise<Array<[IDBValidKey, unknown]>> {
  return new Promise((resolve, reject) => {
    const entries: Array<[IDBValidKey, unknown]> = [];
    const request = db.transaction(store, 'readonly').objectStore(store).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        entries.push([cursor.key, cursor.value]);
        cursor.continue();
      } else {
        resolve(entries);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db: IDBDatabase, store: string, key: IDBValidKey): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db: IDBDatabase, store: string, key: IDBValidKey, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Indexes every card name and the resolved scryfallId+quantity list
 * (commander + mainboard) for each Commander Deck / Starter Kit precon, so
 * the deck browser can be searched by any character or card it contains
 * (not just the retail product title), and so a "which precons am I already
 * mostly done with" scan can run entirely offline against this cache -
 * building it means downloading one full deck JSON per entry anyway
 * (~200 requests), so extracting everything from that same file costs no
 * extra network bytes. It happens once in the background and the result is
 * cached permanently in IndexedDB - later sessions load instantly.
 */
@Injectable({ providedIn: 'root' })
export class DeckCardIndexService {
  private readonly mtgjson = inject(MtgjsonService);

  private readonly entries = new Map<string, IndexedDeck>();
  readonly ready = signal(false);
  readonly indexedCount = signal(0);
  readonly totalCount = signal(0);

  private buildPromise: Promise<void> | null = null;

  matches(fileName: string, queryLower: string): boolean {
    const entry = this.entries.get(fileName);
    return entry ? entry.names.some((name) => name.includes(queryLower)) : false;
  }

  getEntry(fileName: string): IndexedDeck | undefined {
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
      db = await openDb();
    } catch {
      db = null;
    }

    if (db) {
      const cached = await idbGetAll(db, STORE_DECKS);
      for (const [key, value] of cached) {
        this.entries.set(String(key), value as IndexedDeck);
      }
      this.indexedCount.set(this.entries.size);

      const complete = await idbGet(db, STORE_META, 'complete');
      if (complete) {
        this.ready.set(true);
        return;
      }
    }

    const list = await this.mtgjson.getDeckList();
    const targets = list.filter(
      (deck) => INDEXED_TYPES.includes(deck.type) && !this.entries.has(deck.fileName),
    );
    this.totalCount.set(this.entries.size + targets.length);

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (deck) => {
          try {
            const data = await this.mtgjson.getDeckIndexData(deck.fileName);
            const indexed: IndexedDeck = { ...data, names: data.names.map((name) => name.toLowerCase()) };
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
