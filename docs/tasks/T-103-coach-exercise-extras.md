# T-103 — Core/Glutes body parts, cardio machines, target RIR

**Phase:** Beta coach feedback · **Depends on:** none · **Status:** ready (owner request 2026-11-06)

## Goal
The first beta coach asked for three additions to the coach's exercise and program flow:
1. "Core" (كور) and "Glutes" (جلوتس) as body parts when creating a custom exercise and when filtering the exercise picker.
2. Treadmill (مشاية) and Stairmaster (جهاز السلم) as cardio machine choices.
3. An optional target **RIR** (Reps In Reserve, 0–5) per program exercise, set next to Sets / Reps / Rest, saved to the database, and shown to the player.

## Current code to read first
- `src/features/programs/custom-exercises.ts`: `bodyParts`, `bodyPartLabels`, `customExerciseSchema`.
- `src/features/programs/components/custom-exercise-sheet.tsx`, `exercise-picker.tsx`, `data/library.ts`, `data/custom-exercise.ts`.
- `src/features/programs/components/cardio-editor.tsx` (cardio kind `datalist`).
- `src/features/programs/components/exercise-row.tsx` (Sets / Reps / Rest grid), `reps-sheet.tsx`, `builder-fields.ts`.
- `src/features/programs/types.ts`, `draft.ts`, `summary.ts`, `data/program-io.ts`.
- `src/features/player-home/data/program-snapshot.ts` and `src/core/offline` snapshot types (`rpe` is already carried; `rir` follows the same path).
- `src/features/workout/components/exercise-header.tsx` / `focus-screen.tsx` (where the player sees the prescription).
- `src/features/templates/` preview model (shows reps etc. for templates).
- Every SQL function that copies `program_exercises` columns by name. Find them with
  `grep -n "rest_seconds, rpe\|rest_seconds,rpe" supabase/migrations/*.sql` and take the **latest** definition of each
  (at least `0005`, `0022`/`0028`, `0036`, `0050`, `0055`).

## Database: `supabase/migrations/0070_exercise_extras.sql` (new)
1. `alter table public.program_exercises add column rir smallint check (rir is null or rir between 0 and 5);`
2. `create or replace` the latest version of every function that copies `program_exercises` rows column by column
   (program copy, template save/apply, weekly cycle, starter templates…) so `rir` is copied too. Keep their signatures,
   `security definer`, `search_path`, and grants exactly as in the latest version. Do not touch 0001–0009.
3. No change to `exercises.body_part` is needed (it is free `text`); `core` and `glutes` are new allowed values for custom exercises only.
4. Regenerate or hand-edit `src/types/database.ts` so `program_exercises` has `rir: number | null`.

## Requirements
### Body parts
1. `bodyParts` gains `'core'` and `'glutes'`; `bodyPartLabels` maps them to new message keys `core` / `glutes`
   (ar: `كور`, `جلوتس`; en: `Core`, `Glutes`). Place them after `waist` so the list reads naturally.
2. The global GIF library never uses `core`/`glutes` as `body_part`. So in the picker filter
   (`data/library.ts` and the local filter in `exercise-picker.tsx`):
   - `glutes` matches `body_part = 'glutes'` **or** `target = 'glutes'`.
   - `core` matches `body_part in ('core','waist')`.
   Put this mapping in one pure helper (for example `bodyPartFilter(part)` in `custom-exercises.ts`) and unit-test it.

### Cardio machines
3. When the custom exercise sheet's body part is `cardio`, show a second select "Machine" (الجهاز) with:
   none / Treadmill (مشاية) / Stairmaster (جهاز السلم). Save the choice to `exercises.equipment` as `'treadmill'` / `'stairmaster'`
   (null for none). Extend `customExerciseSchema` (`equipment` optional enum) and `optimisticExercise`; hide and clear it for other body parts.
   Check `data/custom-exercise.ts` writes `equipment` on insert and update.
4. `cardio-editor.tsx` datalist gains `treadmill` and `stairmaster` (same message keys as above).

### Target RIR
5. `DraftExercise` / `ExercisePatch` gain `rir: number | null`. Load and save it in `program-io.ts` and every draft helper that builds or copies a row (new rows default `null`).
6. In `exercise-row.tsx` the grid becomes 4 cells (`grid-cols-2 sm:grid-cols-4`): Sets, Reps, Rest, **RIR**.
   The RIR cell is a button with the same `field` classes that opens a small sheet (`rir-sheet.tsx`, same pattern as `rest-sheet.tsx`):
   chips `—` (none) and `0 1 2 3 4 5`, each ≥48px, with a one-line hint (ar: `عدد العدات اللي تفضل في خزانك قبل الفشل`, en: `Reps left in the tank before failure`).
   The cell shows `—` when null. Its button has a translated `aria-label` like the Reps button.
7. `summary.ts` `exerciseSummary` appends `RIR 2` when set (use a message key, Latin "RIR" in both locales).
8. Player: carry `rir` through `program-snapshot.ts` select and the offline snapshot type, and show `RIR 2` next to the reps target in the focus-mode exercise header (only when not null). Template preview shows it the same way if it already shows reps.
9. All new strings live in the feature `messages.ts` files, Egyptian Arabic, no emoji. Logical properties only.

## Acceptance
- [ ] A captain creates a custom exercise with body part Glutes or Core; it appears under the matching picker chip, and library exercises with target glutes / waist exercises appear too.
- [ ] Choosing Cardio shows the Machine select; Treadmill saves `equipment = 'treadmill'`.
- [ ] Cardio kind suggestions include مشاية and جهاز السلم.
- [ ] Setting RIR 2 on an exercise survives save and reload of the program, copies with the program/template, and shows as `RIR 2` in the player's focus screen.
- [ ] Unit tests: `bodyPartFilter`, schema accepts/rejects `equipment`, draft round-trip keeps `rir`, `exerciseSummary` with and without RIR.
- [ ] PGlite test in `supabase/tests/`: `rir` check rejects 6 and -1, accepts null and 0–5; at least the program copy / template save function preserves `rir`.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Player logging their *actual* RIR per set (`set_logs`) — offline sync path is untouched.
- Renaming or removing `waist`/Abs.
- Any player-home or dashboard change (that is T-104).

## References
- `AGENTS.md` §3–§4, `docs/ARCHITECTURE.md`.
