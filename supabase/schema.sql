-- Consolidated schema snapshot for a FRESH Supabase project.
--
-- This is NOT a migration and does not replace supabase/sql/*.sql - that
-- folder is the real historical record (42 files, each with the actual
-- "why" behind a decision: a live-reported bug, a performance fix, a
-- reasoning trade-off) and stays exactly as-is for reference. Nothing here
-- needs to run against the already-live project; that database already has
-- every one of those migrations applied. This file exists purely so a NEW
-- Supabase project (a second environment, local dev, disaster recovery)
-- can be set up by running ONE script instead of 42 in order.
--
-- Two things below are NOT sourced from any file in supabase/sql/ at all,
-- because they were made by hand in the Supabase Studio UI and never
-- captured as a migration:
--   - the `games` table itself (006_multi_game.sql only ever does
--     `alter table games ...` - it assumes the table already exists)
--   - the `game_id` column on collection_cards/decks/wishlist, and
--     `wishlist.quantity` (both referenced from 006/014/023/032 onward,
--     never created by an `alter table ... add column` anywhere)
-- Reconstructed here from the live schema (confirmed via a real query
-- against the running project, 2026-10-29) and the app's own TypeScript
-- row types (CollectionCardRow/DeckRow/WishlistRow), not guessed.
--
-- Run once, top to bottom, in a brand-new project's SQL editor. Safe to
-- re-run (every statement is idempotent). After this:
--   1. Replace the placeholder invite code (search "CHANGE-ME-BEFORE-RUNNING"
--      below) before anyone can sign up.
--   2. Deploy the Edge Functions under supabase/functions/ and set their
--      secrets (GEMINI_API_KEY, etc. - see each function's own README/doc).
--   3. Run scripts/sync-scryfall-cards.mjs and scripts/sync-ygoprodeck-cards.mjs
--      once manually (or trigger their GitHub Actions workflows) to
--      populate scryfall_cards/ygoprodeck_cards/ygoprodeck_print_codes -
--      card search returns nothing until that first sync completes.

-- ============================================================================
-- 1. Extensions
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_trgm;
create extension if not exists fuzzystrmatch;
-- pg_net (added by the now-removed 017_scryfall_cards_sync_cron.sql) is
-- deliberately NOT enabled here - its only consumer was the in-database
-- cron job that called the sync-scryfall-cards Edge Function directly,
-- replaced by a GitHub Actions workflow (see 018's doc). Nothing in the
-- current app needs it.
-- Supabase Vault (schema `vault`, backs user_secrets below) ships enabled
-- by default on hosted projects - if the functions below error with
-- "schema vault does not exist", enable the `supabase_vault` extension
-- first (Dashboard -> Database -> Extensions).

-- ============================================================================
-- 2. games - reference table, seeded once (see header comment on why this
--    table's own creation isn't in supabase/sql/*.sql)
-- ============================================================================

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

alter table games enable row level security;

drop policy if exists "Anyone can read games" on games;
create policy "Anyone can read games"
  on games for select
  using (true);

insert into games (slug, name) values
  ('mtg', 'Magic: The Gathering'),
  ('yugioh', 'Yu-Gi-Oh!'),
  ('pokemon', 'Pokémon')
on conflict (slug) do nothing;

-- ============================================================================
-- 3. collection_cards / decks / deck_cards / wishlist - user-owned data
-- ============================================================================

create table if not exists collection_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references games(id),
  card_id text not null,
  quantity int not null default 1 check (quantity > 0),
  foil boolean not null default false,
  -- 'nonfoil' | 'foil' | 'halo' | 'etched'
  finish text not null default 'nonfoil',
  -- 'normal' | 'token' | 'special'
  card_category text not null default 'normal',
  condition text not null default 'NM',
  -- 'en', 'de', 'fr', 'it', 'es', 'pt', 'ja', 'ko', 'ru', 'zhs', 'zht'
  language text not null default 'de',
  -- Scryfall's oracle_id (MTG only) - lets a different printing of the same
  -- card count as a substitute for deck-matching. Null for Yu-Gi-Oh!/Pokémon.
  oracle_id text,
  -- The specific printing's set_code (Yu-Gi-Oh! only, e.g. "TN19-EN007") -
  -- null means "unknown/generic printing" for every other row.
  set_code text,
  created_at timestamptz not null default now()
);

create index if not exists collection_cards_user_id_idx on collection_cards (user_id);

-- A plain `unique (..., set_code)` constraint would let two rows both with
-- set_code=null (the common case - every MTG row) coexist for the exact
-- same user/game/card/foil/finish/language: Postgres treats two NULLs as
-- not equal to each other in a unique constraint, so it wouldn't actually
-- stop that duplicate. coalesce(set_code, '') folds both NULLs into the
-- same value, so two null-set_code rows now correctly count as a clash,
-- while a null-set_code row and a specific-print row still coalesce to
-- different values and stay separate (needed - a known print must never
-- silently merge into a pre-existing unknown-print stack) - see
-- 042_collection_cards_dedup_coalesce_set_code.sql for the live migration
-- and the duplicate-insert race this closes.
create unique index if not exists collection_cards_dedup_key_idx
  on collection_cards (user_id, game_id, card_id, foil, finish, language, (coalesce(set_code, '')));

alter table collection_cards enable row level security;

drop policy if exists "Users manage own collection cards" on collection_cards;
create policy "Users manage own collection cards"
  on collection_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references games(id),
  name text not null,
  format text,
  is_precon boolean not null default false,
  release_date date,
  mtgjson_file_name text,
  -- Set by the "Alle Karten vorhanden" checkbox for any non-precon deck that
  -- represents a real, fully-owned physical pool (import/EDHREC/Moxfield/
  -- MTGO format set) - see deck.service.ts's grantAllCards/grantMissingCards.
  all_cards_owned boolean not null default false,
  -- Known commander card_id (not guessed) - only set for a genuine
  -- Commander-type precon whose own data names one. Text, not a FK - card
  -- data is never mirrored into a referenceable table (see CLAUDE.md).
  commander_card_id text,
  created_at timestamptz not null default now()
);

create table if not exists deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  card_id text not null,
  quantity int not null default 1 check (quantity > 0),
  -- Whether this card counts as "committed" to this deck for the
  -- availability calculation in deck-stats.ts.
  is_assigned boolean not null default true,
  unique (deck_id, card_id)
);

create index if not exists decks_user_id_idx on decks (user_id);
create index if not exists deck_cards_deck_id_idx on deck_cards (deck_id);

alter table decks enable row level security;
alter table deck_cards enable row level security;

drop policy if exists "Users manage own decks" on decks;
create policy "Users manage own decks"
  on decks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own deck cards" on deck_cards;
create policy "Users manage own deck cards"
  on deck_cards for all
  using (exists (select 1 from decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()))
  with check (exists (select 1 from decks where decks.id = deck_cards.deck_id and decks.user_id = auth.uid()));

create table if not exists wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references games(id),
  card_id text not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  notes text,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, game_id, card_id)
);

create index if not exists wishlist_user_id_idx on wishlist (user_id);

alter table wishlist enable row level security;

drop policy if exists "Users manage own wishlist" on wishlist;
create policy "Users manage own wishlist"
  on wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 4. Invite-gated registration (see 008/010/011_*.sql for the full history -
--    this is already the corrected, deferrable-FK form from the start)
-- ============================================================================

create table if not exists invite_codes (
  code text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists invite_redemptions (
  token uuid primary key default gen_random_uuid(),
  code text not null references invite_codes(code),
  status text not null default 'pending' check (status in ('pending', 'consumed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  consumed_by uuid references auth.users(id) on delete set null deferrable initially deferred,
  consumed_at timestamptz
);

create table if not exists invited_users (
  user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
  invited_at timestamptz not null default now()
);

alter table invite_codes enable row level security;
alter table invite_redemptions enable row level security;
alter table invited_users enable row level security;

drop policy if exists "Users can check their own invite status" on invited_users;
create policy "Users can check their own invite status"
  on invited_users for select
  using (auth.uid() = user_id);

-- IMPORTANT: replace this placeholder before letting anyone sign up -
-- treat it like a password. Rotate later via:
--   update invite_codes set is_active = false where code = 'old-code';
--   insert into invite_codes (code) values ('new-code');
insert into invite_codes (code) values ('CHANGE-ME-BEFORE-RUNNING')
on conflict (code) do nothing;

create or replace function public.verify_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not exists (select 1 from invite_codes where code = p_code and is_active) then
    raise exception 'invite_invalid';
  end if;

  insert into invite_redemptions (code) values (p_code)
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function public.verify_invite_code(text) from public;
grant execute on function public.verify_invite_code(text) to anon, authenticated;

create or replace function public.enforce_invite_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
  v_updated int;
begin
  if new.is_anonymous then
    return new; -- guest sign-ins are unrelated to invite gating
  end if;

  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'email' then
    return new; -- non-email providers gated reactively, see redeem_invite_for_current_user
  end if;

  begin
    v_token := (new.raw_user_meta_data->>'invite_token')::uuid;
  exception when others then
    v_token := null;
  end;

  if v_token is null then
    raise exception 'invite_required';
  end if;

  update invite_redemptions
  set status = 'consumed', consumed_by = new.id, consumed_at = now()
  where token = v_token and status = 'pending' and expires_at > now();

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'invite_required';
  end if;

  insert into invited_users (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists enforce_invite_on_signup on auth.users;
create trigger enforce_invite_on_signup
  before insert on auth.users
  for each row
  execute function public.enforce_invite_on_signup();

create or replace function public.redeem_invite_for_current_user(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    return false;
  end if;

  update invite_redemptions
  set status = 'consumed', consumed_by = v_uid, consumed_at = now()
  where token = p_token and status = 'pending' and expires_at > now();

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return false;
  end if;

  insert into invited_users (user_id) values (v_uid)
  on conflict (user_id) do nothing;

  return true;
end;
$$;

revoke all on function public.redeem_invite_for_current_user(uuid) from public;
grant execute on function public.redeem_invite_for_current_user(uuid) to authenticated;

create or replace function public.delete_unprivileged_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_unprivileged_account() from public;
grant execute on function public.delete_unprivileged_account() to authenticated;

-- One-time backfill, harmless to re-run: grandfathers in any pre-existing
-- (non-anonymous) account so the gate never locks out existing access.
insert into invited_users (user_id)
select id from auth.users where is_anonymous = false
on conflict (user_id) do nothing;

-- ============================================================================
-- 5. Per-user secrets (Gemini API key) via Supabase Vault - no table of its
--    own, each secret is named "<secret_name>:<user_id>" in vault.secrets.
-- ============================================================================

create or replace function public.set_user_secret(p_secret_name text, p_secret_value text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_name := p_secret_name || ':' || v_uid::text;

  select id into v_id from vault.secrets where name = v_name;

  if v_id is null then
    perform vault.create_secret(p_secret_value, v_name);
  else
    perform vault.update_secret(v_id, p_secret_value);
  end if;
end;
$$;

revoke all on function public.set_user_secret(text, text) from public;
grant execute on function public.set_user_secret(text, text) to authenticated;

create or replace function public.has_user_secret(p_secret_name text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1 from vault.secrets where name = p_secret_name || ':' || auth.uid()::text
  );
$$;

revoke all on function public.has_user_secret(text) from public;
grant execute on function public.has_user_secret(text) to authenticated;

-- Deliberately NOT granted to authenticated/anon - only service_role (the
-- gemini-ocr Edge Function) can ever read a decrypted secret back out.
create or replace function public.get_user_secret_for_service(p_user_id uuid, p_secret_name text)
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = p_secret_name || ':' || p_user_id::text
  limit 1;
$$;

revoke all on function public.get_user_secret_for_service(uuid, text) from public;
grant execute on function public.get_user_secret_for_service(uuid, text) to service_role;

-- ============================================================================
-- 6. Avatar storage (public bucket, per-user write access)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- 7. scryfall_cards - local mirror of Scryfall's MTG bulk data, synced by
--    scripts/sync-scryfall-cards.mjs (GitHub Actions, daily). Public
--    reference data: RLS allows anyone to read, only the sync script
--    (service-role) writes.
-- ============================================================================

create table if not exists scryfall_cards (
  id uuid primary key,
  oracle_id uuid not null,
  name text not null,
  printed_name text,
  image_url text,
  image_url_small text,
  set_code text not null,
  set_name text not null,
  collector_number text not null,
  rarity text not null,
  released_at date,
  color_identity text[] not null default '{}',
  mana_cost text,
  cmc numeric not null default 0,
  type_line text not null,
  price_eur numeric,
  price_eur_foil numeric,
  price_usd numeric,
  price_usd_foil numeric,
  cardmarket_url text,
  -- Scryfall's own printed-language code ('en', 'de', ...) - one row per
  -- (printing, language). Backs the card-display-language toggle.
  lang text not null default 'en',
  -- Data foundation for a future cross-game deck-recommendation feature -
  -- not consumed by the app yet.
  keywords text[] not null default '{}',
  legalities jsonb,
  edhrec_rank integer,
  power text,
  toughness text,
  -- Scryfall's own `is:gamechanger` flag - one ingredient of the
  -- Commander-bracket estimate.
  game_changer boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists scryfall_cards_oracle_id_idx on scryfall_cards (oracle_id);
create index if not exists scryfall_cards_set_number_idx on scryfall_cards (set_code, collector_number);
create index if not exists scryfall_cards_name_idx on scryfall_cards (lower(name));
create index if not exists scryfall_cards_name_exact_idx on scryfall_cards (name);
create index if not exists scryfall_cards_oracle_lang_idx on scryfall_cards (oracle_id, lang);
-- Trigram GIN index for the ILIKE/~* name search (MtgApiService.searchCards) -
-- partial on lang = 'en' (the exact filter that search applies) to stay a
-- fraction of the full all-languages table size.
create index if not exists scryfall_cards_name_trgm_en_idx
  on scryfall_cards using gin (name gin_trgm_ops)
  where lang = 'en';

alter table scryfall_cards enable row level security;

drop policy if exists "Anyone can read scryfall cards" on scryfall_cards;
create policy "Anyone can read scryfall cards"
  on scryfall_cards for select
  using (true);

-- One row per name, picking the printing with no printed_name override and
-- the most recent release as a deterministic tiebreaker - used by
-- getCardsByNames/getPrints so a plain `name in (...)` lookup isn't
-- multiplied by every printing's row.
create or replace function scryfall_cards_by_name(names text[])
returns setof scryfall_cards
language sql
stable
as $$
  select distinct on (name) *
  from scryfall_cards
  where name = any(names)
  order by name, (printed_name is null) desc, released_at desc nulls last, id;
$$;

grant execute on function scryfall_cards_by_name(text[]) to anon, authenticated;

-- Batched card-display-language lookup (final form, see 026-030_*.sql for
-- the iteration history) - requires an exact set_code + collector_number
-- match per requested printing before returning a localized name/image at
-- all; no fallback to a "borrowed" translation from an unrelated printing.
create or replace function scryfall_cards_localized(
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

-- ============================================================================
-- 8. ygoprodeck_cards / ygoprodeck_print_codes - local mirror of YGOPRODeck's
--    Yu-Gi-Oh! database, synced by scripts/sync-ygoprodeck-cards.mjs.
-- ============================================================================

create table if not exists ygoprodeck_cards (
  id integer primary key,
  name text not null,
  card_type text not null,
  attribute text,
  atk integer,
  def integer,
  image_url text,
  image_url_small text,
  price_eur numeric,
  price_usd numeric,
  set_name text,
  rarity text,
  banlist_status text,
  synced_at timestamptz not null default now()
);

create index if not exists ygoprodeck_cards_name_idx on ygoprodeck_cards (lower(name));

alter table ygoprodeck_cards enable row level security;

drop policy if exists "Anyone can read ygoprodeck cards" on ygoprodeck_cards;
create policy "Anyone can read ygoprodeck cards"
  on ygoprodeck_cards for select
  using (true);

create table if not exists ygoprodeck_print_codes (
  set_code text primary key,
  card_id integer not null references ygoprodeck_cards (id) on delete cascade,
  set_name text,
  set_rarity text
);

create index if not exists ygoprodeck_print_codes_card_id_idx on ygoprodeck_print_codes (card_id);

alter table ygoprodeck_print_codes enable row level security;

drop policy if exists "Anyone can read ygoprodeck print codes" on ygoprodeck_print_codes;
create policy "Anyone can read ygoprodeck print codes"
  on ygoprodeck_print_codes for select
  using (true);

-- Fuzzy print-code fallback for the camera scanner (final form, see
-- 037-039_*.sql) - levenshtein distance scoped to ygoprodeck_print_codes,
-- returning each match's own set_name/set_rarity so the picker UI can tell
-- two similarly-named sets apart.
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

grant execute on function match_yugioh_print_code(text, int, int) to anon, authenticated;

-- Stage 1 of the two-step fallback: is the SET portion of a scanned code
-- close to a real set prefix? Returns every prefix tied at the best
-- distance, not just one (two unrelated real sets can be equally close).
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

-- Stage 2: once the set itself is confirmed, search only within that set's
-- own codes for the closest number/language - comparing only the portion
-- after the first "-" (the already-known-wrong prefix carries no more
-- information once the set is fixed).
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

grant execute on function match_yugioh_print_code_in_set(text, text, int) to anon, authenticated;

-- ============================================================================
-- 9. Scheduled cleanup + service-role tuning
-- ============================================================================

-- Removes anonymous ("Demo ausprobieren") accounts older than 24h, hourly -
-- collection_cards/decks/wishlist all cascade-delete with the user.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-anonymous-guests') then
    perform cron.unschedule('cleanup-anonymous-guests');
  end if;
end $$;

select cron.schedule(
  'cleanup-anonymous-guests',
  '0 * * * *', -- hourly, on the hour
  $$delete from auth.users where is_anonymous = true and created_at < now() - interval '24 hours';$$
);

-- The bulk-sync scripts upsert in batches that also maintain
-- scryfall_cards_name_trgm_en_idx (expensive GIN maintenance) - raised only
-- for service_role (the sync scripts' own role), not anon/authenticated, so
-- normal user-facing queries keep their default timeout as a safety net.
alter role service_role set statement_timeout = '60s';
