-- Adds a `finish` and `card_category` column to collection_cards, so the
-- scanner's MTG collector-number parser (see set-code-parser.ts /
-- mtg-api.service.ts) can distinguish a halo-finish print from a plain
-- nonfoil one (independent of the existing `foil` boolean, which stays as
-- the regular foil/nonfoil toggle) and flag token/special scans for the
-- collection's "✨ Specials" bucket.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table collection_cards add column if not exists finish text not null default 'nonfoil';
-- Werte: 'nonfoil', 'foil', 'halo', 'etched'

alter table collection_cards add column if not exists card_category text not null default 'normal';
-- Werte: 'normal', 'token', 'special'

-- `finish` now participates in the same-card/foil dedup key the app already
-- enforces (see 006_multi_game.sql) - a halo copy must stack separately from
-- a nonfoil copy of the same card_id even though both have foil=false.
alter table collection_cards drop constraint if exists collection_cards_user_id_game_id_card_id_foil_key;
alter table collection_cards add constraint collection_cards_user_id_game_id_card_id_foil_finish_key
  unique (user_id, game_id, card_id, foil, finish);
