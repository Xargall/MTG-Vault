-- Fixes a gap in 041_collection_set_code_dedup.sql's unique constraint,
-- found during a code audit (2026-10-31): that constraint lists set_code
-- directly, and Postgres treats two NULLs as *not equal* to each other in a
-- unique constraint (standard SQL behavior) - so it stops two rows for the
-- same user/game/card/foil/finish/language from coexisting when set_code is
-- a known, matching value on both, but does NOT stop two rows with
-- set_code=NULL (the common case - every MTG row, and any Yu-Gi-Oh! row
-- added without a specifically-known printing) for the exact same
-- combination. 041's own doc comment reasoned about this and called the
-- NULL-distinct behavior "exactly the semantics wanted" - true for keeping
-- a null-set_code row separate from a specific-print row (041's actual
-- fix), but it also means two SEPARATE null-set_code additions for the
-- same card never clash, which was never the intent.
--
-- CollectionService.upsertOne() already does a select-then-insert in the
-- application to merge into an existing row rather than create a new one,
-- but that has a race: two near-simultaneous adds for the same card (two
-- open tabs, a retry after a dropped connection) can both see "no existing
-- row" and both insert, creating two rows the app itself never intended to
-- allow side by side. Once that happens, every later add for that exact
-- card/foil/finish/language hits upsertOne()'s .maybeSingle() finding two
-- rows instead of one, which throws - that one card can't be added again
-- until a duplicate row is removed by hand.
--
-- coalesce(set_code, '') turns both NULLs into the same empty string, so
-- the index below treats two null-set_code rows as duplicates of each
-- other (closing the race) while still keeping a null-set_code row and a
-- specific-print row distinct from each other (preserving exactly what 041
-- itself was fixing).
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent) -
-- merges any duplicates the race above may already have created live
-- first (sums their quantities into the oldest row of each group, deletes
-- the rest), so the new unique index below doesn't fail against rows that
-- already violate it.

with ranked as (
  select
    id,
    user_id,
    game_id,
    card_id,
    foil,
    finish,
    language,
    coalesce(set_code, '') as set_code_key,
    quantity,
    row_number() over (
      partition by user_id, game_id, card_id, foil, finish, language, coalesce(set_code, '')
      order by created_at, id
    ) as rn
  from collection_cards
),
extra as (
  select user_id, game_id, card_id, foil, finish, language, set_code_key, sum(quantity) as extra_quantity
  from ranked
  where rn > 1
  group by user_id, game_id, card_id, foil, finish, language, set_code_key
)
update collection_cards c
set quantity = c.quantity + e.extra_quantity
from ranked r
join extra e
  on r.user_id = e.user_id
  and r.game_id = e.game_id
  and r.card_id = e.card_id
  and r.foil = e.foil
  and r.finish = e.finish
  and r.language = e.language
  and r.set_code_key = e.set_code_key
where c.id = r.id
  and r.rn = 1;

delete from collection_cards c
where exists (
  select 1
  from (
    select
      id,
      row_number() over (
        partition by user_id, game_id, card_id, foil, finish, language, coalesce(set_code, '')
        order by created_at, id
      ) as rn
    from collection_cards
  ) ranked2
  where ranked2.id = c.id
    and ranked2.rn > 1
);

alter table collection_cards
  drop constraint if exists collection_cards_user_id_game_id_card_id_foil_finish_lang_set_key;
alter table collection_cards
  drop constraint if exists collection_cards_dedup_key;

drop index if exists collection_cards_dedup_key_idx;
create unique index if not exists collection_cards_dedup_key_idx
  on collection_cards (user_id, game_id, card_id, foil, finish, language, (coalesce(set_code, '')));
