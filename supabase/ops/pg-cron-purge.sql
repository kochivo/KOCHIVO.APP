-- Hosted-only setup, run once on Supabase (applied 2026-11-03). Not a migration because
-- PGlite tests have no pg_cron. Re-running is safe: cron.schedule replaces a job with the same name.
-- 01:00 UTC is 03:00 Cairo in winter and 04:00 in summer, outside training hours.
create extension if not exists pg_cron;
select cron.schedule('purge-deleted-accounts', '0 1 * * *', 'select public.purge_deleted_accounts()');
select cron.schedule('purge-demo-workspaces', '*/30 * * * *', 'select security_private.purge_demo_workspaces()');
