-- Local mirror of YGOPRODeck's Yu-Gi-Oh card database, kept in sync by
-- scripts/sync-ygoprodeck-cards.mjs (see
-- .github/workflows/sync-ygoprodeck-cards.yml for the schedule) - same
-- pattern as scryfall_cards (016_scryfall_cards.sql) for MTG. Queried by the
-- client via plain PostgREST instead of hitting YGOPRODeck live on every
-- search/get/scan.
--
-- Two tables, not one: unlike Scryfall (one row per printing), YGOPRODeck's
-- own numeric card id is already the client's Card.id for Yu-Gi-Oh (no
-- per-printing/foil concept - see YugiohApiService.toCard/card.model.ts), so
-- ygoprodeck_cards holds one row per *card*. A card's print codes (its
-- card_sets array, e.g. "SDAZ-DE001") fan out into ygoprodeck_print_codes
-- instead, so identifyByPrintCode's exact scanner lookup stays a plain O(1)
-- equality query rather than a jsonb-array search.
--
-- Public reference data, not user-owned - RLS allows anyone to read, and
-- only the sync script (via its service-role client, which bypasses RLS
-- entirely) ever writes to it.
--
-- Safe to re-run.

create table if not exists ygoprodeck_cards (
  id integer primary key,
  name text not null,
  card_type text not null,
  attribute text,
  atk integer,
  def integer,
  image_url text,
  image_url_small text,
  price_eur numeric,
  price_usd numeric,
  -- First card_sets entry's set_name/rarity - same "pick the first print for
  -- display" choice YugiohApiService.toCard already made against live data.
  set_name text,
  rarity text,
  banlist_status text,
  synced_at timestamptz not null default now()
);

create index if not exists ygoprodeck_cards_name_idx on ygoprodeck_cards (lower(name));

alter table ygoprodeck_cards enable row level security;

drop policy if exists "Anyone can read ygoprodeck cards" on ygoprodeck_cards;
create policy "Anyone can read ygoprodeck cards"
  on ygoprodeck_cards for select
  using (true);

create table if not exists ygoprodeck_print_codes (
  set_code text primary key,
  card_id integer not null references ygoprodeck_cards (id) on delete cascade,
  set_name text,
  set_rarity text
);

create index if not exists ygoprodeck_print_codes_card_id_idx on ygoprodeck_print_codes (card_id);

alter table ygoprodeck_print_codes enable row level security;

drop policy if exists "Anyone can read ygoprodeck print codes" on ygoprodeck_print_codes;
create policy "Anyone can read ygoprodeck print codes"
  on ygoprodeck_print_codes for select
  using (true);
