# T-149 — Three days before month end: "the crown is within reach"

**Phase:** Gamification · **Depends on:** T-135, T-139, T-142 · **Status:** ready (owner request 2026-11-10)

## Goal
On the third-to-last day of each month (Africa/Cairo), players who can still take or keep the crown get one
notification: the holder «حافظ على التاج: فاضل 3 أيام», a close chaser «التاج قريب: فاضلك {n} تمرين/درجة».

## Files
Create or modify only these:
- `supabase/migrations/0086_crown_month_end_reminder.sql` (new)
- `supabase/tests/crown-month-end-reminder.test.ts` (new)
- `src/features/notifications/` files that map types to text, icon and link (as T-135 did for `crown_taken`)
- `supabase/functions/send-push/messages.ts` and its test
- `supabase/functions/send-push/payload.ts` and `payload.test.ts` (owner-approved review extension)
- `src/types/database.ts` if a public signature changes
- This task card.

## Requirements
1. Notification types gain `crown_close` and `crown_defend` (restate the full check list, as 0081 did).
2. `public.queue_crown_reminders(p_today date default (now() at time zone 'Africa/Cairo')::date)`,
   `security definer`, `set search_path = ''`, executable by nobody but the owner/cron (revoke from public,
   anon, authenticated). It does nothing unless `p_today` is the third-to-last day of its month.
3. For each captain with at least two active players, read `security_private.points_board` once:
   - position 1 with `done >= 4` and `adherence > 0`: `crown_defend`.
   - position 1 without holder qualification: reachable `crown_close` with `gap = 0`.
   - positions 2–3: `crown_close` with payload `{ needs_workouts, gap }` (`needs_workouts = greatest(0, 4 - done)`,
     `gap = top score + 1 - score`), only if `needs_workouts <= 3` (still reachable in three days).
   - Payload also carries `captain_id` and `month`.
4. Idempotent: running twice on the same day inserts nothing new (dedupe on user, type and month).
5. Schedule with `pg_cron` the same guarded way as 0052/0067 (only if the `cron` schema exists), daily at
   07:00 Africa/Cairo expressed in UTC with a comment.
6. App text: `crown_close` «التاج قريب! فاضلك {n} تمرين في 3 أيام» or, when no workouts are needed, «التاج
   قريب! فاضلك {gap} درجة»; `crown_defend` «حافظ على التاج: فاضل 3 أيام على آخر الشهر». English short and
   plain. Crown icon; link `/player/rank`. Push text mirrors it.

## Acceptance
- [ ] PGlite tests with injected `p_today`: no-op on other days; holder gets `crown_defend`; 2nd and 3rd get
  `crown_close` with the right payload; 4th gets nothing; a chaser needing 4 workouts gets nothing; a
  one-player team gets nothing; second run inserts nothing; February and 30/31-day months; grants.
- [ ] Notification format and push payload tests, ar and en.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Changing the crown rule, captain notifications, email.

## Implementation notes

- Migration 0086 queues eligible active players from one materialized points board per captain,
  with a unique user/type/month index for retry and concurrent-run deduplication. Month payloads
  use the first day (`YYYY-MM-01`), matching existing crown notifications.
- The owner-only function revokes service-role access too. The guarded cron schedule checks
  04:00 and 05:00 UTC and calls the function only at Cairo 07:00, accounting for daylight saving.
- App mappings preserve numeric workout/score gaps, use the Crown icon and rank link, and have
  Arabic/English coverage. Push message templates are added with their own tests.
- Owner-approved review extension completes push interpolation and rank routing in `payload.ts`
  with Arabic/English payload tests. No unrelated payload behavior was changed.
- Review fix: an unqualified leader receives `crown_close` when reachable, with workout needs
  and a zero score gap. A two-workout leader regression verifies no `crown_defend` is sent.
  App and push use workout wording when workouts are needed; score wording requires a positive
  gap so neither displays «فاضلك 0 درجة».
- Targeted verification: 103 tests across all 14 requested suites pass using
  `--configLoader native --pool threads --maxWorkers 1`.
  Review rerun: `npx tsc --noEmit` passes; `npm run check` passes type checking and lint,
  then stops at `spawnSync git EPERM` in the release audit. `npm run build` again fails
  only fetching Alexandria, Changa and Manrope from Google Fonts.
  The default Vitest runner encounters sandbox `spawn EPERM`. The build fails fetching only
  Alexandria, Changa and Manrope from Google Fonts.
- `npm run check` passes type checking and lint, then fails at the release audit with
  `spawnSync git EPERM`. Full-suite attempts were interrupted after prolonged resource stalls;
  observed failures were `src/lib/perf-budget.test.ts` (after the incomplete build) and a timeout
  in `supabase/tests/demo.test.ts`; `fleet-player-notifications.test.ts` also timed out in setup.
  These out-of-scope tests were not modified. The full suite has not been verified.
