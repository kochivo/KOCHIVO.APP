# T-293: KO edits keep the per-set plan in sync; deleting an alternative exercise cannot leave dangling ids (audit BUG-01, BUG-02)

## Problem 1 (BUG-01)
KO account actions update `program_exercises.sets`, `reps_min` and `reps_max`, but ignore `set_plan`. Relevant code:
- `src/features/ko-account/data/execute.ts:72,97`;
- `supabase/migrations/0071_ko_account_actions.sql:145`, or the final definition of that function;
- the `set_plan` constraint in `0100_exercise_alternatives_set_plan.sql:26`.

In a PGlite probe:
- A KO change from 2 to 3 sets, on an exercise that has a 2-entry `set_plan`, fails with `23514 set_plan length must equal sets`.
- A reps-only change returns success, but `set_plan` keeps the old per-set reps. `targetForSet()` in `src/lib/set-plan.ts:22` prefers `set_plan`, so the player still sees the old targets.

Fix it in the final SQL function, through an additive migration:
- When sets change and `set_plan` is not null, resize it. Repeat the last entry to grow; truncate to shrink.
- When reps change, write the new reps into every entry. Keep each entry's own weight and other fields.
- Include `set_plan` in the stale-change check, so a captain edit made between the KO preview and the confirm is still detected.

## Problem 2 (BUG-02)
`program_exercises.alternatives` is a uuid array with no FK (`0100:4,18`). `src/features/programs/data/custom-exercise.ts:50` deletes a custom exercise and falls back to archiving only when the delete raises 23503.

If the exercise is used only as an alternative, the delete succeeds and the uuid stays in the array. The next edit of that program exercise then fails with `23514 alternative must be visible to the program captain`.

Fix:
- Add a BEFORE DELETE trigger on `exercises`. It raises 23503 when any `program_exercises.alternatives` contains the id, so the existing archive fallback runs.
- Account deletion must still work: when the owner account is being purged, the trigger must not block it. Pick a safe signal and test it with `public.purge_deleted_accounts()`. Examples: the profile row is gone, or a transaction-local setting that the purge function sets.

## Files
- New migration `supabase/migrations/0115_ko_set_plan_and_alternatives.sql`.
- `src/features/ko-account/data/execute.ts`, only if the client side must also send or compare `set_plan`.
- Tests, both of which must fail before the fix:
  - new `supabase/tests/ko-set-plan.test.ts`;
  - new `supabase/tests/alternative-delete-guard.test.ts`, including a purge of a due captain whose exercise is an alternative.

## Out of scope
Old migrations, UI, other findings. Never apply anything to a hosted database.

## Gates
- The new tests.
- The existing supabase/tests files that mention ko, set_plan, alternatives or purge.
- `npx vitest run src/features/ko-account src/features/programs`.
- `npm run typecheck`, `npm run lint`.
