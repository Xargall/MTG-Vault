// Downloads Scryfall's "default_cards" bulk file (every printing, ~120k+
// records) and upserts it into the `scryfall_cards` Postgres table (see
// supabase/sql/016_scryfall_cards.sql), which the Angular app then reads
// via plain PostgREST instead of the scryfall-proxy Edge Function - a
// live-debugging session found scryfall-proxy failing consistently on at
// least one real network while PostgREST queries against this project's
// own tables never did.
//
// Originally a Supabase Edge Function (sync-scryfall-cards) - moved here
// after that hit Edge Functions' CPU-time limit processing this much data
// in one invocation ("CPU Time exceeded", confirmed live). A normal CI
// runner (see .github/workflows/sync-scryfall-cards.yml, which runs this
// on a daily cron) has no comparable constraint.
//
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-scryfall-cards.mjs

import zlib from 'node:zlib';
import readline from 'node:readline';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const BULK_DATA_ENDPOINT = 'https://api.scryfall.com/bulk-data';
const USER_AGENT = 'TCGVault/1.0 (mathias-mayer.de)';
// One upsert per this many parsed rows, rather than one tiny upsert per
// card (network round-trip cost, ~120k+ times over) or a single upsert for
// the whole file (holds up incremental progress and risks a huge rollback
// on any mid-stream error) - same reasoning as WRITE_BATCH_SIZE in
// MtgBulkDataService (the client's own equivalent local-cache sync).
const BATCH_SIZE = 500;

/**
 * Same field selection as the client's own MtgBulkDataService.trimBulkCard
 * (its local IndexedDB cache for the scanner) - ported, not reinvented,
 * since that's already the proven-correct mapping. Flattened further here:
 * a double-faced card's image/mana_cost fall back to its first face right
 * here during sync, so the client never needs to know about card_faces at
 * all for these six migrated methods (see MtgApiService).
 */
function rowFromRawCard(raw) {
  const id = raw.id;
  const set = raw.set;
  const collectorNumber = raw.collector_number;
  if (typeof id !== 'string' || typeof set !== 'string' || typeof collectorNumber !== 'string') return null;

  const rawFaces = raw.card_faces;
  const parsePrice = (value) => (value ? parseFloat(value) : null);

  // A "reversible_card" layout (and a few other rare layouts) has no
  // top-level oracle_id - it lives per-face instead. oracle_id is a
  // `not null uuid` column, so a card with neither (rare - certain art
  // series/token objects) is skipped rather than upserted with an invalid
  // empty-string value.
  const oracleId = raw.oracle_id ?? rawFaces?.[0]?.oracle_id;
  if (!oracleId) return null;

  return {
    id,
    oracle_id: oracleId,
    name: String(raw.name ?? ''),
    printed_name: raw.printed_name ?? null,
    image_url: raw.image_uris?.normal ?? rawFaces?.[0]?.image_uris?.normal ?? null,
    set_code: set,
    set_name: String(raw.set_name ?? ''),
    collector_number: collectorNumber,
    rarity: String(raw.rarity ?? ''),
    released_at: raw.released_at ?? null,
    color_identity: raw.color_identity ?? [],
    mana_cost: raw.mana_cost ?? rawFaces?.[0]?.mana_cost ?? null,
    cmc: Number(raw.cmc ?? 0) || 0,
    type_line: String(raw.type_line ?? ''),
    price_eur: parsePrice(raw.prices?.eur),
    price_eur_foil: parsePrice(raw.prices?.eur_foil),
    price_usd: parsePrice(raw.prices?.usd),
    price_usd_foil: parsePrice(raw.prices?.usd_foil),
    cardmarket_url: raw.purchase_uris?.cardmarket ?? null,
  };
}

async function upsertBatch(batch) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/scryfall_cards`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`upsert failed (${response.status}): ${body}`);
  }
}

async function main() {
  console.log('Fetching bulk-data listing...');
  const infoResponse = await fetch(BULK_DATA_ENDPOINT, { headers: { 'User-Agent': USER_AGENT } });
  if (!infoResponse.ok) throw new Error(`bulk-data request failed (${infoResponse.status})`);
  const infoBody = await infoResponse.json();
  const defaultCards = infoBody.data.find((entry) => entry.type === 'default_cards');
  if (!defaultCards) throw new Error('"default_cards" not found in bulk-data listing');

  console.log(`Downloading ${defaultCards.jsonl_download_uri} (${defaultCards.compressed_size} bytes compressed)...`);
  const dataResponse = await fetch(defaultCards.jsonl_download_uri, { headers: { 'User-Agent': USER_AGENT } });
  if (!dataResponse.ok || !dataResponse.body) throw new Error(`bulk file download failed (${dataResponse.status})`);

  const gunzip = zlib.createGunzip();
  // Node's fetch Response.body is a web ReadableStream - pipe it into the
  // classic Node gunzip stream via Readable.fromWeb.
  const { Readable } = await import('node:stream');
  Readable.fromWeb(dataResponse.body).pipe(gunzip);

  const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

  let batch = [];
  let total = 0;
  let skippedBatches = 0;
  let lineCount = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    try {
      await upsertBatch(batch);
      total += batch.length;
    } catch (error) {
      console.error(`Batch of ${batch.length} failed, skipping:`, error.message);
      skippedBatches++;
    }
    batch = [];
  };

  for await (const line of rl) {
    lineCount++;
    if (!line.trim()) continue;
    let raw;
    try {
      raw = JSON.parse(line);
    } catch {
      continue;
    }
    const row = rowFromRawCard(raw);
    if (!row) continue;
    batch.push(row);
    if (batch.length >= BATCH_SIZE) await flush();
    if (lineCount % 20000 === 0) console.log(`...${lineCount} lines read, ${total} rows upserted so far`);
  }
  await flush();

  console.log(`Done. ${total} rows upserted, ${skippedBatches} batch(es) skipped, ${lineCount} lines read.`);
  if (skippedBatches > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('sync-scryfall-cards failed:', error);
  process.exit(1);
});
