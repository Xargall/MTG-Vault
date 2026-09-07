-- Feature 1 (card substitutes): collection_cards.oracle_id lets deck-matching
-- recognize a different printing of the same card (or a basic land from a
-- different set) as a valid substitute, instead of requiring an exact
-- Scryfall print id match. Populated at add-time going forward (scanner,
-- add-card dialog, precon/import/EDHREC deck grants) - existing rows keep
-- oracle_id = null until re-added or re-scanned; matching code falls back to
-- the existing exact card_id match for those, so nothing regresses.
--
-- Feature 2 (deck binding): deck_cards.is_assigned marks a card as committed
-- to that deck for availability purposes (see deck-stats.ts's "assigned
-- elsewhere" calculation) - defaults true for every row, since being listed
-- in a deck's card list is itself the commitment; there's no UI to toggle it
-- off in this pass.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

alter table collection_cards add column if not exists oracle_id text;

alter table deck_cards add column if not exists is_assigned boolean not null default true;
