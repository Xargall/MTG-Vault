-- Fixes a 409 Conflict found live (2026-10-27) right after
-- 040_collection_set_code.sql shipped: scanning a card whose card_id
-- already had a collection row (added before set_code existed, so
-- set_code=null) under a *different* now-known set_code correctly looked
-- like a new row to the application (040's own upsertOne query, which DOES
-- filter on set_code) - but collection_cards' existing unique constraint
-- (023_collection_language.sql) only covers
-- (user_id, game_id, card_id, foil, finish, language), with no set_code at
-- all. The DB itself still enforced "one row per card_id/foil/finish/
-- language" regardless of set_code, so the INSERT 040 intended to allow
-- (a second, differently-printed row) was rejected as a duplicate of the
-- first - 040 added set_code to the *application's* own dedup check but
-- missed updating the actual DB constraint to match.
--
-- set_code is nullable; Postgres already treats NULL as distinct from any
-- other value in a unique constraint, which is exactly the semantics
-- wanted here (every pre-existing/non-Yu-Gi-Oh! null-set_code row stays
-- free to coexist, never falsely deduped against each other or against a
-- specific print), so it's safe to simply add it to the same constraint,
-- same column list 023 already uses plus this one.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

-- Postgres silently truncates an identifier past 63 chars (NAMEDATALEN) -
-- 023's own migration *asked* for the "_key" suffix, but the constraint
-- that actually exists on disk is the truncated name below (confirmed live
-- via pg_constraint before writing this). DROP by the real name.
alter table collection_cards drop constraint if exists collection_cards_user_id_game_id_card_id_foil_finish_language_k;
alter table collection_cards drop constraint if exists collection_cards_user_id_game_id_card_id_foil_finish_language_key;
alter table collection_cards add constraint collection_cards_user_id_game_id_card_id_foil_finish_lang_set_key
  unique (user_id, game_id, card_id, foil, finish, language, set_code);
