-- Follow-up to 043, same day: the front-face match added there
-- (split_part(name, ' // ', 1) = any(names)) also matches non-playable
-- rows whose "combined" name just repeats the same text on both sides of
-- " // " - live-confirmed querying "Sea Gate Restoration" after 043: it
-- returned both the real modal DFC ("Sea Gate Restoration // Sea Gate,
-- Reborn") AND a Zendikar Rising Art Series card whose own name is
-- literally "Sea Gate Restoration // Sea Gate Restoration" (type_line
-- "Card // Card" - not a real Magic card, just a collectible art print).
-- The same pattern shows up for several token print pairs too (e.g. "Token
-- Creature — Zombie // Token Creature — Zombie"). 2939 rows / 2468 distinct
-- front-face names matched this shape, none of them a real playable card -
-- a genuine modal DFC/split/adventure card always has a *different* name on
-- each face by game design, so excluding an exact front=back match is a
-- simpler and more robust filter than trying to enumerate every
-- non-playable type_line (which isn't even reliably populated - some of
-- these rows have an empty type_line).
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
     or (
       split_part(name, ' // ', 1) = any(names)
       and split_part(name, ' // ', 1) <> split_part(name, ' // ', 2)
     )
  order by name, (printed_name is null) desc, released_at desc nulls last, id;
$$;

grant execute on function scryfall_cards_by_name(text[]) to anon, authenticated;
