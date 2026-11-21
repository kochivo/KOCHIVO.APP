# T-249 — Captain v11: ranks with podium

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/leaderboard` matches the mockup `ranks` screen exactly.

## Files
- `src/features/rank-review/components/*`. New files are allowed (for example `podium.tsx`).
- `src/features/rank-review/messages.ts`
- tests in `src/features/rank-review/`

## Requirements
1. **Header:** «الترتيب», with the tabs «الشهر ده» and «كل الوقت» on desktop (the existing month switch).
2. **Podium card:**
   - the top three, laid out in the order 2, 1, 3;
   - heights of 120, 150 and 100;
   - first place in the gold colour;
   - avatar, first name and the place number on each.
3. **List card:** rank number, avatar, name, «<n> تمرين · <points> نقطة», and the rank tag (GOLD, SILVER, BRONZE).
4. With fewer than three players, show only the places that exist.
5. Keep the crown prize editor reachable from this page.

## Acceptance
- [ ] Desktop and 390px match the mockup `ranks`.
- [ ] There are tests for the podium order and the partial podium.
- [ ] `npm run check` and `npm run build` pass.
