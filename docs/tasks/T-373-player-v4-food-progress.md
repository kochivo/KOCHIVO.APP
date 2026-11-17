# T-373: Player v4 food, shopping, progress and rank

**Migration:** none. **Owner decision 2026-11-18:** build the player v4 mockups 100%, fully working.
**Depends on:** T-370 (`CoachButton` entry).

## Read first
- `AGENTS.md`, `DESIGN.md`, `docs/tasks/REFINED-LOOK.md`.
- `docs/mockups/player-v4/09-food`, `10-shopping`, `11-progress` and `13-rank`. Match them 1:1.

## Files
Edit only these:
- `src/features/nutrition/**`
- `src/features/progress/**`
- `src/features/muscle-analytics/**`
- `src/features/ranks/**`
- tests

Do not touch `src/features/progress/components/line-chart.tsx`, `src/features/progress/components/chart/`, or `series.ts`. They belong to T-375, which is running at the same time. Use `LineChart` as it is.

## What to build
1. **Food (09).** The header has the title and `CoachButton`. The page shows:
   - a calories ring and macro bars;
   - water;
   - meals in order, each with a tick, a swap control and a log control.

   Keep the existing meal logs, swaps, budget and Ramadan slots. There is one lime action: log the next meal.
2. **Shopping (10).** The week list grouped by aisle, with check boxes and a cost line when the budget is on.
3. **Progress (11).** The weight chart and change, a strength line, the muscle map, photos (locked state kept) and check-in history. The header has `CoachButton`.
4. **Rank (13).** The medal hero, tier progress, points log, team board and medal sets. Use the data the rank screen already loads.

## Do not change
- meal log writes, the offline queue and ids
- the photo privacy rules
- points maths
- the flag-off markup

## Done when
- Tests cover:
  - each screen's section order;
  - the empty states (no meal plan, no weight yet, no points yet).
- It fits at 360px and 390px. `npm run check` passes.
