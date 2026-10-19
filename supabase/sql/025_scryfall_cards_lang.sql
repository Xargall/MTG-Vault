-- Adds a `lang` column to scryfall_cards, ahead of switching the sync
-- script (scripts/sync-scryfall-cards.mjs) from Scryfall's "default_cards"
-- bulk file (practically English-only - see 016_scryfall_cards.sql) to
-- "all_cards" (every language, every printing). This backs the card-display
-- language toggle (the same DE/EN header switch that already drives
-- ngx-translate - see CardDisplayLanguageService): for a given oracle_id,
-- MtgApiService.translateCards looks up the matching `lang` row to borrow
-- its printed_name/image for display, independent of which exact printing
-- a user actually owns (collection_cards.card_id stays pinned to the
-- English/canonical print either way - see getCardBySetAndNumber's own
-- lang='en'-first lookup).
--
-- Existing rows (all synced from default_cards so far, i.e. all effectively
-- English or English-absent) default to 'en' - correct for every row until
-- the next sync run repopulates everything from all_cards with real values.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table scryfall_cards add column if not exists lang text not null default 'en';

create index if not exists scryfall_cards_oracle_lang_idx on scryfall_cards (oracle_id, lang);
