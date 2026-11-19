# T-416: The progress chart uses real time spacing and a visible body-fat scale

**Depends on:** none · **Status:** ready · **Source:** full audit 2026-11-19

## Problems
1. **Points are evenly spaced whatever the dates.**
   - Readings on Sep 5, Sep 12 and Nov 14 put Sep 12 in the middle, so a 1-week gap looks the same as a 9-week gap.
   - Files: `progress/components/chart/chart-plot.tsx:15` (coordinates) and `:51` (date labels).
2. **The body-fat line has no scale of its own.**
   - With weight at 78–82 kg and fat at 20–30%, the only ticks are kg. A 25% reading sits on the 80 kg tick.
   - Files: `chart/calm-chart.tsx:45`, `chart-plot.tsx:11`, `chart-plot.tsx:46`.

## Requirements
1. The x position is proportional to elapsed calendar days between the first and the last reading. Keep the existing padding. Date labels sit at their real positions and must not overlap: thin them if needed.
2. When body fat is plotted with weight, show its own labeled percentage ticks on the other side (logical `end` side, RTL-safe), in the fat series color token. Otherwise show it on its own scale. The legend makes the unit clear (kg vs %).
3. A single reading, or all readings on the same day, must not divide by zero.
4. **The look must not change otherwise:** same colors, tokens, sizes and animation.

## Out of scope
- New chart types.
- Data loading.

## Tests
- Coordinates for the Sep 5 / Sep 12 / Nov 14 example: the second point sits at about 10% of the plot width.
- A single point and same-day points give no NaN.
- A fat axis is rendered with % ticks when both series are present.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/progress`
- `npx vitest run src/features/progress`
