# T-015a — Sync never gets stuck on a deleted program day, exercise, or meal

**Phase:** 5 · **Depends on:** T-010, T-011 (merged) · **Status:** ready
**Delegate to:** Codex

## The bug
Players log offline. Their local rows reference the captain's plan:
- `workout_sessions.program_day_id`
- `set_logs.program_exercise_id`
- `meal_logs.meal_id`

If the captain edits the plan before the player syncs, the referenced row can be **deleted**:
- the program builder deletes removed days and exercises
- `save_nutrition_plan` deletes removed meals

The sync RPCs (0006, 0007) are `security invoker` and insert the reference as-is. So:
- The RLS `with check` (0011: `program_exercise_id is null or owns_program_exercise(...)`) fails, or the FK fails.
- `flushOutbox` fails the **whole batch** and stops later tables.
- The player's phone retries forever, and **nothing** syncs again: not today's sets, and not tomorrow's.

## The fix
A new migration replaces the three sync RPCs so that a reference the caller no longer owns becomes `null` on insert. The log is kept with its `exercise_id`, weight, reps, and dates, so history and PR stats stay correct. It just loses its link to a plan row that no longer exists.

## Files
- `supabase/migrations/0023_sync_orphans.sql` (new). Use 0023; 0022 is reserved by another task.
  - `create or replace function public.sync_workout_sessions(p_rows jsonb)`: identical to 0006 except the inserted value is `case when r.program_day_id is not null and public.owns_program_day(r.program_day_id) then r.program_day_id end`.
  - `create or replace function public.sync_set_logs(p_rows jsonb)`: identical to 0006 except `program_exercise_id` uses the same pattern with `public.owns_program_exercise`.
  - `create or replace function public.sync_meal_logs(p_rows jsonb)`: identical to 0007 except `meal_id` uses `public.owns_meal`.
  - Keep `security invoker`, `set search_path = ''`, the LWW `on conflict … where client_updated_at <` logic, and the same column lists. Do not change the `on conflict do update` set lists.
  - Re-state the grants per 0014: `revoke execute … from public, anon` and `grant execute … to authenticated`.
  - Read `0011_log_ownership.sql` for the exact helper names and signatures before writing.
- `supabase/tests/rls-sync-orphans.test.ts` (new, PGlite harness):
  - a player logs a session and a set that reference a program day and exercise, then the captain deletes that exercise (and, separately, the day) before sync. The sync RPC succeeds and the stored row has a null reference, with every other field intact.
  - the same for a meal log after its meal is deleted
  - a reference to **another** player's program exercise (forged id) is stored as null and never linked
  - a normal sync with live references keeps them
  - LWW still holds: an older `client_updated_at` does not overwrite
  - anon cannot execute any of the three
- `docs/ARCHITECTURE.md`: in the offline/sync section, add 2–3 Arabic lines explaining that plan references are nulled when the target no longer exists, so a deleted plan row never blocks the outbox. Match the surrounding style.

## Requirements
1. No client code changes. `sync.ts` and `transport.ts` stay as they are.
2. Comments explain *why*: one short SQL comment above the first function is enough.

## Acceptance
- [ ] `rls-sync-orphans.test.ts` passes, and the existing `rls-log-ownership` and `rls` tests still pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Per-row error isolation in `flushOutbox`
- Subscription-expired retries (those are expected to wait)
- Any UI
