# T-073 — Muscle analytics tab (heatmap, push/pull balance, fatigue, 4-week slider)

**Phase:** 3 · **Status:** ready (owner request, 2026-11-04). The owner's brief is adapted to the KOCHIVO rules: real data, tokens, `messages.ts`, no emoji.

## Goal
- A new tab «التحليل» ("analysis") in the coach player profile (`src/features/player-profile/components/profile-screen.tsx`, next to «البيانات» "data", «التطور» "progress", «الخطة» "plan" and «المتابعات» "check-ins").
- It shows how the player's training volume spreads across muscles.
- **Plain data-visualization math, no AI.**

## Data (real, not mock)
- `set_logs` (non-deleted, `reps >= 1`) for the player in the **last 4 weeks**, joined to `exercises.target` / `exercises.body_part`.
- Weeks are computed with `localDate()` / Africa/Cairo: week 4 is the current week, week 1 is three weeks earlier.
- The coach already has RLS read access to their player's `set_logs`. Verify this; do not change RLS.
- **Muscle mapping** is a pure function in `analytics/muscle-map.ts`, taking `target` first, then `body_part`:

  | Region | `target` values | `body_part` fallback |
  |---|---|---|
  | chest | pectorals, serratus anterior | chest |
  | back | lats, upper back, traps, spine, levator scapulae | back |
  | shoulders | delts | shoulders |
  | arms | biceps, triceps, forearms | upper arms, lower arms |
  | abs | abs | waist |
  | legs | quads, glutes, hamstrings, calves, adductors, abductors | upper legs, lower legs |

  - cardio and neck are ignored.
  - Push/pull side: **anterior** = chest + shoulders + quads; **posterior** = back + hamstrings + glutes. Keep the quads/hamstrings split from `target`.
- **Weekly sets per region** = count of logged sets in that week.

## UI: one glass card, mobile first (`glass-strong` panel, tokens only)
1. **Inline SVG body, front and back, side by side.**
   - Draw it yourself: a minimal geometric/low-poly silhouette from `<path>` / `<polygon>` elements. No external file or library.
   - Group the shapes with `<g data-region="chest|back|shoulders|arms|abs|legs">`. Back view: back, rear shoulders, hamstrings/glutes.
   - Default stroke: the `line` token color at low opacity, width 1.5. The SVG is `role="img"` with a translated `aria-label` summarizing the top regions.
   - Put the SVG in its own file (`body-map.tsx`), ≤ 250 lines. Split front and back into two files if needed.
2. **Heat fill helper** `heatClass(sets)`:
   - 0 sets: no fill
   - 1–5: lime at low opacity
   - 6–12: lime
   - 13+: lime plus a glow (the existing `shadow-lime-glow` or a `drop-shadow` token)
   - Token classes only, no hex. Add a small legend.
3. **Balance bar** above the body:
   - a thin bar showing the anterior : posterior volume ratio, with labels «دفع» ("push") and «سحب» ("pull") and both percentages
   - if either side is above 60%, a small glass note «فيه عدم توازن بين الدفع والسحب» ("there's an imbalance between push and pull"); English "Push/pull imbalance". Use the `AlertTriangle` icon, no emoji.
4. **Fatigue marker:**
   - if a region has more than 20 sets in the selected week, show a small pulsing danger-token dot on that region (absolutely positioned over the SVG via the region's anchor point)
   - also show a text row «حِمل عالي على {عضلة}» ("high load on {muscle}") under the card, so it isn't color-only
   - the dot respects `motion-reduce` (no pulse)
5. **Week slider:**
   - `<input type="range" min=1 max=4>` styled with tokens, labelled «الأسبوع 1» to «الأسبوع 4» ("week 1" to "week 4"), at least 48 px tall
   - moving it re-renders fills, the bar and the markers instantly (state only, no refetch)
   - fill changes use a short CSS transition, disabled under `motion-reduce`
- **States:**
  - loading: skeleton
  - error: with retry
  - empty: «اللاعب لسه ماسجّلش تمارين» ("the player hasn't logged any workouts yet")
  - a week with zero sets shows an empty body and a «مفيش تمرين الأسبوع ده» ("no workout this week") note

## Code layout (`src/features/player-profile/`, or a new `analytics/` folder inside it)
- `data/muscle-volume.ts`: query plus pure aggregation `weeklyVolume(rows, now)`, with `now` injected.
- `muscle-map.ts`, `heat.ts` and `balance.ts`: pure functions.
- `components/analytics-tab.tsx`, `body-map.tsx`, `balance-bar.tsx` and `week-slider.tsx`.
- The tab loads lazily (`next/dynamic`) so the profile route stays inside the perf budget. The profile route is already near 310 KB gzip.

## Tests
- `muscle-map`: every target and body_part listed above.
- `weeklyVolume`: week bucketing at Cairo midnight boundaries, deleted sets ignored.
- `heatClass` thresholds; `balance` ratio and the 60/40 flag, including zero volume.
- Fatigue: more than 20 sets gives a marker plus the text row.
- Slider changes the rendered fills (testing-library).

## Requirements
- No new dependencies (lucide is ok).
- Every string in `messages.ts` (Egyptian Arabic and English).
- Tokens only (`bg-lime`, `text-muted`, `glass-strong`, danger token; no hex, no `#050505`).
- Logical properties.
- Files ≤ 250 lines.
- Perf budget must pass after the build, without changing budgets.

## Acceptance
- [ ] The coach opens a player and sees «التحليل» ("analysis") with the colored body from real logged sets, the push/pull bar, fatigue markers, and a working 4-week slider.
- [ ] `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build` and the perf budget pass.
