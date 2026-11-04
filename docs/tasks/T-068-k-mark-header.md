# T-068 — K brand mark in the captain header

**Phase:** 3 · **Depends on:** T-066 (merged) · **Status:** ready (owner request, 2026-11-04)

## Goal
- In the app (captain) header, replace the text «KOCHIVO» with the colored **K** mark only.
- The full wordmark stays on marketing, auth and the coach public page.

## Changes
1. **New `src/ui/brand-mark.tsx`:** an inline SVG of the K mark, the same shape as `public/brand/icon.png` (open that image to check the shape).
   - The mark is three polygons. Approximate coordinates in the icon's 320×320 space, to refine against the PNG:
     - top-left bar: `32,37 101,37 101,113 32,182`
     - lime diagonal: `197,37 287,37 32,282 32,196`
     - bottom-right leg: `143,205 186,162 287,277 232,277`
   - Use a tight `viewBox` around the shape.
   - Colors use tokens only: the diagonal is `fill-lime`, the two other pieces are `fill-ink`, so they turn dark in the light theme and stay visible.
   - The SVG is `aria-hidden`. Props: `className`.
   - Export it from `src/ui/index.ts`.
2. **`src/features/roster/components/captain-shell.tsx`:**
   - The mobile header link (line ~18) renders `<BrandMark className="size-8" />` instead of the text.
   - Keep the `min-h-12` link target, `href="/captain"`, and add `aria-label={t('home')}` (or the existing home string from messages; add one if missing, Arabic «الرئيسية», English "Home").
   - The desktop sidebar link (line ~13) shows the mark followed by the text wordmark, with a gap.
3. Nothing else changes: `share-image.tsx`, `coach-page.tsx`, marketing and auth keep their current branding.

## Tests
- `brand-mark` renders an `svg` with `aria-hidden` and three `polygon`s; the diagonal has `fill-lime`.
- The captain-shell mobile link has the translated `aria-label`, and its text content no longer includes «KOCHIVO».

## Requirements
- No new dependencies.
- Tokens only (no hex in the SVG).
- Logical properties.
- Files ≤ 250 lines.

## Acceptance
- [ ] The phone header shows the colored K at about 32 px, opposite the bell, in both themes.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2` and `npm run build` pass.
