# T-145 — The workout end screen says what the workout earned

**Phase:** Gamification · **Depends on:** T-136, T-142 · **Status:** ready (owner request 2026-11-10)

## Goal
Since T-142 a flagged workout earns nothing, and the player only finds out later in the points log. After
this card the done screen tells them at once: «+3 نقط · فاضلك 12 على بطل», or «التمرين ده مش هيتحسب: أقل من
20 دقيقة» with what to do next time.

## Files
Create or modify only these:
- `src/features/ranks/points-preview.ts` (new, pure): `previewWorkoutPoints({ startedAt, completedAt,
  loggedSets, plannedSets, plannedSeconds })` returns `{ counted: true, points: 3 }` or
  `{ counted: false, reason: 'short' | 'sets', minMinutes?: number, minSets?: number }`. Same thresholds as
  `security_private.award_session_points` in migration 0081 (`greatest(1200, plannedSeconds * 0.5)` seconds;
  logged sets at least 60% of planned). Comment pointing to 0081 so they stay in step.
- `src/features/ranks/index.ts`, `src/features/ranks/messages.ts`
- `src/features/workout/components/done-panel.tsx` and the component that renders it (pass the session
  numbers it needs; read the code to find where they live).
- `src/features/workout/messages.ts`
- Tests: `src/features/ranks/points-preview.test.ts` (new) and a render test for the done panel.
- This task card.

## Requirements
1. The done panel shows one line under the title:
   - counted: «+{n} نقط على تمرينك» / "+{n} points for this workout", plus «فاضلك {n} نقطة على {tier}» from the
     cached lifetime if available (skip the second part when unknown or at Legend).
   - not counted, short: «التمرين ده مش هيتحسب في الرتبة: أقل من {n} دقيقة» / "This workout won't count toward
     your rank: under {n} minutes".
   - not counted, sets: «… : سجّلت {logged} من {planned} مجموعة، محتاج {min} على الأقل» / "… you logged
     {logged} of {planned} sets, {min} needed".
2. Use the wording "هيتحسب / مش هيتحسب" (expected), because the server decides after sync; never claim the
   points are already added.
3. PR points are not predicted (the server computes them against history).
4. Offline works: the preview uses only local session data.
5. Planned seconds = sum over the day's exercises of `sets * (rest_seconds + 40)`, as in 0081.
6. Tokens, logical properties, strings in `messages.ts`, numbers through `formatNumber`, `text-muted` for the
   not-counted line (not the danger color: it is information, not an error).

## Acceptance
- [ ] Unit tests: boundary at exactly 20 minutes, at 50% of planned seconds when that is larger, at exactly
  60% of sets, zero planned sets, both reasons at once (report `short`).
- [ ] Render tests ar and en for counted, short and sets.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- Any SQL change, PR prediction, push notifications.

## Implementation notes

- Added a pure local preview matching 0081, with duration checked before set count; no PR prediction.
- Both done-panel callers forward session timestamps and live, non-deleted set totals. Planned totals use
  the cached assigned day, including its original set counts on reduced readiness days.
- Counted copy says “expected” / “هيتحسب”; missing duration or sets use muted informational copy.
- Next-tier progress accepts an optional known lifetime and omits it at Legend. There is no existing
  lifetime-points cache in this checkout, so the workout flow leaves that optional value unknown rather
  than requesting the network or inventing a total.
- Added deterministic boundary tests and Arabic/English render tests, including the feedback path.
- Verification: focused workout/preview suite passed (5 files, 42 tests) using Vitest's native config
  loader and thread pool to avoid sandbox child-process restrictions. TypeScript and ESLint passed;
  `npm run check` stopped at release audit (`spawnSync git EPERM`). `npm run build` failed only fetching
  Alexandria, Changa, and Manrope from Google Fonts.
- Running the same release-audit rules with Git's file list piped from the shell passed:
  `Release audit: 1697 tracked files, 0 findings`.
- The full-suite workaround was interrupted after several minutes without further output. Its reported
  `src/lib/perf-budget.test.ts` failure reproduces independently: stale build diagnostics reference a
  missing `.next/static/chunks/3rohhnt8j93pa.js` file. Build-artifact repair is outside this card.
