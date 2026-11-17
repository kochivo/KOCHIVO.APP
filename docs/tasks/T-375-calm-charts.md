# T-375: Calm charts (fixed height, real dates, one title)

**Migration:** none. **Owner decision 2026-11-18:** the weight chart is too big and looks AI-made. Fix every chart to match the canvas page «الرسوم والباقات» (`docs/mockups/charts/` has a copy).

## Problem
`src/features/progress/components/line-chart.tsx` draws a `viewBox="0 0 350 160"` SVG with `className="w-full"` and no fixed height:
- On the captain player file it scales to about 880×400px.
- Its `<text>` labels scale with it, so 10px becomes about 25px.
- Week labels are «أ1 أ2 أ3» (`weekLabel`), which reads as broken Arabic.
- The title shows three times: the card heading, the SVG `<title>` (which shows as a white browser tooltip), and the caption line.
- Y labels sit at the SVG edge and get clipped («أ»).

## Files
Edit only these:
- `src/features/progress/components/line-chart.tsx` and new small files under `src/features/progress/components/chart/`
- `src/features/progress/series.ts`, if needed
- `src/features/progress/messages.ts` and `standard/messages.ts` (chart strings only)
- `src/features/dashboard/home/home-week-chart.tsx`
- `src/features/captain-workspace/player-file/progress-media-entry.tsx` and the player-file overview card that wraps the weight chart (remove the duplicate heading and caption only)
- tests

Do not restyle anything else on those pages.

## Rules for every line chart
1. **Fixed height.** 180px on desktop cards and 120–150px in small cards and on the phone.
   - The SVG may stretch in width only, using `preserveAspectRatio="none"` with `vector-effect="non-scaling-stroke"`.
   - No text inside the SVG. All labels are HTML, so they never scale.
2. **Header.** The label, the big last value with its unit, and a change chip, for example «−3.6 من البداية».
   - The chip is lime when the change moves toward the goal and muted otherwise.
   - A small period switch: شهر / 3 شهور / الكل. It filters points client-side.
3. **Plot.**
   - A 2–2.25px lime line.
   - A soft area fill from lime at 18% opacity to 0.
   - Three faint horizontal gridlines.
   - An optional dashed goal line, when the player has a target weight.
   - One dot, on the last point only, with a ring in the background colour.
4. **Axes.**
   - Y: three values (max, middle, min) in HTML on the end side.
   - X: 2–4 real dates via `formatDateAr` (for example «20 أكتوبر»), or «النهارده» for today.
   - Delete the `weekLabel` «أ{n}» use.
5. **Footer.** A legend (الوزن, plus الهدف when shown, plus دهون when there is body-fat data, in muted colour) and a small «اعرض الأرقام» text button that opens the existing table. Keep the table and the screen-reader summary.
6. **Removed.** The SVG `<title>` tooltip and the duplicate caption line.
7. **One point only.** Show the value and «الرسم بيظهر من تاني متابعة» in a dashed box, not a lone dot.
8. **Compact mode** (player progress): the same rules, smaller.

## Week bar chart (`home-week-chart.tsx`)
- Bars at most 26px wide with radius 6.
- The count goes above each bar.
- Today is solid lime, past days are lime at 35%, and future days are a faint stub.
- Today's day label is bold.

## Done when
- Tests cover:
  - the y-tick and x-date helpers (pure);
  - that no `<text>` and no «أ1» label are rendered;
  - the single-point state;
  - the period filter.
- The flag-off markup hashes stay green, or update them only for the chart, with a note.
- `npm run check` passes.
