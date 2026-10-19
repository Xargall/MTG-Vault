-- Changes the card-display-language fallback behavior per explicit user
-- choice: a card that was genuinely never printed in the target language
-- (live-confirmed: several Fallout Commander-precon-exclusive cards have
-- no German printing at all - Wizards simply never produced one) now stays
-- fully untranslated (English name AND art together) instead of "borrowing"
-- a translated name from some other printing of the same oracle card while
-- keeping the original English art - that mixed DE-name/EN-art combination
-- read as a bug even though it was arguably correct, so consistency won out.
--
-- Simplified to match: no more any_match fallback lookup, no more
-- same_printing flag - every row returned is already an exact set_code +
-- collector_number match (requests with no such match simply return no row
-- at all, which the caller already treats as "leave this card untouched").
--
-- Safe to re-run.

drop function if exists scryfall_cards_localized(uuid[], text[], text[], text);

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
  image_url_small text
)
language sql
stable
as $$
  select req.oracle_id, req.set_code, req.collector_number, m.name, m.printed_name, m.image_url, m.image_url_small
  from unnest(oracle_ids, set_codes, collector_numbers) as req(oracle_id, set_code, collector_number)
  join lateral (
    select sc.name, sc.printed_name, sc.image_url, sc.image_url_small
    from scryfall_cards sc
    where sc.oracle_id = req.oracle_id
      and sc.lang = target_lang
      and sc.set_code = req.set_code
      and sc.collector_number = req.collector_number
    limit 1
  ) m on true;
$$;

grant execute on function scryfall_cards_localized(uuid[], text[], text[], text) to anon, authenticated;
