# T-088 — Muscular body figure for the muscle map

**Phase:** V1 polish · **Status:** ready (owner request 2026-11-05: "the front/back figure looks bad; make a better, muscular figure that motivates")

## Today (read before coding)
- `src/features/muscle-analytics/components/body-map.tsx` draws two flat mannequins (front and back) from a few polygons.
  - Each of the 6 regions in `analytics/muscle-map.ts` (`chest`, `back`, `shoulders`, `arms`, `abs`, `legs`) is 2 blocky shapes.
  - A trained region gets a lime gradient + glow (`heatIntensity`). Untrained regions are flat `text-line`.
  - A red pulsing dot marks regions over 20 sets (`anchors`).
- It is shown:
  - on the player progress page
  - on the captain player detail (analytics tab)
  - inside a lazy `dynamic(..., { ssr: false })` chunk (`analytics-loader.tsx`)
- The owner's screenshot shows that the figure reads as a robot or crash-test dummy, not an athlete.

## Changes
1. **New anatomical figure, front and back.** Replace the polygons with a stylised but clearly muscular male athlete (fitness-app style, not medical), in the same `viewBox`-based inline SVG approach so each muscle stays clickable and colourable.
   - **Front:** traps (top), front delts, pecs (two plates), biceps, forearms, six-pack abs + obliques, quads (with a visible teardrop and outer sweep), adductors, calves (tibialis/front calf).
   - **Back:** traps, rear delts, lats (V-taper), mid-back/rhomboids, triceps, forearms, lower back, glutes, hamstrings, calves.
   - **Map every muscle shape to one of the existing 6 regions:**
     - traps, lats, mid back, lower back → `back`
     - delts → `shoulders`
     - biceps, triceps, forearms → `arms`
     - abs, obliques → `abs`
     - quads, adductors, glutes, hamstrings, calves → `legs`
     - pecs → `chest`

     Do **not** change the `Region` type, the data layer, or the analytics.
   - **Head, neck, hands, feet and joints** are a neutral silhouette (`fill-surface`), not clickable.
   - **Muscle shapes:**
     - Each muscle shape is separated from its neighbours by a thin gap or stroke so separation is visible.
     - Add a few short internal definition lines: ab segments, pec split, quad separation. Use `stroke-bg-deep/40` or another existing token, `fill="none"`, `pointer-events="none"`.
   - Proportions: broad shoulders, V-taper, narrow waist, athletic legs. It must look good at the current size (two figures side by side in `max-w-xs`) and at 375px width.
   - Keep the existing behaviour:
     - lime gradient by `heatIntensity`, glow on trained regions
     - click and keyboard selection through `useMusclePopover`
     - the region chip list
     - `aria-label` per view
     - the high-load dot (reposition `anchors` to the new shapes)
   - Untrained muscles must still read as muscles: a subtle base fill (`text-line` or `fill-surface-raised` or `text-line-soft`, existing tokens) plus the separation strokes, so an empty week still looks like an athlete, not a grey blob.
2. **Front and back labels** («قدّام» / «ورا», "Front" / "Back"): restyle them as small `glass` pills above each figure. The current plain text looks unfinished. Keep the existing message keys.
3. **Structure:**
   - Move the SVG geometry to `components/body-paths.ts` (data only: `Record<'front' | 'back', Record<Region, string[]>>` plus definition-line paths and the silhouette path).
   - Keep `body-map.tsx` under 250 lines.
   - Split the figure into `body-figure.tsx` if needed.

## Out of scope
- Analytics maths, the data query, `Region`/`Muscle` types, the week slider, quick stats, balance bar.
- Splitting regions into finer muscles in the data layer (later card).
- Any new dependency or image file. This stays inline SVG with tokens only (no hex in components or paths).

## Requirements
- AGENTS.md rules:
  - files ≤ 250 lines
  - tokens only
  - logical RTL, but the figure container stays `dir="ltr"` as today, because anatomy must not mirror
  - strings in `messages.ts`
  - no dependencies
- `prefers-reduced-motion` respected, as today.
- **Perf:** the map lives in the lazy analytics chunk. The first-load budgets must not move (player 300, captain 310 KB; the captain player route is at 309.3). Keep the path data compact: integer coordinates and short path commands. Target ≤ 12 KB raw for `body-paths.ts`.

## Tests
- Update `analytics-panel.test.ts` / `analytics.test.ts` expectations if they count paths.
- Add a unit test on `body-paths.ts`:
  - every region the view supports has at least one shape (front has chest/shoulders/arms/abs/legs, back has back/shoulders/arms/legs)
  - every path string is non-empty and uses only valid SVG path characters
- A render test: a week with `chest: 3, arms: 3` marks only those regions' groups as active (lime) on the front, and the back view has no chest group.

## Acceptance
- [ ] The figure reads as a muscular athlete front and back. Trained muscles glow lime; untrained ones still show muscle definition.
- [ ] Clicking a muscle opens the same popover as today. Chips and the high-load dot still work.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, then the perf budget test.
