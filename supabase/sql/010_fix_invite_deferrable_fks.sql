-- Fixes a bug in 008_invite_gating.sql: the BEFORE INSERT trigger on
-- auth.users writes to invite_redemptions.consumed_by and inserts into
-- invited_users, both of which have a foreign key to auth.users(id). Since
-- this happens *before* the new auth.users row is actually inserted, the
-- FK check fails immediately (Postgres checks non-deferrable FKs at
-- statement time), and every signup fails with "Database error saving new
-- user" - even with a perfectly valid invite code.
--
-- Fix: make both FKs DEFERRABLE INITIALLY DEFERRED, so the check happens
-- at COMMIT time instead of immediately - by which point the auth.users
-- row from the same transaction already exists. Only needed if you already
-- ran 008_invite_gating.sql before this fix landed; a fresh run of the
-- (now corrected) 008 script doesn't need this.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'invite_redemptions'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f';

  if v_constraint is not null then
    execute format('alter table invite_redemptions drop constraint %I', v_constraint);
  end if;

  alter table invite_redemptions
    add constraint invite_redemptions_consumed_by_fkey
    foreign key (consumed_by) references auth.users(id)
    deferrable initially deferred;
end $$;

do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'invited_users'::regclass
    and confrelid = 'auth.users'::regclass
    and contype = 'f';

  if v_constraint is not null then
    execute format('alter table invited_users drop constraint %I', v_constraint);
  end if;

  alter table invited_users
    add constraint invited_users_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade
    deferrable initially deferred;
end $$;
