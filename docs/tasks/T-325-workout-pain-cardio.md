# T-325 — Pain stops later affected exercises; cardio-only days can finish

**Source:** `docs/AUDIT-2026-11-16-full.md`, findings 1 (BL-01) and 9 (BL-06). There is no migration.

## 1. Pain must protect later exercises in the same session (BL-01, HIGH, safety)
- **Where:** `src/features/workout/hooks/use-focus-session.ts`, around line 96.
- **Bug:** `exercisePain` keeps only reports whose `program_exercise_id` equals the current exercise. Example: a player reports knee pain on bench press, which the knee does not affect, and keeps training as T-317 allows. When they reach squats, nothing blocks them.
- **Fix:** follow the T-317 rules in `docs/tasks/T-317-pain-only-affected.md`.
  - Check **every** pain report of the session against the current exercise.
  - A report on another exercise blocks the current exercise when `painAffects(report.area, metadata)` is true for it.
  - A severe report (severity 5 or kind `sharp`) keeps blocking the exercise it was reported on, exactly as today. It does not block unaffected later exercises.
  - The current exercise's own reports keep today's logic, including the `selectedId` check for alternatives.
  - Use the metadata of the alternative the player selected, if there is one, as the code does now.
  - A later unaffected exercise is never blocked or auto-skipped.
- Move the decision into a small pure function, for example `src/features/workout/pain-block.ts`, so it can be unit tested. Keep the hook under 250 lines.

## 2. A cardio-only day can be finished (BL-06, still present)
- **Where:**
  - `src/features/workout/queue.ts:12`: the set queue is empty for cardio-only days;
  - `src/features/workout/components/focus-screen.tsx:69/90/101`: no finish action;
  - `use-focus-session.ts:128`: auto-finish needs a non-empty queue;
  - `src/features/player-home/next-task.ts:32`: home skips days with no resistance exercises;
  - `src/ui/cardio-cards.tsx`.
- **Fix:**
  - When the day has cardio and an empty set queue, show one primary action that finishes the workout.
    - Use the shared `Button` and the lime action.
    - The label goes in messages (ar, arStd, en).
    - Use the same stable session id and offline path as a normal finish: create or reuse the session through the existing helpers, then call `finishSession`. Do not call Supabase directly.
  - The action must be idempotent: a second tap or a replay creates no second session.
  - Home: a day with cardio and no sets counts as a training day for the next task.

## Tests
- Unit tests for the pain decision:
  - knee report on bench, then squat: blocked;
  - knee report on bench, then lat pulldown: not blocked;
  - severe report on bench: blocks bench, does not block lat pulldown;
  - alternative selected: uses the alternative's body part.
- Tests for the cardio-only finish path (queue helper and next-task predicate).

## Rules
AGENTS.md applies in full: tokens only, logical properties, targets of at least 48px, and every string in ar, arStd and en. Do not touch files outside `src/features/workout/`, `src/features/player-home/next-task.ts` (and its test), and `src/ui/cardio-cards.tsx`.

## Gates
`npm run typecheck`, `npm run lint`, and `npx vitest run src/features/workout src/features/player-home`.
