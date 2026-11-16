# T-332 — Account purge must survive a former player's history

**Source:** found while doing T-328 (2026-11-16). During its PGlite probes, Codex hit `program_exercises_exercise_id_fkey` as a second purge blocker.

**Migration:** ONE new file, `supabase/migrations/0133_purge_after_transfer.sql`. It is additive: new columns with defaults, replaced functions and policies; no data rewrites of existing rows, and no edits to older migrations. Do not apply it to any hosted database.

## Problem to verify first (PGlite, full chain)
Captain A creates a custom exercise and puts it in player P's program. P trains, so `set_logs` and maybe `program_exercises` rows reference A's exercise. Then P moves to captain B, perhaps with B's programs or templates copied in other ways. Later A requests deletion and `purge_deleted_accounts()` runs.

1. Reproduce. List **every** foreign key that blocks the deletion of A's exercises, foods or other owned library rows: `set_logs.exercise_id` (not null, no cascade), `program_exercises.exercise_id`, and meals/foods if they have the same pattern. Also check whether one failure rolls back the whole batch, as in SEC-01.
2. Fix it so that:
   - A's account is purged;
   - other overdue accounts in the same batch are purged too;
   - P keeps their full training history, with the exercise name still shown in history and charts;
   - the leftover rows are not visible to anyone else.

## Suggested design (change it if probing shows a simpler safe one; explain why)
- Add `exercises.orphaned_at timestamptz` (null by default).
- In the purge, a custom exercise that other users' rows still reference is not deleted. Set its `owner_id` to null **and** `orphaned_at = now()`.
- Read policies:
  - orphaned exercises are never part of the global library (check how `owner_id is null` is used for global rows and exclude orphaned ones everywhere: RLS, library queries, search RPCs);
  - a player can still read an orphaned exercise that is referenced by their own `set_logs` or `program_exercises`.
- Do the same for any other owned library table that blocks the purge.

## Tests — `supabase/tests/purge-after-transfer.test.ts`
- A transferred player's history on A's custom exercise does not block A's purge. An unrelated overdue account in the same batch is purged too.
- After the purge, the player still reads their sets and the exercise name.
- Captain B and an unrelated user cannot see the orphaned exercise, and it is missing from the global library and search.
- The normal purge, with no transfer, behaves as before; rerun `purge-with-forms.test.ts` and the security-0131 tests.

## Out of scope
- `safe_timezone` (SEC-04).
- Any UI.

## Gates
`npm run typecheck`, `npm run lint`, and the new test plus the existing purge, exercise library and RLS tests in `supabase/tests/`.
