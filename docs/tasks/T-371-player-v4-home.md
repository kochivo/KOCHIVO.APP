# T-371: Player v4 home and rest day

**Migration:** none. **Owner decision 2026-11-18:** build the player v4 mockups 100%, fully working. Rank and medals go on the home screen.
**Depends on:** T-370 (bottom bar, `CoachButton` entry).

## Read first
- `AGENTS.md`, `DESIGN.md`, `docs/tasks/REFINED-LOOK.md`.
- `docs/mockups/player-v4/01-home` and `02-rest` (`.html` and `.png`). Match them 1:1.

## Files
Edit only these:
- `src/features/player-home/**`
- tests

Use other features only through their public entries (`@/features/ranks`, `@/features/player-shell`, `@/features/nutrition`, `@/features/readiness`).

## What to build
1. **Header.** Avatar, greeting and date on the start side. Put `CoachButton` from `@/features/player-shell` on the end side.
2. **Training day (01).** Show the sections in the mockup's order:
   - the today hero with the day name, exercise count, minutes and one lime "start" button;
   - readiness;
   - the rank card;
   - water and macros;
   - the week strip.

   Keep every action that today's home already has (start, swap day, water add, readiness check-in, reminder).
3. **Rank card.** It shows the medal, tier name, points, a progress bar to the next tier, and the team place line. Data comes from the existing ranks public entry, the same source `/player/rank` uses. Tapping it opens `/player/rank`.
   - Hide the card when `ranksEnabled()` is false.
   - Show a loading state and hide the card on error.
4. **Rest day (02).** Blue rest mood with a moon. It keeps the existing light-day suggestions and the next-training-day line, and shows the same rank card.
5. **Removed.** Steps and «مشي خفيف» are not in v4, so do not show them. Do not delete the logic files; only stop rendering them in v6.

## Do not change
- the flag-off (non-v6) markup, which hash snapshot tests guard
- data writes, the offline queue, ids and dates
- the Ramadan home: it keeps its current layout unless the mockup shows otherwise. Write a note if it does not fit.

## Done when
- Tests cover:
  - section order for a training day and a rest day;
  - the rank card hidden when ranks are off;
  - the coach button present in the header.
- It fits at 360px and 390px. `npm run check` passes.
