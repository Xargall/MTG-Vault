-- Adds fields scripts/sync-scryfall-cards.mjs already has available from
-- Scryfall's bulk data but previously dropped during sync - needed as the
-- data foundation for a future cross-game deck-recommendation feature
-- (keywords for synergy matching, legalities for format-aware validation,
-- edhrec_rank for a popularity signal, power/toughness for creature-curve
-- heuristics). Not consumed by the app yet - this only lands the columns so
-- the next sync run starts populating them.
--
-- Safe to re-run.

alter table scryfall_cards add column if not exists keywords text[] not null default '{}';
alter table scryfall_cards add column if not exists legalities jsonb;
alter table scryfall_cards add column if not exists edhrec_rank integer;
alter table scryfall_cards add column if not exists power text;
alter table scryfall_cards add column if not exists toughness text;
