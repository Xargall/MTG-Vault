-- scripts/sync-scryfall-cards.mjs upserts the Scryfall bulk file in 500-row
-- batches via the service_role key. Since 032_scryfall_cards_name_trgm_idx.sql
-- added a GIN trigram index on scryfall_cards(name) to fix search timeouts,
-- every upsert batch containing English-language rows also has to maintain
-- that index - GIN maintenance is markedly more expensive per row than a
-- plain btree index. Live-confirmed in the daily sync run: one batch out of
-- 1094 hit Postgres 57014 (statement timeout) on all 3 retry attempts and
-- got skipped, failing the whole GitHub Actions run over 0.09% of rows.
--
-- Raised only for service_role (the sync's own Postgres role, used nowhere
-- else - see scripts/sync-scryfall-cards.mjs), not for anon/authenticated,
-- so user-facing queries keep their normal timeout as a safety net and only
-- this bulk-write path gets more headroom.
--
-- Safe to re-run.

alter role service_role set statement_timeout = '60s';
