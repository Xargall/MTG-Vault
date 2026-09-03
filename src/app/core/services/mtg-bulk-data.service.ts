import { Injectable, signal } from '@angular/core';

import { similarity } from '../utils/string-similarity';
import {
  idbClear,
  idbCount,
  idbForEach,
  idbGet,
  idbGetAllByIndex,
  idbGetByIndex,
  idbPut,
  idbPutMany,
  openIndexedDb,
} from './indexed-db.util';
import { ScryfallCardFace, ScryfallRawCard } from './mtg-api.service';

const DB_NAME = 'tcg-collector-mtg-bulk';
const DB_VERSION = 1;
const STORE_CARDS = 'cards';
const STORE_META = 'meta';
const INDEX_SET_NUMBER = 'by_set_number';
const INDEX_COLLECTOR_NUMBER = 'by_collector_number';

const BULK_DATA_ENDPOINT = 'https://api.scryfall.com/bulk-data';
// Same identifying UA MtgApiService sends - this service deliberately has no
// dependency on it (MtgApiService depends on this service, not the other
// way around), so the string is duplicated rather than shared.
const USER_AGENT = 'TCGVault/1.0 (mathias-mayer.de)';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// One IndexedDB transaction per this many parsed cards, rather than one
// tiny transaction per card (which would be drastically slower over
// ~120k+ rows) or a single transaction for the whole file (which would
// hold up the download's incremental progress and risks a huge rollback
// on any mid-stream error).
const WRITE_BATCH_SIZE = 2000;
// Only worth a full Levenshtein comparison against names within this many
// characters of the query's length - cheaply prunes the vast majority of
// the (~25k unique) name index before the expensive part runs.
const NAME_LENGTH_TOLERANCE = 6;
const MIN_FUZZY_SIMILARITY = 0.75;

interface BulkDataEntry {
  type: string;
  jsonl_download_uri: string;
  compressed_size: number;
  updated_at: string;
}

interface StoredCard extends ScryfallRawCard {
  /** `${set}/${collector_number}`, lowercase - backs the exact set+number index. */
  setNumberKey: string;
}

interface NameIndexEntry {
  id: string;
  name: string;
}

function trimBulkCard(raw: Record<string, unknown>): StoredCard | null {
  const id = raw['id'];
  const set = raw['set'];
  const collectorNumber = raw['collector_number'];
  if (typeof id !== 'string' || typeof set !== 'string' || typeof collectorNumber !== 'string') return null;

  const imageUris = raw['image_uris'] as { normal?: string; small?: string; art_crop?: string } | undefined;
  const rawFaces = raw['card_faces'] as
    | Array<{ image_uris?: { normal?: string; small?: string; art_crop?: string }; mana_cost?: string }>
    | undefined;
  const purchaseUris = raw['purchase_uris'] as { cardmarket?: string } | undefined;
  const prices = (raw['prices'] as StoredCard['prices'] | undefined) ?? {
    usd: null,
    usd_foil: null,
    eur: null,
    eur_foil: null,
  };

  // Every field the scanner's scoring/mapping (toCard(), scoreCandidate())
  // actually reads - everything else in the raw bulk record (legalities,
  // multiverse_ids, rulings_uri, every other image size, ...) is dropped to
  // keep local storage a fraction of the ~600MB decompressed source file.
  const card: StoredCard = {
    id,
    oracle_id: String(raw['oracle_id'] ?? ''),
    name: String(raw['name'] ?? ''),
    printed_name: raw['printed_name'] as string | undefined,
    type_line: String(raw['type_line'] ?? ''),
    printed_type_line: raw['printed_type_line'] as string | undefined,
    power: raw['power'] as string | undefined,
    toughness: raw['toughness'] as string | undefined,
    artist: raw['artist'] as string | undefined,
    keywords: raw['keywords'] as string[] | undefined,
    cmc: Number(raw['cmc'] ?? 0),
    color_identity: (raw['color_identity'] as string[] | undefined) ?? [],
    mana_cost: raw['mana_cost'] as string | undefined,
    set,
    set_name: String(raw['set_name'] ?? ''),
    collector_number: collectorNumber,
    rarity: String(raw['rarity'] ?? ''),
    released_at: String(raw['released_at'] ?? ''),
    image_uris: imageUris
      ? { normal: imageUris.normal ?? '', small: imageUris.small ?? '', art_crop: imageUris.art_crop ?? '' }
      : undefined,
    card_faces: rawFaces?.map(
      (face): ScryfallCardFace => ({
        image_uris: face.image_uris
          ? { normal: face.image_uris.normal ?? '', small: face.image_uris.small ?? '', art_crop: face.image_uris.art_crop ?? '' }
          : undefined,
        mana_cost: face.mana_cost,
      }),
    ),
    prices,
    purchase_uris: purchaseUris ? { cardmarket: purchaseUris.cardmarket } : undefined,
    setNumberKey: `${set.toLowerCase()}/${collectorNumber.toLowerCase()}`,
  };
  return card;
}

