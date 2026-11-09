# T-134 — Luxury rank badges (UI primitive)

**Phase:** Gamification · **Depends on:** none (runs in parallel with T-133) · **Status:** ready

## Goal
A reusable `RankBadge` that draws the five owner-approved metallic badges:
- مبتدئ: bronze
- بطل: silver
- نخبة: gold
- أسطورة: obsidian and platinum
- التاج: gold crown with lime gems

The player profile, leaderboard and level-up screen (T-135) all use it.

The approved geometry and colors are in `docs/mockups/rank-badges.svg`. Copy the paths exactly.

## Files
Create or modify only these:
- `src/ui/rank-badge.tsx`: `RankBadge({ tier, size?, locked?, label })`.
  - `tier`: `'beginner' | 'champion' | 'elite' | 'legend' | 'crown'`
  - `size`: `'sm' | 'md' | 'lg' | 'xl'`, i.e. 40, 64, 96 and 140px wide
- `src/ui/rank-badge-shapes.tsx`: if needed to keep files under 250 lines. It holds the per-tier SVG bodies, not exported from `src/ui/index.ts`.
- `src/ui/index.ts`: export `RankBadge` and the `RankTier` type.
- `src/ui/messages.ts`: tier names only, in Egyptian Arabic and English:
  - مبتدئ / Beginner
  - بطل / Champion
  - نخبة / Elite
  - أسطورة / Legend
  - التاج / Crown
- `src/app/globals.css`:
  - metal color tokens in `@theme` (`--color-bronze-*`, `--color-silver-*`, `--color-gold-*`, `--color-platinum-*`, `--color-obsidian-*`, `--color-crown-gem-*`) with the hex values from the reference SVG;
  - one `@keyframes rank-shine`;
  - the reduced-motion rule.
- `src/ui/rank-badge.test.ts`
- This task card.

## Requirements
1. **No hex in the component.** Gradient stops use `style={{ stopColor: 'var(--color-gold-1)' }}`, etc. Tokens live only in `globals.css`.
2. **Unique ids.**
   - Gradient and clipPath ids come from `useId()`, so many badges on one page never collide.
   - The component works in server and client trees. If `useId` forces a client boundary, mark the file `'use client'`.
3. **Shine.**
   - A soft diagonal light sweep, clipped to the badge outline: a white-to-transparent gradient on a skewed rect.
   - It is animated with the CSS `rank-shine` keyframes (about 4s; the crown is faster, about 3s).
   - It does not use SMIL `<animate>`.
   - Under `prefers-reduced-motion: reduce` there is no animation.
4. **Locked state.** `locked` renders grayscale at low opacity, for tiers not yet reached in the "journey" row.
5. **Accessibility.**
   - The `<svg>` has `role="img"` and `aria-label={label}`. The caller passes a translated label, e.g. «رتبة نخبة».
   - Decorative uses pass `label=""` and get `aria-hidden`.
6. **Visual quality.**
   - Edges are crisp at `sm` (40px).
   - The crown is the only badge that uses the lime brand color.
7. **Limits.** Files stay under 250 lines, use no dependency, and use logical properties if any layout classes are needed.

## Acceptance
- [ ] Tests:
  - all 5 tiers render the expected outline path from the reference;
  - two badges on one page have distinct gradient ids;
  - there is no `#` hex anywhere in `rank-badge*.tsx`;
  - `locked` adds the grayscale class;
  - `role`/`aria-label` are set, and an empty label gives `aria-hidden`;
  - the reduced-motion CSS rule exists;
  - the ar/en tier names exist.
- [ ] `npm run check` and `npm run build` pass (sandbox fonts are a known limit).

## Out of scope
- Points logic and database (T-133).
- Profile, leaderboard and level-up screens (T-135).

## Implementation notes
- Added `RankBadge` and exported `RankTier`; default size is `md` (64px), preserving the reference 120×130 aspect ratio.
- Copied all approved paths, circles, ellipses and transforms exactly. Reference gradient stops and face/stroke colors use dedicated `@theme` tokens.
- Instance-local `useId()` gradients and silhouette clips include elite wings and legend laurels. CSS shine runs at 4s (crown: 3s); reduced motion hides the sweep. Locked badges use grayscale and 30% opacity.
- Added Arabic/English tier names and 14 deterministic rendering/source checks covering geometry, IDs, accessibility, sizes, motion and tokens.
- Sandbox verification: badge tests pass using `npm test -- --configLoader native --pool threads --maxWorkers 2 src/ui/rank-badge.test.ts`; default Vitest startup encounters `spawn EPERM`.
- `npm run check`: TypeScript and ESLint pass; release audit stops at sandbox-denied `spawnSync git EPERM` before the default test command.
- Full suite with native config/thread workers: 402 files passed, 2 failed; 2842 tests passed, 2 failed. Out-of-scope failures: `src/lib/perf-budget.test.ts` references a missing build chunk, and `src/features/templates/empty-states.test.ts` expects old heading markup.
- Production build fails only fetching Alexandria, Changa and Manrope from Google Fonts in the network-restricted sandbox. No dependencies, migrations or T-133 files changed.
