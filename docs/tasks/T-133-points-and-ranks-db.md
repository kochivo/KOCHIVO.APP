# T-133 — Points, ranks and the monthly crown (database and server)

**Phase:** Gamification · **Depends on:** none · **Status:** implemented (local gate limits below)

## Goal
Players earn points for real training actions.
- **Rank:** absolute and based on lifetime points. A rank is never lost.
  - مبتدئ: 0–99
  - بطل: 100–299
  - نخبة: 300–599
  - أسطورة: 600 or more
- **The crown (التاج):** each captain's team has exactly one holder, decided by points earned in the current calendar month, Africa/Cairo time. The race restarts on the 1st of each month.

The database is the single source of truth: all awarding happens in SQL, and the client can never write points.

This card covers the schema, the awarding, anti-cheat, the leaderboard RPC and crown-change notifications.

The UI comes in T-135 and the badge art in T-134.

## Files
Create or modify only these:
- `supabase/migrations/0081_points_and_ranks.sql`. 0078 and 0079 are reserved; do not use them.
- `supabase/tests/points-ranks.test.ts` (PGlite)
- `src/features/ranks/index.ts`: public API only.
- `src/features/ranks/tiers.ts`: pure `tierFor(lifetime)`, `nextTier(lifetime)` returning `{ tier, needed }`, the `TIERS` thresholds, and `CROWN_MIN_MONTHLY = 20`.
- `src/features/ranks/types.ts`: `Tier = 'beginner' | 'champion' | 'elite' | 'legend'`, plus `LeaderboardRow`.
- `src/features/ranks/data/load-leaderboard.ts`: calls `team_leaderboard()`.
- `src/features/ranks/data/load-my-points.ts`: calls `my_points()`.
- `src/features/ranks/data/review-points.ts`: calls `review_points()`.
- `src/features/ranks/ranks.test.ts`
- `src/features/ko-account/route.ts`: one call to `award_meal_check()` after a meal-photo reply succeeds. No other change in that file.
- `src/types/database.ts`
- This task card.

## Requirements
1. **`points_log`** is append-only history and the source of truth.
   - Columns:
     - `id uuid`, `player_id`
     - `captain_id`: a snapshot of the player's active `coach_clients` link when the points are earned
     - `kind`: `workout` | `pr` | `perfect_week` | `inbody` | `meal_check`
     - `source_key text`, `points smallint`
     - `status`: `counted` | `pending` | `rejected`
     - `earned_on date` (Cairo), `created_at`, `reviewed_at`
   - `unique (player_id, kind, source_key)` makes every award idempotent: offline re-sync or double taps never double-count.
   - Index `(captain_id, earned_on)` and `(player_id, earned_on)`.
   - RLS:
     - the player reads their own rows;
     - the linked captain (`is_captain_of`) reads them;
     - no direct insert, update or delete for anyone (all writes go through security-definer functions);
     - add the restrictive `active_caller` policy, as on other tables.
2. **`player_points`** (`player_id` pk, `lifetime int not null default 0`, `updated_at`) is a cache.
   - It is maintained only by a trigger on `points_log`:
     - a row inserted as `counted` adds its points;
     - `pending` → `counted` adds them;
     - `pending` → `rejected` adds nothing.
   - Lifetime never decreases, so the rank is never lost. RLS works as in item 1.
