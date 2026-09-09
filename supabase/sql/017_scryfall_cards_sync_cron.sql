-- Schedules the daily sync-scryfall-cards Edge Function call. This project
-- already uses pg_cron (007_cleanup_anonymous_users.sql) but only for plain
-- in-database SQL - calling an Edge Function over HTTP additionally needs
-- pg_net.
--
-- IMPORTANT (run once, before this file): the bearer token used to
-- authenticate the cron job's call to the function must exist in Supabase
-- Vault first - never commit the actual secret value to a migration file:
--   select vault.create_secret('<service-role-key>', 'sync_scryfall_cards_bearer');
--
-- Safe to re-run (the schedule and secret lookup are idempotent; re-running
-- vault.create_secret with the same name is not - only do that once).

create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-scryfall-cards') then
    perform cron.unschedule('sync-scryfall-cards');
  end if;
end $$;

select cron.schedule(
  'sync-scryfall-cards',
  '0 4 * * *', -- daily at 04:00 UTC (offset from the existing 03:00 guest-cleanup job)
  $$
  select net.http_post(
    url := 'https://coxcqblefdlcmeumuglq.supabase.co/functions/v1/sync-scryfall-cards',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sync_scryfall_cards_bearer')
    )
  );
  $$
);