/**
 * Local, offline-capable card cache for the MTG scanner: downloads
 * Scryfall's "default_cards" bulk file (every printing, ~120k+ records)
 * once, keeps only the fields the scanner actually needs, and stores them
 * in IndexedDB for up to 24h before refreshing. MtgApiService checks this
 * first for both the exact set+number lookup and the fuzzy name fallback,
 * only reaching the live API on a local miss - once warm, most scans never
 * touch the network for identification at all.
 */
@Injectable({ providedIn: 'root' })
export class MtgBulkDataService {
  readonly ready = signal(false);
  readonly loading = signal(false);
  readonly progress = signal(0);
  readonly cardCount = signal(0);
  readonly errorMessage = signal<string | null>(null);

  private dbPromise: Promise<IDBDatabase> | null = null;
  private ensurePromise: Promise<void> | null = null;
  private nameIndexPromise: Promise<NameIndexEntry[]> | null = null;

  private getDb(): Promise<IDBDatabase> {
    return (this.dbPromise ??= openIndexedDb(DB_NAME, DB_VERSION, [
      {
        name: STORE_CARDS,
        indexes: [
          { name: INDEX_SET_NUMBER, keyPath: 'setNumberKey' },
          { name: INDEX_COLLECTOR_NUMBER, keyPath: 'collector_number' },
        ],
      },
      STORE_META,
    ]));
  }

  /** Kicks off the background download/refresh if the local cache is missing or older than 24h - idempotent, safe to call from anywhere (e.g. app start) without worrying about duplicate downloads. */
  ensureLoaded(): Promise<void> {
    return (this.ensurePromise ??= this.load());
  }

  private async load(): Promise<void> {
    try {
      const db = await this.getDb();
      const downloadedAt = (await idbGet(db, STORE_META, 'downloadedAt')) as number | undefined;
      const isFresh = !!downloadedAt && Date.now() - downloadedAt < CACHE_TTL_MS;

      if (isFresh) {
        const count = await idbCount(db, STORE_CARDS);
        if (count > 0) {
          this.cardCount.set(count);
          this.ready.set(true);
          console.log('Bulk-Data geladen:', count, 'Karten (aus Cache)');
          return;
        }
      }

      await this.download(db);
    } catch (error) {
      console.warn('Bulk-Data konnte nicht geladen werden:', error);
      this.errorMessage.set(error instanceof Error ? error.message : 'Bulk-Data konnte nicht geladen werden.');
      // Not fatal - MtgApiService falls back to the live API for everything
      // when this cache isn't ready, exactly like before this feature existed.
      this.ready.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  private async download(db: IDBDatabase): Promise<void> {
    this.loading.set(true);
    this.progress.set(0);
    this.errorMessage.set(null);

    const infoResponse = await fetch(BULK_DATA_ENDPOINT, { headers: { 'User-Agent': USER_AGENT } });
    if (!infoResponse.ok) throw new Error(`Scryfall-Bulk-Data-Anfrage fehlgeschlagen (${infoResponse.status})`);
    const infoBody: { data: BulkDataEntry[] } = await infoResponse.json();
    const defaultCards = infoBody.data.find((entry) => entry.type === 'default_cards');
    if (!defaultCards) throw new Error('"default_cards" nicht in Scryfalls Bulk-Data-Liste gefunden.');

    const dataResponse = await fetch(defaultCards.jsonl_download_uri, { headers: { 'User-Agent': USER_AGENT } });
    if (!dataResponse.ok || !dataResponse.body) {
      throw new Error(`Bulk-Data-Download fehlgeschlagen (${dataResponse.status})`);
    }

    await idbClear(db, STORE_CARDS);

    let bytesReceived = 0;
    const compressedSize = defaultCards.compressed_size || 1;
    // Measures progress on the still-compressed byte stream (matching
    // compressed_size from the bulk-data listing) - the decompressed size
    // isn't known up front, so tracking it instead would give no usable
    // percentage until the whole file had already downloaded.
    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        bytesReceived += chunk.byteLength;
        this.progress.set(Math.min(99, Math.round((bytesReceived / compressedSize) * 100)));
        controller.enqueue(chunk);
      },
    });

