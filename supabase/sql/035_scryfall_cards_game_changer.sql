-- Adds Scryfall's `game_changer` boolean (its own `is:gamechanger` flag,
-- currently 53 cards) to scryfall_cards - confirmed live against a real
-- card response, not previously mirrored (migration 034 added
-- keywords/legalities/edhrec_rank/power/toughness but not this one). Data
-- foundation for a rough Commander-bracket estimate in the deck-detail view
-- (bracket 1-5 is computed client-side from this plus a Commander Spellbook
-- API call for combo detection - see commanderspellbook-proxy and
-- CommanderSpellbookService - not a single stored "bracket" value, since it
-- also depends on which specific commander/decklist is being checked).
--
-- Safe to re-run.

alter table scryfall_cards add column if not exists game_changer boolean not null default false;
