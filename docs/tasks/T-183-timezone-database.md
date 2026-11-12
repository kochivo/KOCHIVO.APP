# T-183: Database functions and jobs use each user's timezone

**Phase:** International (owner decision 2026-11-12) · **Depends on:** T-182 · **Status:** ready
**Migration:** yes. It redefines existing function bodies with the same signatures. Applying it to production needs the owner's approval.

## Goal
Database logic that decides "today", "this week", "this month" or "expired" stops assuming Cairo. It uses `profiles.timezone`. For every user whose timezone is `Africa/Cairo`, the result must be exactly the same as today. That covers every existing user.

## Files
- New migration `supabase/migrations/00NN_timezone_aware_functions.sql` (the next free number).
- PGlite tests `supabase/tests/timezone-aware*.test.ts`.
- This card: fill in the audit table below.

## Requirements
1. **Audit first.** List every function, view, policy, trigger and cron job in migrations 0001–latest that uses `'Africa/Cairo'` or `now()::date`/`current_date` as a calendar day, and record it in the table below. Most of these appear in about 30 migrations, for example 0050, 0060, 0064, 0066, 0067, 0081, 0083, 0085–0089 and 0091.
2. **Rule for which timezone:**
   - **Player's timezone:** the player's own day (workouts, sessions, meal logs, daily checks, streaks, inactivity, workout reminders, form schedules sent to that player).
   - **Captain's timezone:** packages, subscription and access expiry, `access_until` comparisons, crowns, ranks and monthly or weekly boards (one board per captain), and expiry reminders.
   - A missing or invalid timezone falls back to `'Africa/Cairo'`. Use one helper, `public.user_today(uuid)`, plus a safe tz-cast helper. Both are `stable`, `security definer`, with `search_path = ''`.
3. **Signatures stay.** Use `create or replace` with **identical signatures, return types and grants**. Never drop, rename or retype anything, and never rewrite stored rows.
4. **Cron jobs.** Jobs that run once a day for everyone, at Cairo midnight, must still work for other timezones. Either schedule them hourly and make each run handle only the users whose local hour matches, or keep the schedule and make them idempotent per user and day. State which approach you chose. Re-running a job must never send a duplicate notification.
5. **Tests:**
   - for each changed function, run the old and new definitions with the same Cairo data and assert identical results;
   - add cases for Riyadh, Dubai, London around DST, and Auckland;
   - cover a captain and player in different timezones for expiry and for the day of a workout.

