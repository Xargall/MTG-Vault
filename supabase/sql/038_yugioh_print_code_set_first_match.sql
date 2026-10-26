-- Second, two-stage fuzzy fallback for a Yu-Gi-Oh! print code that doesn't
-- match anything - not even via migration 037's flat, whole-code fuzzy
-- search. Live-confirmed case that flat search still can't catch (2026-10-26):
-- Gemini read "LEND-EN008" off a card actually printed "LEHD-DEB00" - the
-- real code "LEHD-ENB00" is edit-distance 3 away, over 037's distance-2
-- budget (which has to stay tight precisely because a *flat* search that far
-- starts returning unrelated real codes that just happen to share a few
-- characters - confirmed live: a distance-3 search around "LEND-EN008"
-- returns five completely different real sets).
--
-- The fix is the user's own idea: split the confirmation into two smaller,
-- safer steps instead of one big fuzzy guess.
--   1. match_yugioh_set_prefix - is the SET portion (before the first "-")
--      close to a real one? Only a few hundred distinct prefixes exist, so
--      this alone is a much more reliable signal than fuzzy-matching the
--      whole code at once, and the app can ask "meintest du Set X?" before
--      even looking at the number. Returns a generous limit (15) rather than
--      just the single best row on purpose - live-confirmed, "LEND" is
--      equally one edit away from BOTH "LEDD" (Legendary Dragon Decks) and
--      "LEHD" (Legendary Hero Decks), two unrelated real product lines.
--      Committing to one of a genuine tie would be a coin flip dressed up as
--      a confident guess, so the client (YugiohApiService.findSimilarSetPrefixes)
--      keeps every row tied at the best distance and falls through to
--      showing actual cards instead of a single-set yes/no question
--      whenever more than one comes back.
--   2. match_yugioh_print_code_in_set - once the set itself is confirmed
--      (by the user, by being the only untied candidate, or because it was
--      already an exact match), search only within that one set's own codes
--      for the closest number/language - safe to be far more lenient here
--      (no distance cap) since the search space is now a handful of rows,
--      not the whole 38k-row mirror.
--
-- Safe to re-run.

create or replace function match_yugioh_set_prefix(p_prefix text, p_max_distance int default 2, p_limit int default 15)
returns table(prefix text, set_name text, distance int)
language sql
stable
as $$
  with prefixes as (
    select distinct on (split_part(set_code, '-', 1))
      split_part(set_code, '-', 1) as prefix,
      set_name
    from ygoprodeck_print_codes
    order by split_part(set_code, '-', 1)
  )
  select prefix, set_name, levenshtein(prefix, p_prefix) as distance
  from prefixes
  where levenshtein(prefix, p_prefix) <= p_max_distance
  order by distance asc, prefix asc
  limit p_limit;
$$;

grant execute on function match_yugioh_set_prefix(text, int, int) to anon, authenticated;

-- Compares only the portion AFTER the first "-", not the whole code -
-- live-confirmed this matters: scoring the full string still counts the
-- already-known-wrong original prefix against every row equally, which
-- buries the actual answer behind rows that happen to share more
-- characters with that wrong prefix by chance (confirmed live: against the
-- full "LEND-EN008", "LEHD-ENB00" - the real card - scored distance 3 while
-- several wrong "LEHD-EN..." cards scored distance 2 and outranked it).
-- Once the set is confirmed, the prefix carries no more information either
-- way, so it shouldn't be part of the distance at all.
create or replace function match_yugioh_print_code_in_set(p_set_prefix text, p_code text, p_limit int default 5)
returns table(set_code text, card_id integer, distance int)
language sql
stable
as $$
  select set_code, card_id,
    levenshtein(split_part(set_code, '-', 2), split_part(p_code, '-', 2)) as distance
  from ygoprodeck_print_codes
  where set_code like p_set_prefix || '-%'
  order by distance asc, set_code asc
  limit p_limit;
$$;

grant execute on function match_yugioh_print_code_in_set(text, text, int) to anon, authenticated;
