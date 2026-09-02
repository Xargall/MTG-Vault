-- Tighten guest/anonymous cleanup from daily to hourly, so real-world
-- lifetime of a "Demo ausprobieren" account stays close to the intended
-- 24h TTL instead of drifting up to ~48h (the daily-at-03:00 schedule from
-- 007_cleanup_anonymous_users.sql only catches accounts once a day).
--
-- Run this once in the Supabase SQL editor. Safe to re-run (idempotent).

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
