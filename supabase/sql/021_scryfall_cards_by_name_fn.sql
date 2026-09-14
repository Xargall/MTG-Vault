-- getCardsByNames (mtg-api.service.ts) used a plain `.in('name', batch)`
-- query, which matches every *printing* of each requested name, not one row
-- per name - a basic land alone (Plains: 912 printings, Forest: 951) blows
-- past PostgREST's default 1000-row response cap on its own, silently
-- truncating whichever other, rarer names in the same batch would have
-- sorted after them. Live-confirmed: the same ~16-name deck-card batch lost
-- a different subset of names every run once the printing counts crossed
-- the cap, even after 020's index fix made the underlying query fast.
--
-- This function does the "one row per name" reduction inside Postgres
-- instead, so the result set is bounded by the number of *names* requested,
-- never by how many printings they have. Prefers a printing with no
-- printed_name override (i.e. not a foreign-language/alternate-name print) -
-- live-confirmed case: several printings tied on the same released_at date,
-- and the plain `order by released_at desc` alone picked a Japanese
-- printed_name variant ("Repel Calamity" printed as "災厄の追い返し") as the
-- name's representative row. rowToCard prefers printed_name for display
-- (mtg-api.service.ts), so that row's resulting Card.name silently stopped
-- matching the plain English name callers here search by - `id` as the
-- final tiebreaker (`printed_name is null` and `released_at` can still tie)
-- keeps the pick fully deterministic either way.
--
-- Safe to re-run.

create or replace function scryfall_cards_by_name(names text[])
returns setof scryfall_cards
language sql
stable
as $$
  select distinct on (name) *
  from scryfall_cards
  where name = any(names)
  order by name, (printed_name is null) desc, released_at desc nulls last, id;
$$;

grant execute on function scryfall_cards_by_name(text[]) to anon, authenticated;
