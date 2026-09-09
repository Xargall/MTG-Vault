-- Un-schedules the 'sync-scryfall-cards' cron job added in
-- 017_scryfall_cards_sync_cron.sql - it called the sync-scryfall-cards Edge
-- Function, which hit Supabase Edge Functions' CPU-time limit trying to
-- process Scryfall's ~120k-row bulk file in one invocation ("CPU Time
-- exceeded", confirmed live). Edge Functions are built for short
-- request/response work, not a single-shot bulk ETL job of this size.
--
-- Replaced by a GitHub Actions scheduled workflow instead (see
-- .github/workflows/sync-scryfall-cards.yml + scripts/sync-scryfall-cards.mjs)
-- - a normal CI runner has no comparable CPU budget constraint, and calls
-- the same scryfall_cards table directly via PostgREST/service-role key,
-- no Edge Function involved at all anymore.
--
-- The sync_scryfall_cards_bearer Vault secret from 017 is now unused but
-- left in place (harmless) rather than risk a destructive vault operation
-- for a cleanup with no real value.
--
-- Safe to re-run.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-scryfall-cards') then
    perform cron.unschedule('sync-scryfall-cards');
  end if;
end $$;
