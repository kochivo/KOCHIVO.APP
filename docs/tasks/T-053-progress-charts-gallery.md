# T-053 — Progress charts (weight and body fat) and photo gallery with before/after

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Already exists, build on it
- Weekly `public.check_ins` (0008) has `body_weight_kg`, `waist_cm`, `photo_paths text[]` and `week_start`.
- There is a hand-rolled SVG chart, `src/features/progress/components/line-chart.tsx`, loaded with `next/dynamic` in `progress-screen.tsx`.
- **No chart library.** The owner suggested recharts, but AGENTS.md forbids new dependencies and the perf budget is strict. Extend the existing SVG chart instead, and say so in the final message.

## Files
- `supabase/migrations/0048_body_fat.sql`:
  - Add `body_fat_pct numeric(4,1) check (body_fat_pct between 3 and 60)` to `check_ins`.
  - Add `photo_poses text[] not null default '{}'`, with a check that its length equals the length of `photo_paths` (or it is empty) and every value is one of `front`, `side`, `back`.
  - The existing check-in RLS covers both columns. If the insert or update path uses column grants, extend them.
- PGlite test: insert and read both columns; bad values are rejected; another player cannot read them.
- Check-in form (`src/features/progress`): add an optional body-fat field, and three labelled photo slots, «قدام», «جنب» and «ضهر», that fill `photo_poses`. Old check-ins with no poses still show their photos as «صورة».
- `line-chart.tsx`:
  - Support two series: weight on the main axis and body fat % on a secondary scale with a muted line. Use tokens only (`text-lime`, `text-muted`).
  - Show week labels and a visible value for the last point.
  - Keep accessible title and summary text, and add an accessible data table toggle.
  - Glass container.
- New `progress-gallery.tsx`:
  - Weeks in reverse time order, each with its photos grouped by pose.
  - A «قارن» mode: pick two weeks and a pose, and show them side by side, with dates and the weight difference.
  - Use `next/image` only if the storage host is allowed, otherwise `<img loading="lazy">` with signed URLs (follow the existing check-in photo code).
  - Include an empty state.
- Show the chart and the gallery in both the player's progress screen and the captain's player detail (find the component in `player-profile` or `roster`).
- `messages.ts`: Egyptian Arabic and English.
- Unit tests for the series scaling (missing body-fat weeks, a single point, a flat line) and the compare selection.

## Requirements
- No new dependencies. Tokens only. RTL; mirror the chart's x-direction for Arabic, so time flows right to left. Files under 250 lines. The perf budget must pass.

## Acceptance
- [ ] A player and their captain see the weight and body-fat trend by week, and can compare two weeks' photos side by side.
- [ ] `npm run check`, `npm run build` and the perf budget pass.
