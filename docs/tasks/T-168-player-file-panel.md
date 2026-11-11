# T-168: Player file panel in the workspace

**Phase:** Captain suite (owner approval 2026-11-11) · **Depends on:** T-166, T-167 · **Status:** ready

## Goal
Fill the player-file slot that T-166 left in the workspace. Use the T-167 data (`loadPlayerFile`).

The design is in these mockups:
- `docs/mockups/captain-workspace/v4.html`: the start column on desktop.
- `docs/mockups/captain-workspace/v5-mobile.html`: screens 2 and 3 on the phone.
- `docs/mockups/captain-workspace/suite.html`: the player header facts strip.

Everything stays behind `captainWorkspaceEnabled()`.

## Files
- `src/features/captain-workspace/components/` (new panel and sheet files, and `player-file-slot.tsx` is replaced)
- `src/features/captain-workspace/messages.ts`, tests
- `src/features/player-file/index.ts`: only if a missing export is needed
- This card

## Requirements
1. **Server load.** `workspace-content.tsx` calls `loadPlayerFile(client, playerId)` with the request's authenticated client, in parallel with the existing reads. An error shows the panel's own error state, and the plan still renders.
2. **Desktop (`lg:`).** A sticky 360px start column with these parts, in order:
   - **Identity:** name and goal.
   - **Body:** weight, height and age.
   - **Goal progress:** a bar from the intake weight to the target, through the current weight.
   - **Training days:** 7 chips, Sat→Fri.
   - **Session minutes.**
   - **Injuries and medical:** shown as warning chips.
   - **Allergies.**
   - **Latest note:** shown as a quote.
3. **Each fact shows its source** in small muted text, e.g. «Check-in · 3 Nov» or «Onboarding». A fact that changed shows the previous value. A new fact (`isNew`) gets a lime dot.
4. **Mobile.** A compact facts strip under the name: age, height, weight → target, days × minutes, and injury chips. Tapping the strip opens a bottom sheet with the full panel. The sheet traps focus, closes on Esc and on the close button, and the close button has a translated `aria-label`.
5. **Form history.** At the bottom of the panel, list `history` newest first. For each form show its kind, date and changed keys, using translated fact names. The first form shows «first data».
6. **Strings.** All strings go in messages (Egyptian Arabic and short English). Every number is rendered with `formatNumber`, and units stay LTR inside RTL text.

## Acceptance
- [x] Tests:
  - the panel renders intake only;
  - the panel renders intake plus a check-in, with the previous value and source shown;
  - the injury chip is styled as a warning;
  - the sheet opens and closes;
  - the panel shows its error state while the plan still renders.
- [ ] All gates pass (tsc, eslint, audit:release, vitest, build, perf-budget). Report the captain programs route budget before and after; the flag-off bundle must not grow by more than 1 KiB.

## Out of scope
- Editing facts, and persisting `lastViewedAt`.
- The forms tab (T-172) and fit checks (T-170).
- `src/features/programs`, `src/app/globals.css`, `src/features/luxury-preview`.

## Implementation review
- Preserved the partial implementation; removed the server client cast by using `AppDatabase` in the loader and its test, as explicitly requested.
- Added accessible training-day status and associated the compact facts with the sheet opener.
- Focused suite: 7 files, 48 tests passed. TypeScript and ESLint passed.
- Final full-suite fallback: 464 test files passed, 3337 tests passed. The first full run had 3336 passing tests and a stale-chunk perf-budget failure while build output was being replaced; regenerating stats and rerunning without a concurrent build resolved it.
- Default Vitest configuration and release audit hit Windows `EPERM`. Native config/thread Vitest fallback works; the release audit rules run with a PowerShell-provided tracked-file list report 1858 files, 0 findings.
- Production compilation succeeds, but `npm run build` stops at Next's TypeScript worker with `spawn EPERM`; in-memory worker-thread attempts did not resolve it. No build configuration was changed.
- Existing build player-programs gzip: 302102 bytes; current compiled output: 302162 bytes (60-byte increase, 310 KiB ceiling unchanged). Next's stats writer was run explicitly against compilation manifests after the blocked build; perf-budget passes. The existing build already includes partial T-168 work, so a clean pre-task flag-off comparison remains for the reviewer.