3. **Awarding.** All of it is server-side. Use triggers or functions with `security definer` and `set search_path = ''`.
   - **Workout +3**, when `workout_sessions.completed_at` goes from null to set. Source key: the session id.
     - Anti-cheat: the award is `pending` (not lost) when either
       - `completed_at - started_at < greatest(20 min, 50% of planned minutes)`, where planned minutes = sum over the day's program exercises of `sets * (rest_seconds + 40) / 60`; or
       - the non-deleted logged sets are fewer than 60% of the planned sets.
     - Otherwise the award is `counted`. Sessions with no `program_day_id` use only the 20-minute floor.
     - Note: `started_at` comes from the device (offline-first), so the set-count rule is the stronger check.
   - **PR +1** each, at most 3 per session. Source key: `session_id:exercise_id`.
     - A PR is when the best Epley e1RM (`weight * (1 + reps/30)`, reps 1–12, weight > 0) for an exercise in this session beats every earlier non-deleted set of the same player for that exercise.
     - The first time an exercise is ever logged is not a PR.
     - A PR's status follows the workout's status (pending if the workout is pending).
   - **Perfect week +10.** Source key: the week's Saturday date.
     - When a completion makes the number of completed sessions in that Saturday-start week reach or exceed the active program's training days (non-rest weekly days), award once.
   - **InBody +5.** Source key: `YYYY-MM` of `scan_date`, so it is at most once per month.
     - Awarded on `body_scans` insert.
   - **Meal check +1.** Source key: the Cairo date, so it is at most once per day.
     - Use the RPC `award_meal_check()` (authenticated, acts on `auth.uid()` only).
     - It is called by the KO route after a successful meal-photo analysis.
   - No backfill: everyone starts at 0 on launch day.
4. **`review_points(p_id uuid, p_approve boolean)`:**
   - Only the player's linked captain can call it.
   - It acts only on `pending` rows and works once.
   - Approving makes the row `counted`.
   - The PRs of the same session follow the workout row's decision.
5. **`team_leaderboard(p_month date default current Cairo month)`** returns one row per player:
   - `player_id`, `display_name`, `lifetime`, `tier`, `monthly`, `is_crown`, `position`.
   - Callers:
     - **a captain** gets their active roster (`coach_clients` not archived);
     - **a player** gets their captain's roster with first names only, and only their own `player_id` (others null).
   - `monthly` = the sum of `counted` points with `earned_on` in that month and `captain_id` = this captain.
   - Sort by monthly desc, then by who reached their monthly total first (the max `created_at` of their counted rows, ascending).
   - The crown goes to position 1 only if `monthly >= 20`. Early in the month nobody holds it.
   - Past months work through `p_month`, so the history of crown holders needs no extra table.
6. **`my_points()`** returns `lifetime`, `tier`, `monthly`, `month_position`, `crown_gap` (the points needed to take the crown, or 0 if the caller holds it), and the last 10 log rows.
7. **Crown-change notifications.**
   - When a row becomes `counted`, the trigger compares the team's crown holder for that month before and after.
   - It takes `pg_advisory_xact_lock(hashtext(captain_id::text))` so concurrent awards cannot race.
   - On a change, insert into `notifications`:
     - `crown_taken` for the new holder;
     - `crown_lost` for the previous one.
   - Extend `notifications_type_check` (copy the full list from 0067, plus `rank_up`, `crown_taken` and `crown_lost`).
   - Also insert `rank_up` when lifetime crosses a tier threshold.
   - Push delivery uses the existing notification pipeline, so no Supabase Realtime is needed.
8. **Security.**
   - Revoke everything from `anon`.
   - Grant only the RPCs to `authenticated`.
   - Players can never call `review_points`.
   - Nothing trusts client-sent point values.

## Acceptance
- [x] PGlite tests:
  - each award kind;
  - idempotency (re-sync of the same session gives no second award);
  - anti-cheat pending (both rules);
  - the PR cap of 3, and no PR on the first log of an exercise;
  - perfect week once;
  - InBody once per month;
  - meal check once per day;
  - review approve and reject, once only, captain only;
  - lifetime never decreases;
  - leaderboard sorting and the tie-break;
  - no crown below 20 monthly points;
  - a new month resets the crown;
  - a player sees first names only;
  - a crown swap notifies both players;
  - RLS: no direct writes, anon is blocked, a suspended caller is blocked.
- [x] Unit tests: `tierFor` and `nextTier` at 0, 99, 100, 299, 300, 599, 600 and 5000.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- All UI (T-135) and badge art (T-134).
- Applying the migration to production (the owner applies it).
- Supabase Realtime.
- Changing `sync_workout_sessions`.

