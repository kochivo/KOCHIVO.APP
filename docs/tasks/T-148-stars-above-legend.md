# T-148 — Stars above Legend

**Phase:** Gamification · **Depends on:** T-133, T-134, T-136 · **Status:** ready (owner request 2026-11-10)

## Goal
Legend starts at 600 points (about eight months of steady training) and then there is nothing left to chase.
After this card every 300 points above 600 adds a star to Legend: Legend ★1 at 900, ★2 at 1200, and so on.
Stars are derived from lifetime points; nothing is stored.

## Files
Create or modify only these:
- `src/features/ranks/tiers.ts`: `LEGEND_STAR_STEP = 300`, `legendStars(lifetime)`, and `nextTier` returns the
  next star as the goal once at Legend.
- `src/features/ranks/components/rank-hero.tsx`, `rank-journey.tsx`, `rank-chip.tsx`, `level-up-panel.tsx`
- `src/features/ranks/hooks/use-level-up.ts`: a new star also triggers the celebration (once per star, same
  per-player storage key pattern).
- `src/features/ranks/messages.ts`, `src/features/ranks/ranks.test.ts`, `src/features/ranks/rank-screen.test.ts`
- `src/ui/rank-badge.tsx` (or wherever `RankBadge` lives): optional `stars?: number` prop that draws small stars
  under the Legend badge; nothing changes when it is absent or 0.
- This task card.

## Requirements
1. `legendStars(l) = l < 900 ? 0 : floor((l - 600) / 300)`. Unit-test 599, 600, 899, 900, 1199, 1200, 10,000.
2. Hero: «أسطورة ★{n}» / "Legend ★{n}" and «فاضلك {n} نقطة على النجمة {next}» / "{n} points to star {next}".
3. Journey: after Legend, one more step «نجوم الأسطورة: كل 300 نقطة نجمة» / "Legend stars: one every 300 points".
4. Chip label includes the stars when present.
5. Level-up: «نجمة جديدة! بقيت أسطورة ★{n}» / "New star! Legend ★{n}".
6. The star count in the badge is decorative; the accessible label carries the text. Above 5 stars show
   «★×{n}» instead of n star glyphs. Tokens only; the star color comes from the existing Legend badge palette.
7. Server notifications are not changed (a later card may add a push for stars).

## Acceptance
- [ ] Unit and render tests for the points above, ar and en, badge with 0, 1, 5 and 7 stars.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- SQL, notifications, the share card (T-147 may show stars later).

## Implementation notes

- Stars are derived from lifetime points; Legend progress resets for each 300-point goal.
- Hero, chip, journey, celebration panel, and decorative platinum badge stars support the new milestones.
- Star celebration history uses a per-player `:stars` suffix on the existing tier storage key and keeps the highest seen count.
- Integration requires passing lifetime points into `useLevelUp` and its returned stars into `LevelUpPanel` in `rank-screen.tsx`, which is outside this card's Files list. Scope approval requested; wiring remains pending.
- Added boundary, bilingual rendering, badge (0/1/5/7), and per-player celebration-history tests.
- Focused verification: 2 files, 46 tests passed using `--configLoader native --pool threads --maxWorkers 2` (default spawning is blocked by sandbox EPERM).
- Build stopped only on Google Fonts fetch failures for Alexandria, Changa, and Manrope. The unrestricted full test attempt reported failures in `perf-budget.test.ts`, `workout-start.test.ts`, and `supabase/tests/demo.test.ts` before it was interrupted; full-suite success is not claimed.
- `npm run check`: TypeScript and ESLint passed; release audit stopped at sandbox `spawnSync git EPERM`, before its test stage.
