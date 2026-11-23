# T-431 — Weight-chart period pills wrap mid-word on desktop

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
The weight-chart period selector pills never break mid-word and stay equal height. Live review (2026-11-22, kochivo.site, captain Ali Esmail, Arabic dark, player file, desktop): the selected "3 شهور" pill breaks onto two lines ("3 شهو" / "ر") and grows taller than its "شهر" and "الكل" siblings. At phone width the same selector fits on one line.

## Design decisions (read first)
1. **Pills are one line, always.** Add `whitespace-nowrap` (and `shrink-0` where the row can squeeze) to the period pills so no label can break mid-word at any width.
2. **Equal height.** The pills must share one height; the selected pill must not grow taller than its siblings. If the height difference comes from the selected state adding padding/border, make the selected state use the same box (e.g. outline/border inside the same height, not extra padding).
3. **Overflow, not wrap.** If the three pills do not fit their container at some width, let the row scroll horizontally (the component already accepts `phoneScroll`) rather than wrapping or shrinking a pill. Do not shorten the labels.

## Files
Create or modify only these:
- `docs/tasks/T-431-weight-chart-pills.md`: this card
- `src/features/progress/components/chart/calm-chart.tsx`: the period selector (`Segmented options`, `phoneScroll`, `chartQuarter` "3 شهور")
- The shared `Segmented` component the chart renders (find it from the chart's import; name the file in Notes for reviewer) — edit it only if the wrap comes from the shared component rather than the chart
- Tests for the chart/segmented component under `src/features/progress/` (extend the existing chart tests if any; create a focused test if none covers the pills)

Do not edit any file outside this list. Do not touch the staged log-cleanup entries, any T-421 file (`src/features/progress/data/checkins.ts`, `components/checkin-sheet.tsx`, `components/checkin-history.tsx`, `messages.ts`, `standard/messages.ts`, `src/core/offline/*`, migration 0164, `src/types/app-database.ts`), any KO file (`src/features/ko-account/**`, `src/features/ko-entry/config.ts`, migrations 0165–0167). If the fix genuinely needs another file, implement everything else and report the file + lines + reason in your final message instead of editing it. Do not commit or push.

## Requirements
1. "شهر", "3 شهور", "الكل" each render on one line at desktop width, with equal height.
2. Same at phone width (~390 CSS px).
3. The selected pill is visually distinct but the same height as the others.
4. No label text changes.
5. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, tokens only, logical RTL properties only, touch targets ≥ 48px, every user-facing string in `messages.ts` (ar/arStd/en), no emoji.

## Acceptance
- [ ] Desktop player file: the three pills are one line each, equal height, "3 شهور" intact.
- [ ] Phone player file: same.
- [ ] Selecting each period still switches the chart.
- [ ] `npm run check`, `npm run build` and `npx vitest run src/lib/perf-budget.test.ts` pass.

## Tests (deterministic, inject `now`, no real timers, no network)
- Chart/segmented test: the pill elements carry the non-wrapping class and equal-height styling; all three period labels render intact (assert the full "3 شهور" string is present in one element, not split across lines/elements).

## Out of scope
- The weight chart data, the KO button covering the "الكل" pill on phone (T-428), any other chart.
- A live re-check on kochivo.site (not possible until deploy).

## Notes for reviewer
- State whether the wrap came from the chart or the shared Segmented component.
- Implemented 2026-11-22 (T-431): the wrap came from the shared `Segmented` component (`src/ui/segmented.tsx`), not the chart. On desktop its buttons were `min-w-0 flex-1` with no `whitespace-nowrap` (that class only existed as `max-md:` under `phoneScroll`), so the row squeezed "3 شهور" until it wrapped. Fix, all in `segmented.tsx`: buttons are now `min-w-fit shrink-0 flex-1 whitespace-nowrap` (still grow equally when space allows, never shrink below the label), and the row is `max-w-full overflow-x-auto` at every width so it scrolls instead of wrapping. Equal height needs no extra rule: every pill is `min-h-12` with no vertical padding, so all are exactly 48px; the selected `glass-raised` border sits inside that height (border-box) — the taller selected pill in the live review was purely the two-line wrap. `calm-chart.tsx` needed no change. Tests: new pill test in `src/features/progress/calm-chart.test.ts`; pre-existing `src/ui/segmented-phone.test.ts` still passes unmodified.

## References
- `src/features/progress/components/chart/calm-chart.tsx:56,70` (options, `Segmented`, `phoneScroll`)
- `src/features/progress/messages.ts:36` (`chartMonth`, `chartQuarter` "3 شهور", `chartAll`)
