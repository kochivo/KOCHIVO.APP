# T-069 — Sets need real weight and reps; the player can see their workout history

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04)

## Problem
1. **A set can be completed without real values.**
   - In `workout/components/focus-screen.tsx` + `hooks/use-focus-session.ts`, the weight stepper starts at `0` when there is no previous performance, and «خلّصت المجموعة» ("finished the set") is enabled anyway.
   - So the player can tap through a whole workout with 0 kg (and 0 reps if they step down), and the workout finishes. Those logs are useless to the player and the coach.
2. **No history.** The player only sees «آخر مرة» ("last time") for the current exercise inside the workout. There is no screen to look back at:
   - finished workouts
   - the weights and reps used per exercise

## Changes
### A. Set validation (workout feature)
- **Reps** must be ≥ 1 to complete a set.
- **Weight** must be > 0, unless the player switches on a «وزن الجسم» ("bodyweight") toggle for that exercise.
  - Bodyweight examples: push-ups, pull-ups, planks.
  - The toggle is a chip/switch under the weight stepper, at least 48 px.
  - It is remembered per `exercise_id` in the local db or localStorage, so the next session starts with it on. With it on, the weight stepper hides and `weight_kg` is logged as `0`.
- **The complete button stays tappable.**
  - When values are invalid, tapping it shows an inline message under the steppers and does not log: «حط الوزن والعدات الأول» ("enter the weight and reps first"), or «حط عدد العدات» ("enter the number of reps") when only reps are missing.
  - The invalid stepper is highlighted (token colors) and focus moves to it.
  - Do not use a silent disabled state.
- **Prefill stays as today:** last performance first, then the plan's `reps_min` for reps. Weight with no history starts at 0, which is now invalid until the player sets it.
- **Editing a done set** (`SetDots` → edit) follows the same rule.
- The pure check lives in `workout/set-validation.ts` (`validateSet({ weight, reps, bodyweight })` → `'ok' | 'weight' | 'reps' | 'both'`) and is unit tested.
- **Server side:** add migration `0053_set_logs_check.sql` with a `check (reps >= 1)` on `set_logs`, `not valid` so old rows are kept. Add a PGlite test in `supabase/tests/`.
  - Do **not** add a weight check: bodyweight legitimately logs 0.

### B. Workout history (new, player)
- **New route `/player/history`.** Keep the route thin and add a link to it:
  - from the player progress screen: a card «سجل تماريني» ("my workout history")
  - from the focus-screen exercise header: «شوف السجل» ("see the history") next to «آخر مرة» ("last time"), opening `/player/history?exercise=<exercise_id>`
- **Two views on one screen,** with a segmented control:
  1. **Workouts:**
     - finished sessions, newest first, paged 20 at a time
     - each row shows the date (`formatDate`, Africa/Cairo), the day title and the number of sets
     - tapping a row expands the exercises with each set as `weight × reps` (bodyweight shows «وزن الجسم», "bodyweight")
  2. **Exercises:**
     - a list of exercises the player has logged
     - picking one shows its sessions newest first (date and sets), plus the best set (heaviest weight; tie broken by reps) at the top
     - the `?exercise=` param preselects one
- **Data:**
  - Read `workout_sessions` and `set_logs` for the signed-in player through the existing Supabase browser client. RLS already scopes them; verify it, and if a policy is missing, add it in the same new migration with a test.
  - Merge in local unsynced sets from the offline db, so a workout done offline shows at once.
  - Put queries in `workout/data/history.ts`, with the grouping logic pure and tested.
- **States:**
  - empty state «لسه ماخلصتش تمرين» ("you haven't finished a workout yet") with an action back to home
  - loading state
  - error state with retry
- Exercise names use `exerciseName()`. GIF thumbnails are optional; if shown, add the «© Gym visual» attribution.

## Out of scope
- The coach view of history (it already exists in the player profile).
- Charts.
- Editing past sessions.

## Tests
- `set-validation`: all branches.
- The focus screen does not call `logSet` when invalid and shows the message; the bodyweight toggle allows 0 kg.
- History grouping: sessions → exercises → sets, best set, local plus remote merge without duplicates (same id).
- PGlite: inserting `reps = 0` fails; old rows are untouched.

## Requirements
- No new dependencies.
- Strings in `messages.ts` (Egyptian Arabic, plain English).
- Tokens only, logical properties, 48 px targets.
- Files ≤ 250 lines.
- `localDate`/`formatDate` for dates.
- Gym controls stay large.

## Acceptance
- [ ] A player cannot finish a set with 0 reps, or with 0 kg unless bodyweight is on; the message is clear in Arabic.
- [ ] The player opens «سجل تماريني» ("my workout history") and sees past workouts with weights and reps, and the history of any exercise.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
