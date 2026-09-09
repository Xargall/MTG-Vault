-- Local mirror of Scryfall's MTG bulk card data ("default_cards" - every
-- printing), kept in sync by the sync-scryfall-cards Edge Function (see
-- 017_scryfall_cards_sync_cron.sql for the schedule). Queried by the client
-- via plain PostgREST (this.supabase.client.from('scryfall_cards')...)
-- instead of the scryfall-proxy Edge Function - a live-debugging session
-- found scryfall-proxy failing consistently on at least one real network
-- while PostgREST queries against this project's own tables never did.
--
-- Public reference data, not user-owned - RLS allows anyone to read, and
-- only the sync function (via its service-role client, which bypasses RLS
-- entirely) ever writes to it.
--
-- Safe to re-run.

create table if not exists scryfall_cards (
  -- Scryfall's own per-printing id (not oracle_id - many rows share one
  -- oracle_id, one per printing) - lets getCardsByIds resolve a user's
  -- specific owned printing exactly, matching MtgBulkDataService's existing
  -- IndexedDB cache (STORE_CARDS, also keyed by id).
  id uuid primary key,
  oracle_id uuid not null,
  name text not null,
  printed_name text,
  -- Pre-resolved flat values - a double-faced card's fallback to its first
  -- face's image/mana_cost (see MtgApiService.toCard()) is already applied
  -- during sync, so no nested card_faces JSON needs to be stored or parsed
  -- client-side.
  image_url text,
  set_code text not null,
  set_name text not null,
  collector_number text not null,
  rarity text not null,
  released_at date,
  color_identity text[] not null default '{}',
  mana_cost text,
  cmc numeric not null default 0,
  type_line text not null,
  price_eur numeric,
  price_eur_foil numeric,
  price_usd numeric,
  price_usd_foil numeric,
  cardmarket_url text,
  synced_at timestamptz not null default now()
);

create index if not exists scryfall_cards_oracle_id_idx on scryfall_cards (oracle_id);
create index if not exists scryfall_cards_set_number_idx on scryfall_cards (set_code, collector_number);
create index if not exists scryfall_cards_name_idx on scryfall_cards (lower(name));

alter table scryfall_cards enable row level security;

drop policy if exists "Anyone can read scryfall cards" on scryfall_cards;
create policy "Anyone can read scryfall cards"
  on scryfall_cards for select
  using (true);
