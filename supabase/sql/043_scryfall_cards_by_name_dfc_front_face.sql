-- scryfall_cards_by_name (021) only matched a card's full, combined `name`
-- exactly - works for every normal card, but a modal DFC/split/adventure
-- card (e.g. "Sea Gate Restoration // Sea Gate, Reborn") stores that
-- combined name as its one and only `name`, while EDHREC/Moxfield decklists
-- (and players at the table) only ever name such a card by its front face
-- ("Sea Gate Restoration"). Live-confirmed: 4 of 21 cards a user reported as
-- "could not be matched" in a commander-recommendation scan were exactly
-- this - modal_dfc/adventure cards whose front-face-only name never matched
-- the combined `name` column (Sea Gate Restoration, Hydroelectric Specimen,
-- Virtue of Knowledge, Sink into Stupor).
--
-- Matches a requested name against either the full combined name (unchanged
-- behavior for every normal card) or just the part before " // " (a DFC's
-- front face) - `distinct on (name)` still groups by the row's own full
-- name, so a DFC still contributes exactly one row.
--
-- Safe to re-run.

create or replace function scryfall_cards_by_name(names text[])
returns setof scryfall_cards
language sql
stable
as $$
  select distinct on (name) *
  from scryfall_cards
  where name = any(names) or split_part(name, ' // ', 1) = any(names)
  order by name, (printed_name is null) desc, released_at desc nulls last, id;
$$;

grant execute on function scryfall_cards_by_name(text[]) to anon, authenticated;

-- Same reasoning as 020's plain scryfall_cards_name_exact_idx - the new
-- split_part(...) predicate above can't use that index either, so without
-- one of its own it's a sequential scan over every one of the ~118k rows.
create index if not exists scryfall_cards_front_face_name_idx
  on scryfall_cards (split_part(name, ' // ', 1));
