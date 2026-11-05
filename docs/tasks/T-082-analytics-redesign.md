# T-082 — Smart analytics: premium redesign

**Phase:** V1 · **Status:** ready (owner request 2026-11-05: "the analysis tab looks flat and wastes space")

## Today
- `src/features/muscle-analytics/` is used by the coach (player profile) and the player (`/player/progress`, `self`).
- `analytics-panel.tsx` shows the body map, a week slider and a push/pull `balance-bar.tsx`.
- Logic: `analytics/heat.ts`, `analytics/balance.ts`, `analytics/muscle-map.ts`, `data/muscle-volume.ts`.

## Changes
1. **Quick stats row** above the map: three small glass cards, computed purely from the selected week's data, with a new unit-tested helper `analytics/summary.ts`.
   - **Weekly sets:** the total working sets.
   - **Most worked muscle:** the localized name and its sets.
   - **Recovery:** «ممتاز / متوسط / محتاج راحة» ("excellent / average / needs rest").
     - Use the readiness score when today's daily check exists (`@/features/readiness` public API only; add a small exported pure helper there if needed).
     - Otherwise use a volume heuristic: any muscle above its high-volume threshold in `heat.ts` means "needs rest".
     - Document the rule in the helper.
2. **Glowing map:**
   - Active muscles get an SVG gradient fill (lime at varying opacity by intensity) and a glow via an SVG `<filter>` (`feGaussianBlur` + merge).
   - Use `currentColor` / CSS tokens, never hex in TSX (define the filter colors through `text-lime` / `currentColor`).
   - Inactive muscles stay `text-line`.
   - Respect `motion-reduce`: no pulsing.
3. **Tap a muscle → popover** «الصدر: 12 مجموعة» ("chest: 12 sets"):
   - Muscles are real focusable buttons (`role="button"` is NOT allowed on SVG paths per AGENTS a11y; wrap each muscle group's paths in an `<a>`-less `<g>` with a sibling accessible list, or render a visually-hidden button per muscle that drives the same selection; pick one and explain).
   - Keyboard reachable, Escape closes, tapping outside closes.
   - The popover is a small glass chip positioned near the tap, clamped inside the card.
4. **Push / Pull / Legs balance:** replace the 2-way bar with a 3-way glowing strip.
   - Classify muscles in `balance.ts`: push = chest, front delts, triceps; pull = back, lats, rear delts, biceps; legs = quads, hamstrings, glutes, calves.
   - Core stays out and is listed separately, if present.
   - Three segments with distinct lightness, not hue alone, labels with percentages, and a note when one side is under 25%.
   - Unit tests for the classification and the percentages.
5. **Layout:**
   - Everything inside `glass`/`glass-strong` cards.
   - Desktop (coach): the map and the stats sit side by side (`md:grid-cols-[1fr_280px]`), so no wasted space. Mobile stacks.

## Out of scope
- The data queries (`data/muscle-volume.ts`) unless the summary needs a field it lacks.
- Other tabs.

## Requirements
- No new dependencies (no chart libraries). Files ≤ 250 lines. Tokens only, logical RTL, strings in `messages.ts` (Egyptian Arabic + English), lucide icons, ≥ 48 px targets, contrast ≥ 4.5:1.
- **Perf:** the coach route `/captain/players/[playerId]` is at **309.6 / 310 KB**. Everything new must live inside the already lazy-loaded analytics chunk (`analytics-loader.tsx` → dynamic). Do not import anything new into the profile screen's initial bundle. Player progress stays within 300 KB.

## Tests
- `summary.ts`, the 3-way `balance.ts`, and the recovery rule: unit tests.
- Panel render test: the stats row, the 3 segments, and the muscle buttons have accessible names.

## Acceptance
- [ ] Stats row, glowing map, tap popover, and the 3-way balance on both the coach and player views.
- [ ] All gates pass: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, perf budget (no budget change).
