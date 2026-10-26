-- Adds a column to record a deck's commander when it's actually known at
-- add-time, not just guessable - a genuine Commander precon's deck.json
-- names its commander explicitly (MTGJSON's own `commander` array), but
-- that fact was only ever used transiently to pick the deck's showcase
-- image and then discarded. Lets the Commander-bracket picker in
-- DeckDetailDialog pre-select the right card for precons instead of
-- defaulting to "unselected" the way it does for a manually imported deck
-- (see commander-bracket.ts's own doc comments on why that fallback exists
-- at all).
--
-- Text, not a foreign key: matches deck_cards.card_id's own convention
-- (card data isn't mirrored into a referenceable table for every game - see
-- CLAUDE.md's "Kartendaten NICHT in Supabase speichern" rule). Null for
-- every deck type except a genuine Commander precon for now.
--
-- Safe to re-run.

alter table decks add column if not exists commander_card_id text;
