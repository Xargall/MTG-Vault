import { Injectable, inject, signal } from '@angular/core';

import { MtgjsonService } from './mtgjson.service';

const DB_NAME = 'mtg-vault';
const DB_VERSION = 2;
const STORE_NAMES = 'deck-card-names';
const STORE_META = 'deck-card-names-meta';
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
      if (!db.objectStoreNames.contains(STORE_NAMES)) db.createObjectStore(STORE_NAMES);
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
 * Indexes every card name (commander + mainboard) in each Commander Deck /
 * Starter Kit precon, so the deck browser can be searched by any character or
 * card it contains, not just the retail product title (deck product names -
 * "Limit Break (FINAL FANTASY VII)" - rarely match what a player actually
 * remembers, e.g. "Sephiroth"). Building the index means downloading one full
 * deck JSON per entry anyway (~200 requests) to know its contents, so
 * indexing every card name in that same file costs no extra network bytes.
 * It happens once in the background and the result is cached permanently in
 * IndexedDB - later sessions load instantly.
 */
@Injectable({ providedIn: 'root' })
export class DeckCardIndexService {
  private readonly mtgjson = inject(MtgjsonService);

  private readonly entries = new Map<string, string[]>();
  readonly ready = signal(false);
  readonly indexedCount = signal(0);
  readonly totalCount = signal(0);

  private buildPromise: Promise<void> | null = null;

  matches(fileName: string, queryLower: string): boolean {
    const names = this.entries.get(fileName);
    return names ? names.some((name) => name.includes(queryLower)) : false;
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
      const cached = await idbGetAll(db, STORE_NAMES);
      for (const [key, value] of cached) {
        this.entries.set(String(key), value as string[]);
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
            const names = await this.mtgjson.getDeckCardNames(deck.fileName);
            const lower = names.map((name) => name.toLowerCase());
            this.entries.set(deck.fileName, lower);
            if (db) await idbPut(db, STORE_NAMES, deck.fileName, lower);
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
