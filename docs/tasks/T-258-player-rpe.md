# T-258 — Player RPE per exercise

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 6.

## Goal
After the last set of an exercise, the player can tap how hard it felt, from 1 to 10 (the board shows 6..10, with more on scroll). The captain sees the RPE per exercise in the player file under «آخر تمرين», and the latest RPE in the overview.

`program_exercises.rpe` is the captain's *target*. This card stores the player's *actual* RPE, which is a different value.

## Files
- `supabase/migrations/<next>_exercise_rpe.sql`:
  - new table `public.exercise_rpe_logs`:
    - `id uuid`, set with `stableId(session_id, exercise_id)`;
    - `session_id`, `player_id`, `exercise_id`;
    - `rpe numeric(3,1)` (1..10);
    - `client_updated_at`, `server_updated_at`.
  - Use the same RLS and ownership pattern as `set_logs`.
- `supabase/tests/exercise-rpe.test.ts`
- `src/core/offline/`: register the new store and sync it through `saveAndQueue()`.
- `src/features/workout/`:
  - an optional RPE sheet after the last set;
  - a skip button, which is never blocking.
- `src/features/captain-workspace/player-file/`: show the RPE per exercise and the latest RPE.

## Requirements
1. The RPE step is optional and dismissible, so the player can always skip it.
2. Works offline and syncs later.
3. Each value has a short helper line. For example, 8 reads «كان فاضل عدتين».

## Acceptance
- [ ] The player logs an RPE offline, and it syncs when online.
- [ ] The captain sees it per exercise.
- [ ] Skipping saves nothing.
- [ ] Tests are deterministic, with `now` injected.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Auto-adjusting weights from RPE.
