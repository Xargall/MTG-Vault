-- getCardsByNames/getPrints (mtg-api.service.ts) filter on the raw `name`
-- column (`.in('name', ...)`, `.eq('name', ...)`) for exact matches -
-- Moxfield/EDHREC average-decklist card names are already in Scryfall's own
-- canonical casing, so no lower()/ilike normalization is needed there. But
-- 016_scryfall_cards.sql only ever indexed lower(name) (for the ilike
-- autocomplete prefix search), which a plain `name = ...`/`name in (...)`
-- predicate can't use at all - every such query has been a full sequential
-- scan since the table was fully backfilled with all ~118k Scryfall
-- printings. Live-confirmed: a couple of Bloomburrow card names inside a
-- single getCardsByNames batch timed out (Postgres error 57014) and the
-- whole batch got silently skipped (see queryScryfallCards's catch), which
-- surfaced as cards mysteriously "unresolved" in deck-stats.ts's
-- splitAverageDeckByAvailability despite genuinely being in the table.
--
-- Safe to re-run.

create index if not exists scryfall_cards_name_exact_idx on scryfall_cards (name);
