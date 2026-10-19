-- Fixes a real artwork-mismatch bug in scryfall_cards_localized (028):
-- matching on set_code alone isn't precise enough - a single set can print
-- several distinct-art versions of the same card under different collector
-- numbers (confirmed live: Fallout's "Sol Ring" has a Nuka-Cola-bottle art
-- and a separate Bobblehead art, both set_code='pip'; "Gleaming Splendor"
-- has a normal and a separate full-art printing in the same set). The
-- previous same-set-only match could pick either one at random, showing the
-- wrong art even though the set (and often even the language) was right.
--
-- Now requires an exact set_code + collector_number match before using the
-- image (the same key that uniquely identifies one specific printing -
-- collector_number is the same across every language of a given printing,
-- confirmed in getCardBySetAndNumber's own doc comment) - falling back to
-- name-only translation (no image swap) exactly as before when no such
-- exact match exists in the target language.
--
-- Safe to re-run.

drop function if exists scryfall_cards_localized(uuid[], text[], text);

create function scryfall_cards_localized(
  oracle_ids uuid[],
  set_codes text[],
  collector_numbers text[],
  target_lang text
)
returns table (
  oracle_id uuid,
  set_code text,
  collector_number text,
  name text,
  printed_name text,
  image_url text,
  image_url_small text,
  same_printing boolean
)
language sql
stable
as $$
  select
    req.oracle_id,
    req.set_code,
    req.collector_number,
    coalesce(same.name, any_match.name) as name,
    coalesce(same.printed_name, any_match.printed_name) as printed_name,
    same.image_url,
    same.image_url_small,
    (same.oracle_id is not null) as same_printing
  from unnest(oracle_ids, set_codes, collector_numbers) as req(oracle_id, set_code, collector_number)
  left join lateral (
    select sc.oracle_id, sc.name, sc.printed_name, sc.image_url, sc.image_url_small
    from scryfall_cards sc
    where sc.oracle_id = req.oracle_id
      and sc.lang = target_lang
      and sc.set_code = req.set_code
      and sc.collector_number = req.collector_number
    limit 1
  ) same on true
  left join lateral (
    select sc.name, sc.printed_name
    from scryfall_cards sc
    where sc.oracle_id = req.oracle_id and sc.lang = target_lang
    order by sc.released_at desc nulls last, sc.id
    limit 1
  ) any_match on same.oracle_id is null
  where same.oracle_id is not null or any_match.name is not null;
$$;

grant execute on function scryfall_cards_localized(uuid[], text[], text[], text) to anon, authenticated;
