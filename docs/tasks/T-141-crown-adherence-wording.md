# T-141 — Crown screens speak in adherence, not points

**Phase:** Gamification · **Depends on:** T-136, T-137, T-139 (all landed) · **Status:** ready

## Goal
Since T-139 the crown is ranked by plan adherence, and the holder needs 4 counted workouts in the
month. The screens still say "20 points" and show the crown score as "points this month". After
this card the player and the captain read the race the way it is really judged: adherence percent,
workouts done out of planned, and what is still missing to take the crown.

Data is ready and already validated by zod: `my_points()` returns `adherence`, `done`, `planned`,
`crown_needs_workouts`, `crown_gap` (in crown-score units), `monthly` (the crown score = adherence
+ PR and InBody points of the month). `team_leaderboard()` rows carry `adherence`, `done`, `planned`.

## Files
Create or modify only these:
- `src/features/ranks/messages.ts`
- `src/features/ranks/components/crown-race.tsx`, `src/features/ranks/components/team-board.tsx`
- `src/features/ranks/types.ts`, `src/features/ranks/data/load-my-points.ts`, `src/features/ranks/tiers.ts`, `src/features/ranks/index.ts`
- `src/features/ranks/ranks.test.ts`, `src/features/ranks/rank-screen.test.ts`
- `src/features/rank-review/messages.ts`
- `src/features/rank-review/components/crown-card.tsx`, `src/features/rank-review/components/board-list.tsx`
- `src/features/rank-review/rank-review.test.ts`
- This task card.

## Requirements
1. **Types.** `adherence`, `done`, `planned` become required on `LeaderboardRow`; `adherence`, `done`, `planned`, `crown_needs_workouts` become required on `MyPoints` (drop the `Partial` wrapper). Fix test fixtures. Remove `CROWN_MIN_MONTHLY` from `tiers.ts`, `index.ts` and the tests; nothing may import it afterwards.
2. **Player crown race** (`crown-race.tsx`, stays `glass-strong`):
   - Big number: the adherence percent, «التزامك {n}٪» / "{n}% of your plan".
   - Under it: «{done} من {planned} تمرين الشهر ده» / "{done} of {planned} workouts this month".
   - Holder: keeps the crown badge and «التاج معاك الشهر ده».
   - Not the holder, `crown_needs_workouts > 0`: position, then «فاضلك {n} تمرين عشان تدخل سباق التاج» / "{n} more workouts to enter the crown race" (singular form for 1). Do not show the gap line in this case.
   - Not the holder, `crown_needs_workouts = 0`: position, then «فاضلك {n} درجة وتاخد التاج» / "{n} to the crown" using `crown_gap`.
   - Rule line (muted): «التاج لأعلى التزام بالخطة، بحد أدنى {n} تمارين في الشهر. الأرقام الجديدة والـInBody بيزودوا درجتك.» / "The crown goes to the highest plan adherence, with at least {n} workouts this month. Records and InBody scans add to your score." with `n = CROWN_MIN_WORKOUTS`.
   - Keep the reset line and the no-captain empty state. Remove the "points this month" line and the old `minimum` and `monthly` keys if nothing else uses them.
3. **Player team board** (`team-board.tsx`): each row shows the adherence percent in place of monthly points. Privacy stays as is (first names, own row highlighted). Empty state when no row has `done > 0`: «لسه محدش اتمرن الشهر ده» / "Nobody has trained this month".
4. **Captain crown card** (`crown-card.tsx`): with a holder, the name, then «التزام {n}٪ · {done} من {planned} تمرين». Without a holder, the rule line using `CROWN_MIN_WORKOUTS` imported from `@/features/ranks` (no literal 20 or 4 in the component).
5. **Captain board** (`board-list.tsx`): the trailing value is the adherence percent with «{done} من {planned}» under or beside it; lifetime points stay under the name. Rows keep their link and 48px height. Long names must still wrap, not push the numbers off the row.
6. **Rules.** Every string in `messages.ts` (Egyptian Arabic, short English, no emoji), numbers through `formatNumber`, tokens and logical properties only, no new component files, every file under 250 lines. The percent sign is part of the message string, not concatenated in the component.

## Acceptance
- [ ] Render tests (renderToStaticMarkup, ar and en): crown race as holder, as a chaser needing workouts (gap line absent), as a chaser with the gap; team board rows show percent and the new empty state; captain crown card with and without a holder (the rule shows 4, and "20" is nowhere in either feature); captain board row shows percent, done/planned and lifetime.
- [ ] `grep -r CROWN_MIN_MONTHLY src` returns nothing.
- [ ] `src/features/ranks`, `src/features/rank-review` tests pass; `npm run check` and `npm run build` pass (sandbox fonts and the audit's git EPERM are known limits).

## Out of scope
- Any SQL, RPC, loader schema or notification change.
- Rank hero, journey, points log, level-up panel, the rank chip on home.
- New features (crown prize, stars, share card, reminders).

## Implementation notes
- Crown views now show adherence and counted/planned workouts; missing workouts take precedence over the score gap.
- Progress fields are required in the exported types; RPC validation and data loading are unchanged. The deprecated monthly minimum alias is removed.
- Both locales have static render coverage for holders, chasers, workout singular/plural, boards and empty states. Captain row totals cannot shrink beside wrapping names.
- In this sandbox, Vitest needs `--configLoader native --pool threads` to avoid child-process `spawn EPERM` failures.
- Validation: all 46 ranks/rank-review tests pass; typecheck and lint pass. `npm run check` stops at the release audit's `spawnSync git EPERM`; `npm run build` fails only fetching Alexandria, Changa and Manrope from Google Fonts.
- Full suite with native config and two thread workers: 2,959 passed, 3 failed, 1 skipped. Out-of-scope failures: `src/ui/route-loading.test.ts` finds missing loading files for player rank and captain leaderboard; `src/ui/sheet-surfaces.test.ts` requires a sheet surface on the unchanged level-up panel.
