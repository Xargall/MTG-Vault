-- Fuzzy fallback for a Yu-Gi-Oh! print code the scanner read that doesn't
-- exist anywhere (not as-is, not via toEnglishPrintCode's language-swap) -
-- live-reported case (2026-10-26): Gemini misread "LEHD-DEB00" as
-- "LEND-EN008", which the exact/derived lookup correctly rejects since
-- neither code is real, but the user is left with a bare "not found"
-- despite the actual card ("LEHD-ENB00") being one character away.
--
-- fuzzystrmatch's levenshtein() does the actual distance math; this
-- function just scopes it to ygoprodeck_print_codes and caps how far it's
-- willing to suggest. Used by YugiohApiService.findSimilarPrintCodes as a
-- last resort, after every exact path has already failed - the scanner then
-- shows the result as a "meintest du...?" confirmation (reusing the
-- existing candidate-picker UI), never auto-adds it silently.
--
-- Safe to re-run.
create extension if not exists fuzzystrmatch;

create or replace function match_yugioh_print_code(p_code text, p_max_distance int default 2, p_limit int default 5)
returns table(set_code text, card_id integer, distance int)
language sql
stable
as $$
  select set_code, card_id, levenshtein(set_code, p_code) as distance
  from ygoprodeck_print_codes
  where levenshtein(set_code, p_code) <= p_max_distance
  order by distance asc, set_code asc
  limit p_limit;
$$;

grant execute on function match_yugioh_print_code(text, int, int) to anon, authenticated;
