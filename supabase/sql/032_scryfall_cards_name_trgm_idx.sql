-- Card-name search (MtgApiService.searchCards) runs two queries on
-- scryfall_cards: a prefix match `name ilike 'Sol Ring%'` and a word-boundary
-- match `name ~* '\ySol Ring'`, both filtered to lang = 'en'. Neither ILIKE
-- nor a case-insensitive regex can use the plain btree indexes from
-- 016_scryfall_cards.sql (lower(name)) or 020 (name) - so since
-- 025_scryfall_cards_lang.sql added every printed language, multiplying the
-- row count, each search has been a full sequential scan. Live-confirmed:
-- both queries for "Sol Ring" / "Lightning Bolt" failed with Postgres error
-- 57014 (statement timeout), which left the add-card and add-to-wishlist
-- dialogs with no results at all.
--
-- A trigram GIN index serves both ILIKE and ~* patterns. Partial on
-- lang = 'en' - exactly the filter the search applies - so it stays a
-- fraction of the table's size and the planner can pick it for both
-- queries.
--
-- Safe to re-run.

create extension if not exists pg_trgm;

create index if not exists scryfall_cards_name_trgm_en_idx
  on scryfall_cards using gin (name gin_trgm_ops)
  where lang = 'en';
