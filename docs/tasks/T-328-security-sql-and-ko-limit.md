# T-328 — Pain-report security, timezone leak, shared KO rate limit

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 2 (SEC-01), 4 (SEC-02), 18 (SEC-04) and 14 (SEC-03).

**Migration:** ONE new file, `supabase/migrations/0131_security_fixes.sql`. It is additive:
- replace policies, functions and grants only;
- add one new table for the rate limit;
- change one foreign key's delete rule;
- write no data and edit no older migration.

Do not apply it to any hosted database.

## 1. A pain report must never block the account purge (SEC-01, HIGH)
- **Where:** `0123_pain_reports.sql:7`. `pain_reports.exercise_id` references `exercises(id)` with no `on delete` rule. The `pain_insert` policy (around :32) never checks `exercise_id`.
- **Bug:** a player who moved to captain B sends a pain report with an exercise id of old captain A. When A is purged, deleting A's exercises fails with 23503, and the whole purge batch rolls back, so other overdue accounts are not deleted either.
- **Fix:**
  - Recreate the foreign key with `on delete set null`. Use `alter table … drop constraint … , add constraint …`; that is fine here.
  - Recreate `pain_insert`. When `exercise_id` is not null, the exercise must be visible to the player through their current program. Compare how `program_exercise_id` is validated, and reuse that.

## 2. A new captain must not read the old captain's pain hints (SEC-02)
- **Where:** `pain_load_hints`, policy `pain_hint_read` (0123:52). It checks only `is_captain_of(player_id)`.
- **Fix:** recreate the policy.
  - The player reads their own hints.
  - A captain reads a hint only when it belongs to a program exercise in a program that the captain owns, and the captain still coaches the player.
  - Apply the same coaching history boundary that `0129_privacy_rls_fixes.sql` uses for `points_read`. Reuse its helper or expression.

## 3. Timezone of any user leaks (SEC-04, still present)
- **Where:** `safe_timezone(uuid)` in `0097_timezone_aware_functions.sql:4`. It is executable by `authenticated`, has no caller check, and works even for suspended callers.
- **Fix:**
  - Find every caller with `grep -rn "safe_timezone" supabase/migrations src`: policies, cron jobs and definer functions.
  - Add an internal `security_private.safe_timezone_internal(uuid)` with the same body, and point every internal caller at it. Recreate those functions in the same migration, copying their **latest** definitions exactly, with only that call changed.
  - Then recreate public `safe_timezone(uuid)` as a wrapper. It returns a value only when the caller is the user, or their active captain, or an admin; otherwise it returns the default zone. Keep the grant.
  - If the app calls it through RPC from `src/`, keep that working.
  - If replacing the callers is too risky, because there are too many, stop and explain in the report instead of half-doing it.

## 4. Shared KO rate limit (SEC-03, still present)
- **Where:** `src/features/ko-account/data/route.ts:26/58/83`. The counter lives in process memory, so each server instance has its own.
- **Fix:**
  - Add the table `security_private.ko_rate_hits (user_id uuid, window_start timestamptz, hits int, primary key (user_id, window_start))`. It is not exposed to the Data API.
  - Add the RPC `public.ko_rate_take(p_limit int, p_window_seconds int) returns boolean`:
    - it is security definer, with `search_path = ''`;
    - it uses `auth.uid()` only;
    - it does an atomic upsert-and-check;
    - it deletes old windows for that user;
    - execute is granted to `authenticated` only.
  - `route.ts` calls it before the model call, with the same limit as today. When it returns false, return the same "rate limited" response as today.
  - If the RPC errors, fail closed: treat it as limited, and log with `console.error`.
  - Remove the in-memory counter.

## Tests (PGlite, full chain) — `supabase/tests/security-0131.test.ts`
- **Purge:**
  - A transferred player cannot insert a pain report with the old captain's exercise.
  - When a pain report points at an exercise that gets deleted, the purge succeeds and the report's `exercise_id` becomes null.
  - An unrelated overdue account is deleted in the same purge.
- **Hints:** after a transfer, captain B sees zero of A's hints. The player still sees all of their own hints, and B sees hints on B's own program.
- **Timezone:** an unrelated player gets the default zone, while the user and their captain get the real one. The reminder and points functions that used it still work; rerun their existing tests.
- **Rate limit:** calls up to the limit return true and the next returns false. Another user has their own count. Anonymous calls are rejected.
- **Also:**
  - Unit-test `route.ts` with the RPC mocked: limited, allowed, and RPC error.
  - Update `src/types/app-database.ts` for the new RPC.

## Out of scope
- `use-focus-session.ts` and the workout UI (T-325).
- Templates, reminders and points_board SQL (T-329, migration 0132).

## Gates
`npm run typecheck`, `npm run lint`, `npx vitest run supabase/tests/security-0131.test.ts src/features/ko-account`, and the existing pain, purge, points, reminders and privacy tests in `supabase/tests/`.
