# T-257 — Prescribed weight per exercise

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 5.

## Goal
Next to sets, reps and rest, the captain writes the weight for an exercise, either one weight for all sets or one per set. While logging, the player sees it as «المطلوب» and it is pre-filled.

## Files
- `supabase/migrations/<next>_target_weight.sql`:
  - `program_exercises.target_weight_kg numeric(6,2)` (0..1000, nullable).
  - Extend the `set_plan` validation trigger so that each set target can carry an optional `weight_kg` number. Keep `reps_min`, `reps_max` and `rir` exactly as they are, so old `set_plan` rows stay valid.
- `supabase/tests/target-weight.test.ts`: a valid weight, a negative weight rejected, and an old `set_plan` with no weight still accepted.
- `src/lib/set-plan.ts`: optional `weight_kg` in the schema.
- `src/core/offline/db.ts`: if the program snapshot is cached offline, carry the new field.
- `src/features/captain-workspace/training/` (`exercise-fields.tsx` and `exercise-row.tsx`): the weight field, highlighted as on the board.
- `src/features/workout/`: show the target and pre-fill the weight input when the player has no previous log for that set.

## Requirements
1. The player's own last weight wins over the target when pre-filling. The target is still shown as «المطلوب».
2. Units follow the player's kg/lb setting on display. Storage stays in kg.
3. Templates and program copies keep the weights.

## Acceptance
- [ ] The captain sets a weight and the player sees it in the workout.
- [ ] A per-set weight works.
- [ ] Old programs with no weight look exactly as they do today.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Percent of 1RM prescriptions.
