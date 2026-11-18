# T-396: Player workout, home, and offline screen fixes

Owner decision 2026-11-18: fix every "Must fix" item from the Material 3 review of all screens, and keep the KOCHIVO look.

The look stays as it is: dark, lime as the only action color, glass. Change behavior, semantics, states, and accessibility only.

## Read first
- `AGENTS.md` and `DESIGN.md`.
- `docs/design-audit/01-player.md`: the full scores and reasons for these screens.
- `docs/mockups/design-audit/`:
  - `screens-worst.html` has mockups a1–a4;
  - `screens-all.html` has p1–p4, c1–c3, t1–t2 and u1–u3;
  - `ai-connect.html` has s1–s4;
  - the matching PNGs are in the same folder.

  Match the behavior and copy shown there. Visual details follow the existing components and tokens.

## Fix list
### `/player` — See today’s plan and start the next task
- Each assessment row offers “Answer” but opens the same index → players must find the assignment again → link each row to its request or offer one accurately named index link. `src/features/player-shell/components/player-assessments.tsx:83`
- Cached program errors show a stale-data notice without an action → players cannot refresh from that state → put the existing program retry beside the notice. `src/features/player-home/components/home-screen.tsx:135`
- Seven equal-width weekday buttons shrink with the page → narrow phones lose the 48px target width → enforce minimum widths and allow the strip to scroll. `src/features/player-home/components/week-strip.tsx:26`

### `/player/workout/[dayId]` — Run a workout and log sets
- The no-media fallback renders a play glyph in a static container → players can mistake it for a video control → omit it or show a clearly noninteractive media-unavailable state. `src/features/workout/components/workout-set.tsx:76`
- Invalid typed numbers revert on blur without feedback → a player can complete a set with the previous value → keep the invalid entry visible, explain how to correct it, and block completion until corrected or explicitly reverted. `src/features/workout/components/workout-value.tsx:34`
- Completed rows show the same checkmark used to complete a set, but activate editing → the available action is unclear → give completed rows a distinct edit affordance and keep completion status separate. `src/features/workout/components/set-rows-view.tsx:56`

### `/offline` — Explain lost connectivity and open a cached workout
- The saved-workout promise depends on device role alone → players can expect a workout that is absent → derive availability copy from the verified snapshot and give the empty state a next step. `src/ui/offline-message.tsx:12`, `src/features/workout/components/offline-workout.tsx:25`
- The legacy workout nests a main landmark and its Back action leaves the picker → assistive-technology users get ambiguous page structure and offline users can be routed away from cached choices → use one main landmark and return to the cached-day list. `src/app/[locale]/offline/page.tsx:17`, `src/features/workout/components/focus-screen.tsx:73`

Mockups to follow:
- `a3` (workout set entry);
- `p1` (player home);
- `a2` (offline).

## Rules
- **Strings:** every new string goes in the feature's `messages.ts` in `ar`, `arStd`, and `en`. Egyptian Arabic is plain and short, like the mockups.
- **Targets and layout:** touch targets are at least 48px. Use logical properties only.
- **Errors:** every error state gets a scoped retry or a way out.
- **Accessibility:**
  - Icon-only buttons get translated labels.
  - Status is never shown by color alone.
  - On a step change, focus moves to the new step's heading or field.
- **Tests:** add or update tests for each logic change: validation, eligibility rules, digit normalization, retry targets, focus targets where testable. Keep them deterministic.
- **Forbidden:**
  - no new dependency;
  - no migration;
  - no change to `.env*`;
  - nothing outside the files below.

## Files
`src/features/workout/**`, `src/features/player-home/**`, `src/app/[locale]/offline/**`, `src/ui/offline-message.tsx`

If a fix needs a file owned by another card, skip it and list it under Notes for reviewer.

## Out of scope
- "Nice to have" items.
- Visual restyles.
- Screens not listed here.

## Checks
`npm run check` and `npm run build` must pass. That includes `src/lib/perf-budget.test.ts`, so don't import client barrels into server code.
