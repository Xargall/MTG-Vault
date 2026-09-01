-- Clean up guest/anonymous accounts (created via "Demo ausprobieren") and
-- keep doing so automatically going forward.
--
-- Supabase's `auth.users` table has an `is_anonymous` column that's `true`
-- for guest sign-ins and automatically flips to `false` the moment a user
-- links a real identity (email/password, Google, ...) - so this can never
-- accidentally delete a real account, only ones still purely anonymous.
-- collection_cards/decks/wishlist all reference `auth.users(id) on delete
-- cascade`, so their demo data is removed automatically too.
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1. One-time cleanup: remove every anonymous account that exists right now.
delete from auth.users where is_anonymous = true;

-- 2. Ongoing automation: enable pg_cron and schedule a daily job that removes
-- anonymous accounts older than 24h, so guest sessions clean up after
-- themselves without any manual step from here on.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-anonymous-guests') then
    perform cron.unschedule('cleanup-anonymous-guests');
  end if;
end $$;

select cron.schedule(
  'cleanup-anonymous-guests',
  '0 3 * * *', -- daily at 03:00 UTC
  $$delete from auth.users where is_anonymous = true and created_at < now() - interval '24 hours';$$
);