## Implementation plan
- Add deterministic tier boundary tests and PGlite award, review, privacy and notification tests.
- Implement 0081 with private award/ranking helpers, protected history/cache, and authenticated RPCs.
- Add typed data loaders and the single successful meal-photo award call; run both repository gates.

## Implementation notes
- T-138 (`T-138-meal-points-out-of-crown.md`) excludes meal checks from the monthly crown while preserving lifetime rank and history.
- 0081 adds the protected ledger/cache, server awards, review RPCs, private ranking helpers and notification inserts; no production migration was applied.
- A set-log trigger rechecks offline sessions because sessions sync before sets. Late sets can clear an unreviewed set-count shortage; captain decisions stay final. Pre-launch sessions without an award are never backfilled.
- Session locks serialize the three-PR cap; team advisory locks serialize crown comparisons before each counted row. UUID is the final tie-break when totals and timestamps match exactly.
- Reviewing a PR resolves to its workout and applies one decision to the session. Profile deletion cascades through the new tables to preserve existing account/demo cleanup.
- `nextTier` returns `{ tier: 'legend', needed: 0 }` at the top tier. Data loaders validate RPC responses; the KO route awards only after successful player meal-photo execution.
- Focused tests: 25 passed. Typecheck/lint passed; direct release-rule scan (including untracked files) found 0 issues. Standard `npm run check` is blocked at release audit by sandbox `spawnSync git EPERM`. Build fails only fetching Alexandria, Changa and Manrope from Google Fonts.
- Full suite with `--configLoader native --pool threads --maxWorkers 2`: 403 files / 2,853 tests passed; 2 files / 2 tests failed outside this card: `src/features/templates/empty-states.test.ts` expects old `span` heading markup instead of `bdi`; `src/lib/perf-budget.test.ts` references a missing `.next` chunk after the font-blocked build. Demo/account cleanup regressions found in the first run were fixed and pass in the final run.
- Reviewer follow-up outside the allowed files: `supabase/functions/send-push/payload.ts` and its `messages.ts`, plus notification UI types/messages/loaders, do not yet support `rank_up`, `crown_taken`, `crown_lost`. SQL notifications are queued, but existing formatting/delivery needs those handlers.

## Review fixes
- Crown scoring and the four-workout minimum are superseded by [T-139](T-139-crown-by-adherence.md).
- Perfect weeks now count distinct training dates with counted workout awards only. An AFTER trigger on `points_log` rechecks normal completions, late-set flips and captain approvals; pending/rejected workouts never qualify.
- InBody awards require `scan_date` in the current Africa/Cairo month; the monthly source key and original scan date are preserved.
- Meal-award failures warn and preserve the successful photo reply, including RPC errors returned as data and rejected promises. Focused PGlite-backed route tests exercise both failure paths.
- Issue 3 remains open under the requested fallback: `planIntent`/`requestKoTool` only call Gemini; `executeIntent('meal_photo')` calls `readMeal`, which only selects nutrition data. No trusted persisted photo/message/quota/meal receipt exists. The `usage` map is memory-only, and `getKoActor().db` is a cookie-authenticated player client from `supabaseServer`, using the publishable key; the route has no privileged client. Securing this award needs either a trusted persisted analysis receipt or service-role client provisioning outside this allowlist. The zero-argument RPC/signature is unchanged; a PGlite test explicitly records that direct no-photo calls remain possible once daily.
- Review regression run: requested focused command passes all 59 tests across 7 files (including five assertions observed failing before the SQL/route fixes). No unrelated implementation was refactored.
- Review checks: typecheck/lint passed. `npm run check` stops at release audit (`spawnSync git EPERM`); build fails only fetching Alexandria/Changa/Manrope. Full native/thread suite: 2,858 passed, with the same 2 out-of-scope failures (`templates/empty-states.test.ts` markup mismatch and `perf-budget.test.ts` missing build chunk).
