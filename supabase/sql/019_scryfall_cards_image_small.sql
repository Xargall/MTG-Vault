-- Adds the "small" Scryfall image variant alongside the existing "normal"
-- one (image_url) - used for grid thumbnails (see card-tile.html) instead
-- of decoding a full-size image just to show it at ~100-150px wide.
-- scripts/sync-scryfall-cards.mjs now populates this on every daily sync
-- run, which also backfills every existing row automatically (upsert with
-- merge-duplicates) - no separate backfill step needed here.
--
-- Safe to re-run.

alter table scryfall_cards add column if not exists image_url_small text;
