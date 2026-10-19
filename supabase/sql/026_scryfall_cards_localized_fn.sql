-- Batched lookup backing the card-display language toggle
-- (MtgApiService.translateCards): for each given oracle_id, returns that
-- card's printing in `target_lang` (name/printed_name/image), if one exists -
-- one query for a whole list of oracle_ids instead of one per card, same
-- "reduce in Postgres, not in app code" reasoning as
-- scryfall_cards_by_name (021_scryfall_cards_by_name_fn.sql). `distinct on`
-- picks any one matching-language printing per oracle_id, preferring the
-- most recently released one - a card's name/art is the same across every
-- set it was reprinted in for a given language in practice, so which exact
-- printing is picked doesn't matter for display purposes.
--
-- Safe to re-run.

create or replace function scryfall_cards_localized(oracle_ids uuid[], target_lang text)
returns table (
  oracle_id uuid,
  name text,
  printed_name text,
  image_url text,
  image_url_small text
)
language sql
stable
as $$
  select distinct on (oracle_id) oracle_id, name, printed_name, image_url, image_url_small
  from scryfall_cards
  where oracle_id = any(oracle_ids) and lang = target_lang
  order by oracle_id, released_at desc nulls last, id;
$$;

grant execute on function scryfall_cards_localized(uuid[], text) to anon, authenticated;
