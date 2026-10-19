-- Most of this collection is bought/opened locally (German prints), so a
-- row inserted without an explicit `language` (see 023_collection_language.sql)
-- should default to German, not English - matches the app-level default
-- (see card-languages.ts's DEFAULT_CARD_LANGUAGE).
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table collection_cards alter column language set default 'de';
