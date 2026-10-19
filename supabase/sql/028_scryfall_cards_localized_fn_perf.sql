-- Performance fix for scryfall_cards_localized (026/027): it returned EVERY
-- matching-language row per oracle_id (every reprint across every set -
-- confirmed live: 18 German rows for one card, "Dragonskull Summit" alone),
-- leaving MtgApiService.translateCards to pick the right one in JS. For a
-- collection-grid-sized call (hundreds of cards) this meant pulling many
-- thousands of mostly-unused rows over the wire on every single page load -
-- the real cause of the new slowness after the all_cards sync.
--
-- Now takes the requesting card's own set_code alongside its oracle_id and
-- does the same-set-preferred / any-set-fallback matching inside Postgres
-- (two cheap index-assisted lookups per requested card via the
-- (oracle_id, lang) index), returning exactly one row per request instead
-- of every candidate - `same_set` tells the caller whether the image is
-- safe to use (see translateCards's own comment on why that matters).
--
-- Safe to re-run.

drop function if exists scryfall_cards_localized(uuid[], text);

create function scryfall_cards_localized(oracle_ids uuid[], set_codes text[], target_lang text)
returns table (
  oracle_id uuid,
  set_code text,
  name text,
  printed_name text,
  image_url text,
  image_url_small text,
  same_set boolean
)
language sql
stable
as $$
  select
    req.oracle_id,
    req.set_code,
    coalesce(same.name, any_match.name) as name,
    coalesce(same.printed_name, any_match.printed_name) as printed_name,
    same.image_url,
    same.image_url_small,
    (same.oracle_id is not null) as same_set
  from unnest(oracle_ids, set_codes) as req(oracle_id, set_code)
  left join lateral (
    select sc.oracle_id, sc.name, sc.printed_name, sc.image_url, sc.image_url_small
    from scryfall_cards sc
    where sc.oracle_id = req.oracle_id and sc.lang = target_lang and sc.set_code = req.set_code
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

grant execute on function scryfall_cards_localized(uuid[], text[], text) to anon, authenticated;
