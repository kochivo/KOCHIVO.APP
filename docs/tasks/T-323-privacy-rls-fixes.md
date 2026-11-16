# T-323 — Two privacy leaks in RLS (security audit, 2026-11-16)

The security audit confirmed two leaks by replaying every migration in PGlite. Fix both in ONE new migration, `supabase/migrations/0129_privacy_rls_fixes.sql`. Do not edit any older migration. The migration is additive: replace the two policies only, and touch no data.

## 1. Custom-form photos ignore the player's photo privacy
- **Where:**
  - `supabase/migrations/0091_custom_forms.sql` defines storage policy `custom_forms_photo_read`.
  - `supabase/migrations/0125_women_mode.sql` applies the `photos_captain` preference only to legacy check-in photos.
  - The UI that reads these photos is `src/features/forms/components/request-review.tsx`.
- **Bug:** a female player turns off `photos_captain`, then uploads a photo in a custom check-in form. The coach can still open that photo through a signed URL.
- **Fix:** recreate `custom_forms_photo_read` so the coach branch also requires that the player allows captain photos.
  - Use the same check 0125 uses for legacy photos; read 0125 and reuse its helper or expression.
  - The player id is the second path segment: `forms/<player>/<request>/<file>`.
  - Keep the player's own access and the existing request and recipient checks exactly as they are.

## 2. A new coach can read the old coach's points history
- **Where:**
  - `supabase/migrations/0081_points_and_ranks.sql`, policy `points_read` on `points_log`.
  - Compare it with the history boundary that session reads already use in `supabase/migrations/0097_timezone_aware_functions.sql` and later migrations. Find the current helper that limits a captain to the player's history since the captain took them on, and reuse it.
- **Bug:** a player trains under coach A in October, then moves to coach B in November. B cannot read the October sessions, but B can still read the October `points_log` rows. Those rows include event dates, kinds, source ids, and A's id.
- **Fix:** recreate `points_read`:
  - The player still reads all of their own rows.
  - A captain reads only rows that belong to them (`captain_id` = the captain) **and** that fall inside the current coaching boundary.
  - Check that the leaderboard and points RPCs still work. They are security definer, so they should be unaffected; prove it with a test.

## Tests
Add `supabase/tests/privacy-rls.test.ts` (PGlite, full migration chain), with at least these cases:
- The coach cannot read a custom-form photo when `photos_captain` is off.
- The coach can read that photo when `photos_captain` is on.
- The player can always read their own custom-form photo.
- After a transfer, coach B sees zero `points_log` rows from coach A's period. B does see the rows from their own period.
- The player still sees every row of their own `points_log`.
- `team_leaderboard` and `my_points` return the same results as before.

Update `src/types/app-database.ts` only if a signature changes. It should not change.

## Rules
- Use additive SQL only. Start with `drop policy if exists` and then `create policy`; write no data.
- Do not apply the migration to any hosted database. The owner approves first.

## Gates
`npm run typecheck`, `npm run lint`, `npx vitest run supabase/tests/privacy-rls.test.ts supabase/tests/audit-fixes.test.ts`, and the existing forms, points and women-mode tests in `supabase/tests/`.
