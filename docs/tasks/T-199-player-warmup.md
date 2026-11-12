# T-199: Player sees the warm-up first (mockup v6-program-editor, screen «اللاعب بيشوف إيه»)

**Phase:** Unified program editor (owner approved 2026-11-12) · **Depends on:** T-197 · **Status:** implemented; reviewer build and visual verification pending
**Migration:** none. **Flag:** none needed: with an empty warm-up nothing renders, so existing players see no change.

Read first: `docs/mockups/captain-workspace/v6-program-editor.html` (phone screen), `AGENTS.md`.

## Files
- `src/features/workout/` (a new `warmup-card.tsx`, the ramp line on the first heavy exercise, messages `ar` + `arStd` + `en`, tests).
- `src/features/player-home/` only where today's workout card is rendered, to show the warm-up time.
- This card.

## Requirements
1. Before the first exercise of today's session, show the amber card «1 · سخّن الأول» with total minutes, one row per item (check box, name, amount + unit), ticking stored locally per session (no server write; use the existing local session state, key by session stable id). Then the exercises card labelled «2 · التمارين».
2. Primary button while unfinished items remain: «كمّل التسخين». Once all are ticked, or the player taps «تخطّي التسخين» (secondary text button), the normal workout flow continues exactly as today.
3. If `warmup.ramp` is on, show under the first non-bodyweight exercise: «تسخين: 50% × 10 · 70% × 5 · 85% × 2», using `rampSets()` from T-197 with the player's last working weight (existing last-performance data) to show kg when known.
4. Empty warm-up (no items, ramp off) renders nothing. Offline workout must keep working (warm-up comes from the same cached program snapshot).
5. Touch targets ≥ 48px, logical properties only, numbers via existing formatters.

## Out of scope
The captain editor (T-198). Logging warm-up as sets.

## Acceptance
- [ ] Matches the phone mockup at 390×844.
- [x] Tests: empty → nothing, ticks persist across reload of the same session, skip continues, ramp kg rounding with and without known weight.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## T-199 implementation plan and reviewer scope extension

Reviewer approved `src/features/player-home/data/program-snapshot.ts` and
`src/core/offline/db.ts`: carry optional warm-up data in the cached day without
changing Dexie indexes or importing features from core. Older caches use an empty
warm-up at the feature boundary. Protected T-197 files stay unchanged.

- [x] Test cached mapping, old-cache rendering, checklist persistence and skip,
  session isolation, and ramp percentages/rounded kg before implementation.
- [x] Preserve warm-up in the snapshot; add session-keyed local checklist state.
- [x] Render the amber checklist, exercise panel, ramp line and continue/skip
  actions using the phone copy and existing tokens; retain normal set logging.
- [x] Include warm-up minutes in today's workout cards and test their summaries.
- [x] Run the requested tsc/eslint/vitest fallbacks and review the diff for scope,
  translations, offline behavior and mockup parity. Reviewer runs the real build.

Review focus: old snapshots, reloads before the first set, midnight session
continuation, switching sessions, and unavailable browser storage must not block
the existing offline workout. Warm-up state never enters the sync outbox.

## Feature inventory

| Requirement | Implementation |
| --- | --- |
| 1. Amber checklist, minutes, rows, stable-session local ticks, exercises panel | `workout/components/warmup-card.tsx`, `warmup-workout.tsx`, `warmup-preview.tsx`; `workout/hooks/use-warmup-session.ts` and `data/warmup-progress.ts` |
| 2. Continue/skip and unchanged workout behavior afterward | `workout/components/focus-screen.tsx` selects the gate or normal `workout-exercise.tsx`; normal sync, retry, clock, progress, history and exercise list return after completion/skip |
| 3. First weighted exercise ramp from previous working kg | `workout/components/ramp-line.tsx` and `data/warmup-state.ts`, using T-197 `rampSets()` and existing last-session/bodyweight data |
| 4. Empty/legacy snapshots and offline availability | Optional `SnapshotDay.warmup` in `core/offline/db.ts`, normalized snapshot mapping in `player-home/data/program-snapshot.ts`, no new indexes or server writes |
| 5. Touch, RTL, formatting and translations | Warm-up components use logical utilities, 48px label/button targets, lucide icons, `formatNumber()` and complete `ar`/`arStd`/`en` dictionaries in `workout/warmup/messages.ts` |
| Home warm-up duration | `player-home/components/today-card.tsx`, `next-task-card.tsx`, `warmup/messages.ts` and `warmup-time.test.ts` |

## Reviewer notes

- Warm-up totals come from timed items, rather than hard-coding the mockup's
  illustrative 8 minutes. Its sample rows contain only 5 timed minutes.
- The secondary skip action is required by the card although absent from the
  static phone example. The two set rows are read-only until the warm-up gate clears.
- Independent review identified two regressions, both reproduced and fixed:
  optimistic progress now survives first-set session creation when storage is
  blocked, and finishing/skipping restores the existing workout status/navigation.
- 390×844 browser verification could not run: Edge launch returns `spawn EPERM`.
  `npm run build` cannot resolve Next through the node_modules junction in this
  sandbox. The reviewer will run the real build. The release audit also returns
  `spawnSync git EPERM`; approved tsc/eslint/vitest fallbacks are used here.

## Verification results

- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint .`: exit 0; no errors or warnings.
- `npx vitest run --maxWorkers=2 --configLoader native --pool=threads`: exit 0.
  `Test Files 633 passed | 1 skipped (634)`;
  `Tests 4024 passed | 1 skipped (4025)`.
- `git diff --check`: exit 0.
- `npm run check`: release audit cannot run here (`spawnSync git EPERM`).
- `npm run build`: sandbox cannot resolve `next/package.json` through the
  node_modules junction; reviewer runs the real build.
