// Downloads YGOPRODeck's full card database (misc=yes - every card) and
// upserts it into the `ygoprodeck_cards` / `ygoprodeck_print_codes` Postgres
// tables (see supabase/sql/022_ygoprodeck_cards.sql), which the Angular app
// then reads via plain PostgREST instead of hitting YGOPRODeck live on every
// search/get/scan - same reasoning as scripts/sync-scryfall-cards.mjs for
// MTG. Simpler than that script: YGOPRODeck's whole database is one JSON
// response (~13k cards), no gzip/streaming needed.
//
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-ygoprodeck-cards.mjs

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const CARD_INFO_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes';
// Building the print-code mirror from misc=yes's own per-card `card_sets`
// field (as this script used to do) silently misses real printings for any
// card with enough reprints that YGOPRODeck's own API seems to truncate
// that field - live-confirmed 2026-10-29: "Dark Magician"/"Barrel Dragon"/
// "Elemental HERO Neos" (all heavily reprinted) are each missing their
// Hidden Arsenal: Chapter 1 printing (HAC1-EN002/EN006/EN004) from BOTH
// misc=yes and a plain cardinfo.php?name= lookup, even though
// cardinfo.php?cardset=... for that exact set returns it correctly - this
// is an upstream YGOPRODeck data/API inconsistency, not something this
// script's own parsing was getting wrong. Querying every known set via
// cardsetsEndpoint+cardset= below instead is slower (~1000 extra requests)
// but is the only path that's actually returned complete per-printing data
// so far.
const CARD_SETS_ENDPOINT = 'https://db.ygoprodeck.com/api/v7/cardsets.php';
const CARD_INFO_BY_SET_PARAM = 'cardset';
// Polite pacing across ~1000 sequential cardset requests - same idea as
// YgoprodeckDecksService's own MIN_DELAY_MS for the live deck-browser API,
// just a plain sequential script rather than a per-user rate limiter.
const SET_FETCH_DELAY_MS = 400;
const BATCH_SIZE = 500;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/** Same field selection as YugiohApiService.toCard() - the first card_sets entry backs set_name/rarity, matching what the client already showed from live data. */
function cardRowFromRaw(raw) {
  const price = raw.card_prices?.[0];
  const parsePrice = (value) => {
    const parsed = value ? parseFloat(value) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  const firstSet = raw.card_sets?.[0];

  return {
    id: raw.id,
    name: String(raw.name ?? ''),
    card_type: String(raw.type ?? ''),
    attribute: raw.attribute ?? null,
    atk: raw.atk ?? null,
    def: raw.def ?? null,
    image_url: raw.card_images?.[0]?.image_url ?? null,
    image_url_small: raw.card_images?.[0]?.image_url_small ?? null,
    price_eur: parsePrice(price?.cardmarket_price),
    price_usd: parsePrice(price?.tcgplayer_price),
    set_name: firstSet?.set_name ?? null,
    rarity: firstSet?.set_rarity ?? null,
    banlist_status: raw.banlist_info?.ban_tcg ?? null,
    synced_at: new Date().toISOString(),
  };
}

/** One row per card_sets entry - a card can (and usually does) have several print codes across different sets/rarities. */
function printCodeRowsFromRaw(raw) {
  if (!Array.isArray(raw.card_sets)) return [];
  return raw.card_sets
    .filter((set) => typeof set.set_code === 'string' && set.set_code.length > 0)
    .map((set) => ({
      set_code: set.set_code,
      card_id: raw.id,
      set_name: set.set_name ?? null,
      set_rarity: set.set_rarity ?? null,
    }));
}

async function fetchSets() {
  const response = await fetch(CARD_SETS_ENDPOINT, {
    headers: { 'User-Agent': 'TCGVault/1.0 (mathias-mayer.de)' },
  });
  if (!response.ok) throw new Error(`cardsets.php request failed (${response.status})`);
  return response.json();
}

async function fetchCardsForSet(setName) {
  const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?${CARD_INFO_BY_SET_PARAM}=${encodeURIComponent(setName)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TCGVault/1.0 (mathias-mayer.de)' } });
  // Mirrors YugiohApiService.fetchCardInfo's own handling - YGOPRODeck
  // returns 400 (not an empty list) when a cardset query matches nothing.
  if (response.status === 400) return [];
  if (!response.ok) throw new Error(`cardinfo.php?cardset failed (${response.status})`);
  const body = await response.json();
  return body.data ?? [];
}

async function fetchCardsForSetWithRetry(setName) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchCardsForSet(setName);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      console.error(`Fetching set "${setName}" failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}

/**
 * Builds the complete print-code table by querying every known set
 * individually (see CARD_SETS_ENDPOINT's doc on why misc=yes's own
 * card_sets field isn't trustworthy on its own). Deduped by set_code (last
 * one wins) for two reasons: the same card/set code legitimately turns up
 * again and again across many different cardset queries (every set a
 * reprinted card belongs to returns that card's full, same card_sets
 * list), and Postgres's upsert rejects a batch that affects the same
 * conflict-target row twice in one statement ("ON CONFLICT DO UPDATE
 * command cannot affect row a second time") - duplicates must be
 * collapsed before flushInBatches, not left for the DB to sort out.
 *
 * Also returns extraCardRows: live-confirmed 2026-10-29, a handful of
 * card ids (distinct alternate-artwork printings, e.g. a Duel Terminal
 * parallel-rare "Dark Magician" under its own numeric id 46986421) are
 * completely absent from the bulk misc=yes dump - not just missing a
 * card_sets entry, the id itself never appears there at all - yet a
 * cardset= query for a set that uses that exact artwork returns the full
 * card object for it anyway. Upserting a print-code row for such an id
 * without its own ygoprodeck_cards row first violates
 * ygoprodeck_print_codes_card_id_fkey and silently drops the whole
 * surrounding batch of up to BATCH_SIZE otherwise-valid rows with it
 * (confirmed live: several hundred good rows lost to a handful of these).
 * Since the cardset= response already carries this card's full data
 * (name/image/atk/def/...), collecting it here costs zero extra requests -
 * main() just upserts these into ygoprodeck_cards before
 * ygoprodeck_print_codes, so the FK always has something to point at.
 */
async function fetchAllPrintCodeRows(knownCardIds) {
  const sets = await fetchSets();
  console.log(`Found ${sets.length} sets.`);

  const printCodeRowsByCode = new Map();
  const extraCardRowsById = new Map();
  let setsFailed = 0;
  for (const [index, set] of sets.entries()) {
    try {
      const cards = await fetchCardsForSetWithRetry(set.set_name);
      for (const raw of cards) {
        if (typeof raw.id !== 'number') continue;
        if (!knownCardIds.has(raw.id) && !extraCardRowsById.has(raw.id)) {
          extraCardRowsById.set(raw.id, cardRowFromRaw(raw));
        }
        for (const row of printCodeRowsFromRaw(raw)) {
          printCodeRowsByCode.set(row.set_code, row);
        }
      }
    } catch (error) {
      console.error(`Fetching set "${set.set_name}" failed, skipping:`, error.message);
      setsFailed++;
    }
    if ((index + 1) % 100 === 0) console.log(`  ...${index + 1}/${sets.length} sets fetched`);
    await new Promise((resolve) => setTimeout(resolve, SET_FETCH_DELAY_MS));
  }

  if (setsFailed > 0) console.error(`${setsFailed} set(s) failed after retries and were skipped.`);
  if (extraCardRowsById.size > 0) {
    console.log(`Found ${extraCardRowsById.size} card id(s) present in set data but missing from misc=yes.`);
  }
  return { printCodeRows: [...printCodeRowsByCode.values()], extraCardRows: [...extraCardRowsById.values()] };
}

async function upsertBatch(table, batch) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
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
    throw new Error(`upsert into ${table} failed (${response.status}): ${body}`);
  }
}

async function upsertBatchWithRetry(table, batch) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await upsertBatch(table, batch);
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      console.error(`Batch of ${batch.length} into ${table} failed (attempt ${attempt}/${MAX_ATTEMPTS}), retrying:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
}

async function flushInBatches(table, rows) {
  let upserted = 0;
  let skippedBatches = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    try {
      await upsertBatchWithRetry(table, batch);
      upserted += batch.length;
    } catch (error) {
      console.error(`Batch of ${batch.length} into ${table} failed, skipping:`, error.message);
      skippedBatches++;
    }
  }
  return { upserted, skippedBatches };
}

async function main() {
  console.log('Fetching YGOPRODeck card database...');
  const response = await fetch(CARD_INFO_ENDPOINT, {
    headers: { 'User-Agent': 'TCGVault/1.0 (mathias-mayer.de)' },
  });
  if (!response.ok) throw new Error(`cardinfo.php request failed (${response.status})`);
  const body = await response.json();
  const cards = body.data ?? [];
  console.log(`Fetched ${cards.length} cards.`);

  const cardRows = [];
  const knownCardIds = new Set();
  for (const raw of cards) {
    if (typeof raw.id !== 'number') continue;
    cardRows.push(cardRowFromRaw(raw));
    knownCardIds.add(raw.id);
  }

  console.log('Fetching print codes set-by-set (see CARD_SETS_ENDPOINT doc)...');
  const { printCodeRows, extraCardRows } = await fetchAllPrintCodeRows(knownCardIds);
  // Must land in ygoprodeck_cards before ygoprodeck_print_codes is upserted
  // below, or the FK violation this whole thing exists to avoid happens
  // anyway - see fetchAllPrintCodeRows' own doc.
  cardRows.push(...extraCardRows);

  console.log(`Upserting ${cardRows.length} cards...`);
  const cardResult = await flushInBatches('ygoprodeck_cards', cardRows);
  console.log(`Done: ${cardResult.upserted} rows upserted, ${cardResult.skippedBatches} batch(es) skipped.`);

  console.log(`Upserting ${printCodeRows.length} print codes...`);
  const printCodeResult = await flushInBatches('ygoprodeck_print_codes', printCodeRows);
  console.log(`Done: ${printCodeResult.upserted} rows upserted, ${printCodeResult.skippedBatches} batch(es) skipped.`);

  if (cardResult.skippedBatches > 0 || printCodeResult.skippedBatches > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('sync-ygoprodeck-cards failed:', error);
  process.exit(1);
});
