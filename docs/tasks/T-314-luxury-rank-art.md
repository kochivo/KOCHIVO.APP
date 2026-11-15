# T-314 — Luxury rank art (v7)

Owner decision 2026-11-16: replace the current rank and medal drawing with the v7 luxury emblems in
`docs/mockups/ranks/rank-luxury-v7.html` (function `emblem(r, id, {locked, shine})` and its `defs`). Match it 1:1. No text inside the art (no "KO").

## Goal
`MedalArt` draws the v7 emblem for each of the seven ranks (0 iron … 6 legend). The shape grows with the rank:
- 0: hex forged frame, dark inner disc, small bar.
- 1: round medallion, chevron.
- 2: medallion with milled edge ticks, star.
- 3: adds the 20-ray sunburst and laurel leaves, bigger star.
- 4: adds layered wings, round gem center, sparkles.
- 5: adds the aura, faceted diamond center, small tiara.
- 6: big crown with gems on top, diamond center, aura, extra sparkle.
- Locked: the dark palette from the mockup plus the padlock, no aura, no sparkles. Drop the old `opacity-40 grayscale` class.
- Shine sweep: the clipped skewed highlight with the `shine` keyframes. Enable it only when a new optional prop `shine` is true; respect `prefers-reduced-motion` (`motion-reduce:animate-none` or equivalent). Turn `shine` on only in `medal-unlock.tsx` and the rank hero, if one exists. Never turn it on in lists.

## Rules
- Keep the public API: `rank`, `emblem`, `size`, `locked`, `label`, `id`, `paints`, plus the new optional `shine`. Keep `role="img"`, `aria-label` and `data-medal-rank`.
- `emblem`: when a caller passes one (the medal sets and unlock do), draw that emblem path as the center motif, scaled into the inner disc. With no `emblem`, draw the rank motif from the mockup. Change the default from `'star'` to undefined, and check every caller.
- Colors stay tokens. Each rank gets the six metal stops from the mockup's `T[r].s` array as `--color-medal-<r>-s0`..`s5` in `src/app/globals.css` `@theme`. Keep the existing `a`, `b`, `c`, `gem` and `gem2` tokens if anything else still uses them; otherwise remove them. The legend gem tint is `#d8ff86` as a token. Mirror every value in `src/features/share-card/medal-colors.ts`, because the OG image passes `paints`.
- The share-card OG image (`rank-image.tsx`) must still render; satori supports the SVG elements used. If `clipPath`, `ellipse` with a transform, or animation breaks satori, skip the shine and anything unsupported when `paints` is passed.
- viewBox: use the mockup's `-10 -6 140 136`, so callers keep the same size prop. Check that the 48px list medals still read clearly.
- Keep the file under 250 lines. Split the geometry helpers into `src/ui/medal-art-parts.ts` (pure functions returning path strings or data) if needed. No `Math.random`.
- Performance: pure SVG and no new client JS beyond the geometry. The perf budget must still pass.

## Files
- `src/ui/medal-art.tsx`, new `src/ui/medal-art-parts.ts` (optional), `src/ui/medal.tsx` (only if needed for `shine`)
- `src/app/globals.css` (medal tokens only)
- `src/features/share-card/medal-colors.ts`
- `src/features/ranks/components/medal-unlock.tsx` (shine on)
- Tests: `src/ui/medal-art.test.ts` (new) plus updates to existing medal tests if markup assertions change.

## Tests
- Rank 0 has no rays, wings or crown; rank 3 has rays and laurel; rank 4 adds wings; rank 6 has the crown. Assert on stable `data-part` attributes you add (`data-part="rays"`, and so on).
- Locked shows the padlock and no aura.
- A passed `emblem` replaces the rank motif.
- No `>KO<` text in any rank.
- Existing tests in ranks, progress, player-file rank-chip and finish-points still pass.

## Out of scope
Points, ranks logic, the database, page layouts and copy.

## Gates
npm run typecheck, npm run lint, and the vitest files above. The orchestrator runs build and check.
