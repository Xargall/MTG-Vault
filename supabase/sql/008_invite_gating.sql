-- Invite-gated registration. Removes open self-registration: new accounts
-- (email/password or Google) require a valid invite code. Returning users
-- (already-invited, whether via email or Google) are unaffected.
--
-- IMPORTANT: replace the placeholder invite code below with your own secret
-- before running this in production, and treat it like a password.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1. Tables --------------------------------------------------------------

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
  -- deferrable: the auth.users trigger below sets this to the new user's id
  -- from a BEFORE INSERT trigger, i.e. before that auth.users row exists
  -- yet - an immediate FK check would fail, so defer it to commit time.
  consumed_by uuid references auth.users(id) deferrable initially deferred,
  consumed_at timestamptz
);

create table if not exists invited_users (
  -- deferrable for the same reason as invite_redemptions.consumed_by above.
  user_id uuid primary key references auth.users(id) deferrable initially deferred on delete cascade,
  invited_at timestamptz not null default now()
);

-- 2. RLS - lock all three tables down to "no direct access"; everything
-- goes through the SECURITY DEFINER functions below, which bypass RLS.
alter table invite_codes enable row level security;
alter table invite_redemptions enable row level security;
alter table invited_users enable row level security;

drop policy if exists "Users can check their own invite status" on invited_users;
create policy "Users can check their own invite status"
  on invited_users for select
  using (auth.uid() = user_id);

-- 3. One-time backfill: grandfather in every existing (non-anonymous)
-- account so the new gate never locks out anyone who already had access.
insert into invited_users (user_id)
select id from auth.users where is_anonymous = false
on conflict (user_id) do nothing;

-- 4. Seed a fixed invite code.
insert into invite_codes (code) values ('CHANGE-ME-BEFORE-RUNNING')
on conflict (code) do nothing;
-- Rotate later via, e.g.:
--   update invite_codes set is_active = false where code = 'old-code';
--   insert into invite_codes (code) values ('new-code');

-- 5. verify_invite_code: public RPC, mints a short-lived one-time
-- redemption token from a code without ever exposing invite_codes itself.
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

-- 6. Email/password path: BEFORE INSERT trigger on auth.users. Only
-- enforces the invite requirement for provider = 'email' rows - Google
-- (and any other OAuth provider) rows are intentionally let through here
-- and gated reactively by the app instead (see step 7/8), because
-- Supabase creates those auth.users rows before our code ever runs; a
-- hard block here would make Google sign-in itself fail at the GoTrue
-- level before the user ever reaches our /auth/callback page.
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

-- 7. Google/OAuth path: called reactively from /auth/callback once a
-- session exists, using the pending token stashed client-side before the
-- redirect. Consumes the token against the now-authenticated user.
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

-- 8. Reject-and-delete: used when a brand-new Google account had no valid
-- pending invite. Deletes only the caller's own row.
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
