-- Fixes a real display bug found live (2026-10-26): "TN19-DE007" correctly
-- resolved to Obelisk the Tormentor, but the app showed "2016 Mega-Tins" -
-- a DIFFERENT one of its 18 real printings, not the 2019 Gold Sarcophagus
-- Tin print that was actually scanned. ygoprodeck_cards only ever stores
-- one denormalized "representative" set_name/rarity per *card* (whichever
-- entry happened to sync first - see 022_ygoprodeck_cards.sql's own doc on
-- why print codes live in their own table instead), so every print-code
-- lookup was silently discarding the one piece of data that actually
-- matches what's printed on the physical card: ygoprodeck_print_codes'
-- OWN set_name/set_rarity for that exact code.
--
-- Widens the two fuzzy-match RPCs (migrations 037/038) to also return
-- set_name/set_rarity, so YugiohApiService can override the generic card's
-- values with the specific printing's - both for the exact-match path
-- (lookupPrintCodeLocally, a plain .select() - no RPC/migration needed
-- there) and for the fuzzy-suggestion picker, where showing the WRONG set
-- name would actively defeat the picker's whole purpose (telling two
-- same-named sets like LEDD/LEHD apart by what's shown on screen).
--
-- Safe to re-run. Postgres refuses CREATE OR REPLACE across a changed
-- return-table shape ("cannot change return type of existing function"),
-- so both are explicitly dropped first.

drop function if exists match_yugioh_print_code(text, int, int);
drop function if exists match_yugioh_print_code_in_set(text, text, int);

create or replace function match_yugioh_print_code(p_code text, p_max_distance int default 2, p_limit int default 5)
returns table(set_code text, card_id integer, set_name text, set_rarity text, distance int)
language sql
stable
as $$
  select set_code, card_id, set_name, set_rarity, levenshtein(set_code, p_code) as distance
  from ygoprodeck_print_codes
  where levenshtein(set_code, p_code) <= p_max_distance
  order by distance asc, set_code asc
  limit p_limit;
$$;

create or replace function match_yugioh_print_code_in_set(p_set_prefix text, p_code text, p_limit int default 5)
returns table(set_code text, card_id integer, set_name text, set_rarity text, distance int)
language sql
stable
as $$
  select set_code, card_id, set_name, set_rarity,
    levenshtein(split_part(set_code, '-', 2), split_part(p_code, '-', 2)) as distance
  from ygoprodeck_print_codes
  where set_code like p_set_prefix || '-%'
  order by distance asc, set_code asc
  limit p_limit;
$$;

-- DROP wipes grants along with the old signature - reapply both.
grant execute on function match_yugioh_print_code(text, int, int) to anon, authenticated;
grant execute on function match_yugioh_print_code_in_set(text, text, int) to anon, authenticated;