## Audit table (fill in)
| Object | Migration | Uses | Timezone owner | Changed? |
|---|---|---|---|---|
| `security_private.points_board` | 0083 | Month membership and distinct completion days (indirect consumer of player dates) | Captain | Yes; cross-zone completions use the ledger captain date; same-zone training-day behavior retained |
| `public.player_can_read` | 0003, 0060, 0064 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.player_can_write` | 0003, 0026, 0060, 0064 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.renew_player` | 0019, 0037, 0060, 0064, 0065 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.captain_dropout_radar` | 0021 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.player_can_read_from` | 0027, 0060, 0064 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.create_demo_workspace` | 0031, 0032 | Calendar date/time; new demo users inherit creator zone | Captain for package dates, player for history | Yes; replace latest body, retain historical migrations |
| `security_private.demo_history` | 0032 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `security_private.demo_meal_logs` | 0032 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.activate_program` | 0050 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.save_weekly_program` | 0050 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.queue_workout_reminders` | 0052, 0064 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `security_private.notify_workout_feedback` | 0059 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.resolve_coach_join_request` | 0060 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `security_private.attach_pending_player` | 0060 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.activate_player` | 0060, 0064, 0069 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `security_private.deduct_pt_session` | 0060, 0064 | Calendar date/time | Mixed: captain access, player activity | Yes; replace latest body, retain historical migrations |
| `public.refresh_inactive_alerts` | 0065 | Calendar date/time | Non-Cairo player: captain access, player activity; Cairo player: legacy captain activity day and Cairo access gate | Yes; retain Cairo behavior required by unchanged compatibility tests |
| `public.captain_since` | 0066 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.queue_expiry_reminders` | 0067 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.create_demo_player_workspace` | 0068 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.create_player_invite` | 0069 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `ko_private.workout_reminder` | 0071 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.ko_feed` | 0077, 0080, 0089 | Calendar date/time | Mixed: captain access, player activity | Yes; replace latest body, retain historical migrations |
| `security_private.award_points` | 0081 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `security_private.award_session_points` | 0081 | Workout points attribution | Captain (workout log remains player-local) | Yes; replace latest body, retain historical migrations |
| `security_private.award_inbody_points` | 0081 | Scan eligibility; points month | Player eligibility, captain attribution | Yes; replace latest body, retain historical migrations |
| `public.award_meal_check` | 0081, 0088 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.team_leaderboard` | 0081, 0083 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.my_points` | 0081, 0083 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.queue_crown_reminders` | 0086 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `security_private.freeze_crown_winners` | 0087 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.queue_form_schedules` | 0093 | Calendar date/time | Player | Yes; replace latest body, retain historical migrations |
| `public.send_custom_form_request` | 0093 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.remind_custom_form_request` | 0093 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `public.queue_form_reminders` | 0093 | Calendar date/time | Captain | Yes; replace latest body, retain historical migrations |
| `assign_program_template` (dynamic body extension) | 0050 | Weekly start | Player | Yes |
| `coach_clients.started_on` default; `attach_coach_player` | 0003, 0049 | Relationship start | Captain | Yes; future inserts only |
| `profiles.timezone` default | 0002, 0094 | Default preference | User | No; Cairo is the required fallback |
| `player_intake.birth_year` CHECK | 0012 | Current year minus ten | Player | No; replacing an existing CHECK requires DROP, prohibited by this card’s live-data restrictions |
| `body_scans.scan_date` CHECK | 0058 | Future-day limit | Player | No; replacing an existing CHECK requires DROP, prohibited by this card’s live-data restrictions; can still reject tomorrow in far-east zones |
| Policy `workout_sessions_captain_select` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `set_logs_captain_select` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `meal_logs_captain_select` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `supplement_logs_read` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `daily_checks_read` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `body_scans_coach` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `readiness_decisions_read` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `check_ins_captain_select` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `body_scans_read (storage.objects)` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `private_media_read (storage.objects)` | 0066 | History boundary | Player date; captain relationship midnight | Yes |
| Policy `form_checks_captain_select` | 0066 | Timestamp boundary through captain_since | Captain | Yes, through helper |
| Policy `captain_prizes` | 0085 | Current/next month | Captain | Yes |
| Policy `form_requests_send` | 0091 | Access expiry | Captain | Yes |
| Job `workout-reminders` | 0052 | Daily dispatch | Player | Yes; retain daily schedule, per-user day and unique notification key |
| Job `expiry-reminders` | 0067 | Daily dispatch | Captain | Yes; retain daily schedule, existing unique expiry key |
| Job `crown-month-end-reminders` | 0086 | Month-end dispatch | Captain | Yes; retain both daily UTC slots, remove Cairo-only hour filter; existing unique month key |
| Job `freeze-crown-winners` | 0087 | Completed month | Captain | Yes; hourly, per-captain completed month; existing primary key |
| Jobs `form-schedules`, `form-reminders` | 0093 | Scheduled forms / elapsed reminder hours | Player schedule, captain access | Bodies changed; existing 15-minute schedules retained |
| 0087 one-time winner backfill | 0087 | Cairo completed months | Captain | No; historical data migration must not run again |
| Views | 0001–0095 | Audit | — | No matching views |

Audit covers migrations 0001–0095 (0096 is reserved for assessment_schedules). Superseded definitions are grouped with their current object. No historical migration is edited. Existing CHECK constraints are explicitly retained under the no-DROP restriction.

Implementation plan: add safe stable timezone helpers; replace date expressions in existing bodies while retaining signatures, security modes and ACLs; alter history and month policies; update job dispatch; run deterministic PGlite comparisons and the repository gates. No production database operations.

## Acceptance
- [x] The audit table is complete. Every row is either changed or has a reason to leave it.
- [x] Cairo equivalence tests pass for every changed object.
- [x] The cross-timezone tests pass.
- [x] Re-running jobs creates no duplicate notifications.
- [ ] All gates pass.

## Verification and reviewer notes (2026-11-12)

- `0097_timezone_aware_functions.sql` only changes future behavior: guarded catalog re-emission retains existing function OIDs, signatures, return types, security modes and ACLs. New helpers are stable, security definer, empty-search-path functions; invalid/missing timezone uses Cairo. No historical migration, stored row, live database, dependency or app file was changed.
- Workout and expiry workers retain daily scheduling and existing unique notification keys. Crown reminders retain both daily UTC slots, remove the Cairo-only hour condition and deduplicate per month. Winner freezing runs hourly at each captain's month boundary. Form workers retain their existing schedules and request locks.
- Same-zone boards preserve their training-date membership for Cairo compatibility. Cross-zone boards use the ledger's captain date. Scan eligibility and meal receipts remain player-local; new cross-zone awards belong to the captain's current day. Perfect-week awards already carry the captain date and are not converted again.
- Tests replay old/new definitions and policies on identical Cairo fixtures, compare all public rows after normalizing generated IDs/codes, verify OIDs/ACLs and unchanged live-data fixtures, exercise mixed-zone workout/expiry/month boundaries, and execute captured cron commands repeatedly. `timezone-aware-regression.test.ts` adds warmed-helper clock replacement without `DISCARD PLANS`, non-Cairo inactivity, and expiry anchor coverage.
- `npx tsc --noEmit -p .`: exit 0. `npx eslint .`: exit 0.
- `npm run check`: typechecking and linting pass; release audit is blocked by `spawnSync git EPERM`. Running the same audit rules with `git ls-files -z` piped from PowerShell into Node reports **2276 tracked files, 0 findings**. Including the task's untracked files with `git ls-files --cached --others --exclude-standard -z` reports **2282 files, 0 findings** on the final correction.
- `npm run build`: **Compiled successfully in 16.7s**; then **spawn EPERM** in the TypeScript worker. Standalone TypeScript checking passes; a complete production build remains unverified.
- Default `npx vitest run` config loading is blocked by Windows **spawn EPERM**; full verification uses the prescribed `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`.
- Review correction: the original SQL `user_today()` could cache a literal from the harness's replaced `pg_catalog.now()` after repeated calls. Direct clock reads advanced while the cached helper did not. The helper now replans a parameterized clock read in stable, security-definer PL/pgSQL. No search-path change, test modification, or plan-discard workaround in existing tests is required. Both original crown test files pass in complete file runs, not just isolation.
- Review correction: Cairo-player inactivity keeps 0065's captain-day threshold and Cairo expiry gate, including when the captain uses another zone. This is an explicit compatibility exception required by the owner's follow-up to preserve the existing tests unchanged. Non-Cairo players use their own inactivity day and their captain's access day. The inherited-state inactivity failure is resolved with the original failure.
- Review correction: `queue_expiry_reminders(date)` retains its original Cairo-date argument default. Its body translates that legacy Cairo date anchor into the captain calendar by the captain/Cairo day difference. This preserves the caller contract, Cairo results, grants and default-expression test while dispatching other captains on their own day.
- The five previously failing database test files remain unchanged and pass in the full suite. Root-cause fixes are confined to 0097. Final command: `npx vitest run --maxWorkers=2 --configLoader native --pool=threads` (352.48s):

  ```text
  Test Files  1 failed | 585 passed (586)
       Tests  1 failed | 3807 passed (3808)
  ```

  The only failure is `src/lib/perf-budget.test.ts` / `keeps first-load route JavaScript within gzip budgets`: ENOENT for `.next/static/chunks/2ue262tig0ml5.js` from the incomplete build. All database tests pass, including the original crown, expiry, and inactivity tests unchanged. All other tests pass. The missing-build exception is accepted by the owner's follow-up; the build/audit Windows EPERM gates remain listed above.
- The retained scan CHECK can still reject a player-local tomorrow in far-east zones. Changing either retained CHECK requires a separately authorized constraint replacement; this card's no-DROP restriction takes precedence. No migration was applied to a live database, and no commit was made.

## Out of scope
- App-layer dates (T-182).
- Changing data that is already stored.
