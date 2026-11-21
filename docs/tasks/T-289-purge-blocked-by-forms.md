# T-289: account purge must not fail because of custom forms (audit DB-01, HIGH)

## Problem
`public.purge_deleted_accounts()` (last defined in `supabase/migrations/0020_settings.sql:41` or later; find the final definition) runs one batch:
`delete from auth.users where id in (select p.id from public.profiles p where p.deletion_requested_at < now() - interval '7 days' and not exists (select 1 from public.admins a where a.user_id = p.id))`.

`public.forms.captain_id` references `profiles(id)` with no `on delete` action (`0091_custom_forms.sql:4`). The same applies to the form request, answer, assessment schedule and delivery references (`0091:43,44,59`, `0096_assessment_schedules.sql:6,56`). If any account that is due for deletion owns a form, or appears in a form request, schedule or delivery, the delete fails with 23503. The whole batch then rolls back, so nobody is deleted, every night.

The same pattern may affect `security_private.purge_demo_workspaces()`. Check whether the demo seed can create forms or requests. If it can, fix that path too.

## Files
- New migration `supabase/migrations/0112_purge_forms_cleanup.sql`. Additive only: `create or replace function`, or FK changes made with `alter table ... drop constraint / add constraint`. No data deletes outside the purge functions themselves.
- New test `supabase/tests/purge-with-forms.test.ts`, using the existing PGlite harness and the patterns in `demo.test.ts` and `anonymous-guard.test.ts`.

## What to do
1. List every FK that points at `profiles(id)` or `auth.users(id)` without cascade or set null. Check the final catalog after all migrations in PGlite; don't rely on reading the files. Report the list in your final message.
2. Choose the smallest correct fix. Preferred: inside the purge function, before the `auth.users` delete, delete the dependent forms-graph rows for the users being purged, children first. Alternative: change only the owner/participant FKs to `on delete cascade`, if that does not let a normal captain delete history in other paths.
3. Keep: admins never purged; accounts deleted only after 7 days; `security definer`, `set search_path = ''`, and the same grants as today. Never issue a direct DELETE on `storage.objects`; hosted Supabase rejects it.
4. Tests, all must pass:
   - A due captain who owns a form with a request to a player that has answers, plus an unrelated due player. One purge deletes both, and the form graph rows are gone.
   - A due player who has a form request from a non-due captain. The player is deleted, and the captain and their form stay.
   - A not-yet-due account is kept, and admins are kept.
   - Demo purge: if forms are possible there, the same check.

## Out of scope
Old migrations 0001–0111, app code, any other finding. Do not apply anything to a hosted database.

## Gates
`npx vitest run supabase/tests/purge-with-forms.test.ts supabase/tests/demo.test.ts supabase/tests/anonymous-guard.test.ts`, then `npm run check`.
