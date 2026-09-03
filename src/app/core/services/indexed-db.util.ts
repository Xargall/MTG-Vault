export interface IndexDef {
  name: string;
  keyPath: string;
  unique?: boolean;
}

export interface StoreDef {
  name: string;
  indexes?: IndexDef[];
}

/** A plain string is equivalent to `{ name }` (no indexes) - existing callers are unaffected. */
export type StoreSpec = string | StoreDef;

export function openIndexedDb(name: string, version: number, stores: StoreSpec[]): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction!;
      for (const spec of stores) {
        const def: StoreDef = typeof spec === 'string' ? { name: spec } : spec;
        const store = db.objectStoreNames.contains(def.name)
          ? tx.objectStore(def.name)
          : db.createObjectStore(def.name);
        for (const index of def.indexes ?? []) {
          if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
          }
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function idbGetAll(db: IDBDatabase, store: string): Promise<Array<[IDBValidKey, unknown]>> {
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

export function idbGet(db: IDBDatabase, store: string, key: IDBValidKey): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function idbPut(db: IDBDatabase, store: string, key: IDBValidKey, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Writes many entries in a single transaction - much cheaper than one idbPut() per entry for a large batch. */
export function idbPutMany(db: IDBDatabase, store: string, entries: Array<[IDBValidKey, unknown]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const [key, value] of entries) os.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** First matching value for an exact key on a secondary index. */
export function idbGetByIndex(db: IDBDatabase, store: string, indexName: string, key: IDBValidKey): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).index(indexName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Every matching value for an exact key on a (non-unique) secondary index. */
export function idbGetAllByIndex(db: IDBDatabase, store: string, indexName: string, key: IDBValidKey): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).index(indexName).getAll(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Streams every [key, value] pair via a cursor without materializing them all in an array first - use for building a lightweight projection out of a large store. */
export function idbForEach(
  db: IDBDatabase,
  store: string,
  callback: (key: IDBValidKey, value: unknown) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        callback(cursor.key, cursor.value);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function idbCount(db: IDBDatabase, store: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