    // Cast through the DOM lib's stream generics: TS's DecompressionStream
    // typing declares a broader BufferSource writable side than the
    // Uint8Array-typed readable side TransformStream/fetch produce, which
    // pipeThrough()'s strict generic matching otherwise rejects even though
    // this is exactly the documented, correct way to gunzip a fetch body.
    const gunzip = new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
    const decoder = new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>;
    const textStream = dataResponse.body.pipeThrough(progressStream).pipeThrough(gunzip).pipeThrough(decoder);

    let batch: Array<[string, StoredCard]> = [];
    let total = 0;

    const flush = async () => {
      if (batch.length === 0) return;
      await idbPutMany(db, STORE_CARDS, batch);
      total += batch.length;
      this.cardCount.set(total);
      batch = [];
    };

    const processLine = async (line: string) => {
      if (!line) return;
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(line);
      } catch {
        return;
      }
      const card = trimBulkCard(raw);
      if (!card) return;
      batch.push([card.id, card]);
      if (batch.length >= WRITE_BATCH_SIZE) await flush();
    };

    // Streamed line-by-line rather than reading the whole response into one
    // string first - the decompressed file is ~600MB+, far more than
    // comfortable to hold as a single JS string on a mobile device.
    const reader = textStream.getReader();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        await processLine(buffer.slice(0, newlineIndex).trim());
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf('\n');
      }
    }
    await processLine(buffer.trim());
    await flush();

    await idbPut(db, STORE_META, 'downloadedAt', Date.now());
    await idbPut(db, STORE_META, 'sourceUpdatedAt', defaultCards.updated_at);

    // Best-effort: ask the browser not to evict this origin's storage under
    // pressure, given the point of the cache is to survive across sessions.
    void navigator.storage?.persist?.().catch(() => {});

    this.cardCount.set(total);
    this.progress.set(100);
    this.ready.set(true);
    this.nameIndexPromise = null; // rebuild lazily against the fresh data next time it's needed
    console.log('Bulk-Data geladen:', total, 'Karten');
  }

  /** Exact local lookup by set code (any case) + collector number - the scanner's primary, most reliable identification path. */
  async findBySetAndNumber(setCode: string, collectorNumber: string): Promise<ScryfallRawCard | null> {
    if (!this.ready()) return null;
    console.log('Lokaler Lookup für:', setCode, collectorNumber);
    const db = await this.getDb();
    const key = `${setCode.toLowerCase()}/${collectorNumber.toLowerCase()}`;
    const result = (await idbGetByIndex(db, STORE_CARDS, INDEX_SET_NUMBER, key)) as StoredCard | undefined;
    return result ?? null;
  }

  /** Every locally-known printing at this collector number, regardless of set - used when a number was read but no valid set code was, so the caller can score across all of them instead of guessing one. */
  async findAllByCollectorNumber(collectorNumber: string): Promise<ScryfallRawCard[]> {
    if (!this.ready()) return [];
    const db = await this.getDb();
    const results = (await idbGetAllByIndex(
      db,
      STORE_CARDS,
      INDEX_COLLECTOR_NUMBER,
      collectorNumber,
    )) as StoredCard[];
    return results;
  }

  /** Best fuzzy name match from the local cache, or null if nothing clears the similarity floor - only ever consulted, never trusted blindly (same as the network fuzzy fallback it replaces). */
  async findBestFuzzyNameMatch(name: string): Promise<ScryfallRawCard | null> {
    if (!this.ready()) return null;
    const nameIndex = await this.getNameIndex();

    let best: { id: string; score: number } | null = null;
    for (const entry of nameIndex) {
      if (Math.abs(entry.name.length - name.length) > NAME_LENGTH_TOLERANCE) continue;
      const score = similarity(name, entry.name);
      if (score >= MIN_FUZZY_SIMILARITY && (!best || score > best.score)) {
        best = { id: entry.id, score };
      }
    }
    if (!best) return null;

    const db = await this.getDb();
    const card = (await idbGet(db, STORE_CARDS, best.id)) as StoredCard | undefined;
    return card ?? null;
  }

  private getNameIndex(): Promise<NameIndexEntry[]> {
    return (this.nameIndexPromise ??= this.buildNameIndex());
  }

  private async buildNameIndex(): Promise<NameIndexEntry[]> {
    const db = await this.getDb();
    const index: NameIndexEntry[] = [];
    await idbForEach(db, STORE_CARDS, (_key, value) => {
      const card = value as StoredCard;
      index.push({ id: card.id, name: card.printed_name ?? card.name });
    });
    return index;
  }
}
