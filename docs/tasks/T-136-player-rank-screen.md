# T-136 — Player rank screen

**Phase:** Gamification · **Depends on:** T-133, T-134 (both landed) · **Status:** ready

## Goal
The player sees their rank badge, how far the next rank is, where they stand in this month's
crown race, and what earned their latest points. It must feel like a reward, not a report.

Data is ready: `loadMyPoints()` and `loadLeaderboard()` from `@/features/ranks`, `tierFor`,
`nextTier`, `TIERS`, `CROWN_MIN_MONTHLY`, and `RankBadge` from `@/ui`.

## Files
Create or modify only these:
- `src/app/[locale]/(player)/player/rank/page.tsx`: thin route.
- `src/features/ranks/components/`: `rank-screen.tsx`, `rank-hero.tsx`, `rank-journey.tsx`, `crown-race.tsx`, `team-board.tsx`, `points-log.tsx`, `level-up-panel.tsx`, `rank-chip.tsx` (one component per file; split further if a file nears 250 lines).
- `src/features/ranks/hooks/use-rank-data.ts`: loads both RPCs; exposes loading, error and retry.
- `src/features/ranks/hooks/use-level-up.ts` and `src/features/ranks/level-up.ts` (pure logic).
- `src/features/ranks/messages.ts`: new.
- `src/features/ranks/index.ts`: export `RankScreen`, `RankChip` and `ranksMessages`.
- `src/features/ranks/rank-screen.test.ts`
- `src/features/player-home/components/home-screen.tsx`: render `<RankChip />` near the streak pill. No other change in that file.
- This task card.

## Requirements
1. **Hero** (`glass-strong`): `RankBadge` size `xl` for the current tier, the tier name, lifetime points as the big number, and a progress bar to the next tier with «فاضلك {n} نقطة لرتبة {tier}» / "{n} points to {tier}". At Legend, show «وصلت لأعلى رتبة» / "Top rank reached" and no bar.
2. **Journey row** «رحلتك»: the four tier badges in order, size `md`. Reached tiers are in color, later ones use `locked`. Each has its name and threshold under it.
3. **Crown race** (this month):
   - If the player holds the crown: the `crown` badge and «التاج معاك الشهر ده».
   - Otherwise: their position, monthly points and «فاضلك {n} نقطة وتاخد التاج» from `crown_gap`.
   - Say plainly that the race restarts on the 1st of each month.
   - A player with no captain (`month_position` is null) sees an empty state instead of the race and the board.
4. **Team board:** the leaderboard rows: position, small badge (`sm`), first name, monthly points. The crown holder gets the `crown` badge. The player's own row (`player_id` is not null) is highlighted. Empty state when nobody has points this month.
5. **Points log:** the last 10 rows from `my_points`: what it was for (workout, record, perfect week, InBody, meal check), points, date. A `pending` row shows «مستني مراجعة الكابتن» / "Waiting for captain review" in `text-muted`; a `rejected` row shows «اترفضت» / "Rejected". Empty state: «لسه ما كسبتش نقط. كمّل أول تمرين» / "No points yet. Finish your first workout".
6. **Level-up moment.**
   - `level-up.ts`: pure `shouldCelebrate(lastSeenTier, currentTier)`: true only when the current tier is higher than the last seen one, and never on the first visit (no stored value).
   - `use-level-up.ts` stores the last seen tier in `localStorage` (wrapped in try/catch).
   - The panel is a `glass-strong` dialog with the `xl` badge, «مبروك! بقيت {tier}» and one lime button «كمّل» that closes it. It respects `prefers-reduced-motion`, traps focus and closes on Escape.
7. **Rank chip** on the player home: `sm` badge plus lifetime points, at least 48px tall, links to `/player/rank`, with a translated `aria-label`. While loading it renders nothing; on error it renders nothing (the home must never break because of it).
8. **States.** The screen has loading, error with retry, and the empty states above.
9. **Rules.** Tokens only, logical properties only, every string in `messages.ts` (Egyptian Arabic and short English, no emoji), numbers through `formatNumber`, dates through the existing date helpers, one primary lime action per screen. No Supabase calls outside the two loaders.

## Acceptance
- [ ] Unit tests: `shouldCelebrate` (first visit, same tier, higher tier, lower tier).
- [ ] Render tests (renderToStaticMarkup style, with data passed as props): hero at 0, 99, 100 and 600 points; journey locks the right tiers; crown holder versus chaser text; own row highlighted; pending and rejected labels; each empty state; ar and en strings; no `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` classes.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- Captain screens and points review (T-137).
- Notifications (T-135).
- Any migration, RPC or loader change. If the data is not enough, write it under "Notes for reviewer".

## Implementation notes
- Added the thin rank route, prop-driven rank panels, and a home-header rank chip beside the greeting/streak area.
- The rank hook loads the existing RPC loaders together; the chip loads only personal points and stays hidden on loading/error.
- Progress is measured within the current tier. Crown ownership comes from the own leaderboard row; no-captain players see the race empty state and no board.
- Level-up history is scoped by player ID from the existing identity helper. First visits and unavailable storage never interrupt rank viewing.
- Reused the native modal dialog for focus containment, Escape and focus restoration, with reduced-motion styling.
- Added deterministic static-render and pure-logic coverage, including tier boundaries, crown states, log statuses, empty states, both locales and the dialog/chip.
- Verification: rank suites pass (2 files, 25 tests) using `--configLoader native --pool threads`; default Vitest and the release audit hit sandbox process restrictions. Build reports only Google Fonts fetch failures (Alexandria, Changa, Manrope). The alternate full suite was interrupted after a cached `.next` bundle-stat test referenced missing chunks.
