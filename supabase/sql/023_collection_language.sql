-- Adds a `language` column to collection_cards so the collection can track
-- which printed language a physical copy is in (e.g. a German print bought
-- locally vs. an English one from a box), independent of the app's own UI
-- language (ngx-translate). This is pure collection metadata, not a card-data
-- lookup key - the local scryfall_cards mirror only carries English-majority
-- prints (see 016_scryfall_cards.sql's sync source), so there's no real
-- per-language card record to join against. Set at add-time from the
-- scanner's OCR/Gemini read of the card's own printed language abbreviation
-- (see set-code-parser.ts), same as `finish`/`card_category`
-- (see 014_collection_finish_category.sql), or picked manually in the add/
-- edit forms.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table collection_cards add column if not exists language text not null default 'en';
-- Werte: 'en', 'de', 'fr', 'it', 'es', 'pt', 'ja', 'ko', 'ru', 'zhs', 'zht'

-- `language` now participates in the same-card/foil/finish dedup key the
-- app already enforces (see 014_collection_finish_category.sql) - a German
-- copy must stack separately from an English copy of the same card_id/foil/
-- finish, so the collection can show each language's own quantity/badge
-- instead of silently merging them into one row that can only remember one.
alter table collection_cards drop constraint if exists collection_cards_user_id_game_id_card_id_foil_finish_key;
alter table collection_cards add constraint collection_cards_user_id_game_id_card_id_foil_finish_language_key
  unique (user_id, game_id, card_id, foil, finish, language);
