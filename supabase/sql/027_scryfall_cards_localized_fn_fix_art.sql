-- Fixes a real bug in scryfall_cards_localized (026): picking "any" (most
-- recently released) localized printing per oracle_id grabbed a *different
-- set's* artwork for a card whose own printing has unique, set-specific art
-- (confirmed live: a Fallout Collector Booster "Dragonskull Summit" showed
-- its correct German name, but a completely unrelated German reprint's
-- artwork - a land cycle gets fresh art nearly every set, and Universes
-- Beyond crossover sets like Fallout typically have no German printing of
-- their own at all).
--
-- Now returns every matching-language row per oracle_id (with its set_code),
-- so MtgApiService.translateCards can require an exact same-set match
-- before swapping the image - falling back to translating just the name
-- (keeping the original, correct artwork) when no same-set localized print
-- exists.
--
-- Safe to re-run.

drop function if exists scryfall_cards_localized(uuid[], text);

create function scryfall_cards_localized(oracle_ids uuid[], target_lang text)
returns table (
  oracle_id uuid,
  set_code text,
  name text,
  printed_name text,
  image_url text,
  image_url_small text
)
language sql
stable
as $$
  select oracle_id, set_code, name, printed_name, image_url, image_url_small
  from scryfall_cards
  where oracle_id = any(oracle_ids) and lang = target_lang;
$$;

grant execute on function scryfall_cards_localized(uuid[], text) to anon, authenticated;
