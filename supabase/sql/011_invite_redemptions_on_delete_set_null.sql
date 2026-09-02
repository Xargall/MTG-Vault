-- invite_redemptions.consumed_by had no ON DELETE behavior (default: NO
-- ACTION), which blocks deleting ANY user who ever redeemed an invite code
-- - including via the Supabase dashboard's "Delete user" button, which
-- runs into the same foreign key. Switch it to ON DELETE SET NULL: the
-- redemption row (and its history - which code, when) stays, it just
-- forgets who used it once that user is gone.
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
    on delete set null
    deferrable initially deferred;
end $$;
