# T-096 — Muscle map v2: per-muscle heat, clear overload, no front/back captions

**Phase:** V1 polish · **Status:** ready (owner 2026-11-05, phone screenshot of the player's progress tab: "something is wrong, it can look better; remove the front/back words and add something better")

## What is wrong today (`src/features/muscle-analytics`)
1. **Everything glows the same green.**
   - `body-figure.tsx` colors 6 coarse regions (`regions` in `analytics/muscle-map.ts`), so all of `legs` (quads, hamstrings, glutes, calves) gets one color.
   - `heatIntensity` (`analytics/heat.ts`) has only 3 steps (.3/.65/1). The gradient plus glow filter makes 4 sets and 41 sets look almost identical.
   - The data already has per-muscle volume (`week.muscles`, keys in `muscles`: chest, back, lats, frontDelts, rearDelts, biceps, triceps, forearms, core, quads, hamstrings, glutes, calves, adductors, abductors).
2. **An unexplained orange dot sits on the thighs.**
   - It is the fatigue marker (`volume[region] > 20`) at a fixed anchor, and it looks like a rendering bug.
3. **The "most worked" stat breaks a word mid-letters.**
   - In `quick-stats.tsx`, the value is `break-words font-display text-xl` inside a 3-column grid, so «المؤخرة» renders as «المؤخر» / «ة» on a 390px phone.
4. **The «قدّام» / «ورا» captions** above the figures add nothing; the owner wants them gone.

## Changes
1. **Per-muscle paths.** Split `body-paths.ts` so each figure is keyed by `Muscle`, not `Region`:
   - **front:** chest, frontDelts, biceps, forearms, core, quads, adductors, abductors (where visible), calves
   - **back:** back (traps/upper back), lats, rearDelts, triceps, forearms, glutes, hamstrings, calves
   - Reuse the existing shapes; split them where a region covers several muscles (e.g. the upper arm into biceps front and triceps back; legs into quads/adductors front and glutes/hamstrings/calves back). Keep the silhouette and definition lines.
   - Update `body-paths.test.ts` (every path parses, every muscle has at least one path on at least one view, and no path is outside the viewBox).
2. **Heat scale.**
   - Color each muscle from `week.muscles[muscle]` with a 5-step scale: 0 = `line`, then 1–3, 4–7, 8–12, 13+.
   - Use solid fills with clearly different lime opacities (e.g. .25/.45/.7/1). Glow only on the top step.
   - Keep `heatIntensity` / `heatClass` in `analytics/heat.ts` as the single source, extend them and update their tests.
   - The legend under the panel must match the same 5 steps.
3. **Overload, explained.**
   - Remove the floating dots.
   - A muscle over the overload threshold gets a `danger` outline (stroke) on its own paths.
   - The existing «حمل عالي» ("high load") text line below the map names the muscle (per muscle, not region) using the existing `highLoad` message.
   - Keep the threshold a named constant in `heat.ts`.
4. **No captions; add a scale under the figures.**
   - Remove the front/back `figcaption` pills (keep a visually-hidden caption for screen readers via the existing `bodyLabel` aria-label).
   - Directly under the two figures, add a compact horizontal gradient bar from «قليل» ("little") to «كتير» ("a lot") (EN: "Less" / "More"). Use the 5 heat steps as segments, with the selected week's total sets at the end (e.g. «51 مجموعة», "51 sets").
   - The figures get slightly bigger now that the captions are gone (`max-w-sm`).
5. **Tap a muscle.**
   - Tapping a muscle path selects that **muscle** (not the region) and shows the existing popover with its name and sets (`muscle.*` names from `analytics/premium/messages.ts`).
   - The chip list below the figure keeps the 6 regions (it is the accessible list); do not grow it.
6. **Quick stats text fit.**
   - In `quick-stats.tsx`, the value must never split inside a word: use `[overflow-wrap:normal]`/`break-normal` with `hyphens-none`, `text-balance`, and a size that fits 3 columns at 360px (`text-base` on mobile, `md:text-2xl`).
   - Rename the Arabic `muscle.glutes` to «الجلوتس» (gym wording Egyptian players use) in `analytics/premium/messages.ts`.

## Requirements
- AGENTS.md:
  - tokens only (no hex)
  - logical RTL (the figure row stays `dir="ltr"`, as today)
  - strings in `messages.ts`, Egyptian Arabic
  - files ≤ 250 lines (split `body-paths.ts` into `body-paths-front.ts` and `body-paths-back.ts` if needed)
  - no dependencies
  - `motion-reduce` respected
- Perf budgets unchanged (player 300 KB; the captain player route is about 309.3/310 KB and also renders this panel, so keep the code small. Path data is a string table; avoid new client libraries).

## Out of scope
- The SQL or volume aggregation.
- The week slider and balance bar (except the legend steps).

## Tests
- `body-paths.test.ts` as above.
- `heat` step tests.
- A render test that:
  - shows no figcaption text «قدّام»/«ورا»
  - shows the scale bar
  - gives each muscle its own fill step
  - outlines an overloaded muscle with `stroke-danger` and no floating dot
- A quick-stats test for the no-break classes.

## Acceptance
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the perf budget).
