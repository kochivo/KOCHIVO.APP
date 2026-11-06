# T-106 — Food card follows the selected day

**Phase:** Beta feedback · **Depends on:** T-104, T-105 (merged) · **Status:** ready (owner decision 2026-11-06)

## Goal
When the player taps another day in the week strip (T-104), the workout card changes but the "أكل النهارده" card under it
still shows today. The owner decided the food card must follow the selected day.

There are no per-day meal plans: one active plan applies to every day (`meals` has no weekday). So for the selected day:
- **Today:** exactly what shows now (no change).
- **Past day:** what was eaten that day: kcal eaten / target from that day's meal logs, and "N من M وجبات" completed.
- **Future day:** the plan for that day: target kcal and the meal count, with no eaten numbers and no "next meal".

## Current code to read first
- `src/features/player-home/components/nutrition-slot.tsx`, `home-screen.tsx` (`selectedDate`, `today`).
- `src/features/nutrition/hooks/use-meal-logs.ts` (already takes a date), `use-nutrition-snapshot.ts`, `macros.ts` (`eatenTotals`, `targetsOf`), `index.ts`.
- `src/core/offline` meal_logs table and how meal logs reach the device (pull on sign-in / sync). Find out whether past-day logs logged on another device are in the local DB. If they are not, do **not** add a network fetch in this card; document it under Notes for reviewer.

## Files
- `src/features/player-home/components/nutrition-slot.tsx`: takes `date` (default today) and renders the three cases.
- `src/features/player-home/day-nutrition.ts` (new, pure): `dayNutrition(snapshot, logs, date, today)` →
  `{ kind: 'today' | 'past' | 'future'; eatenKcal?: number; targetKcal: number; mealsDone?: number; mealsTotal: number }`.
- `src/features/player-home/components/home-screen.tsx`: pass `selectedDate` to `NutritionSlot`.
- `src/features/player-home/messages.ts`: new strings.
- `src/features/player-home/day-nutrition.test.ts` (new).

## Requirements
1. Title: today keeps `todaysMeals`. Other days: "أكل {weekday}" / "Food · {weekday}" using the existing weekday labels.
2. Past day: `{eaten} / {target} سعرة` and `{done} من {total} وجبات` (plural-safe like the existing count strings).
   If nothing was logged that day, show `0 / {target}` and "متسجلش أكل اليوم ده" / "No food logged that day".
3. Future day: `{target} سعرة · {total} وجبات` and a muted line "دي خطتك لليوم ده" / "Your plan for that day".
4. Only today's card links to `/player/nutrition` (that screen logs today). Other days render the same `GlassCard`
   without the link, so nothing looks tappable that isn't.
5. Loading, error and empty states stay as they are for every day.
6. Use `useMealLogs(date, ...)` for the selected date. Keep `NutritionSlot` under 250 lines, logic in the pure helper.
7. The same fade as the workout preview when the day changes; respect `prefers-reduced-motion`.
8. Strings in `messages.ts`, Egyptian Arabic, short English, no emoji, logical properties only.

## Acceptance
- [ ] Selecting a past day shows that day's eaten kcal and completed meals; a future day shows the plan; today unchanged.
- [ ] Non-today cards are not links.
- [ ] `day-nutrition.test.ts` covers today/past/future, no logs, all meals done, deleted logs ignored.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Per-day meal plans (a schema change; not asked).
- Logging food for a non-today day.
- Fetching other devices' past logs from the server.
