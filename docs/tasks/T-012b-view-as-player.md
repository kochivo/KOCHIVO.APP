# T-012b — «شوف كلاعب»: a read-only preview of what the player sees

**Phase:** 3b · **Depends on:** T-005, T-007, T-010, T-011 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
From a player row (or from the program and nutrition builders), the captain opens «شوف كلاعب». A phone-sized frame shows exactly what that player has right now:
- today's training day and the week strip, with the next day computed the same way the player app computes it
- the active program's days, each with its exercises (sets × reps, rest, the exercise GIF with «© Gym visual»)
- the active nutrition plan: meals, items, grams, and the per-meal and total macros versus the targets
- the last 7 days of activity: sessions trained and meals marked eaten

Everything is **read-only**. There is no impersonation, no sign-in as the player, and no write of any kind. It uses only data the captain can already read through RLS (`is_captain_of` policies on programs, nutrition, `workout_sessions`, `set_logs`, `meal_logs`, and `player_intake`).

Mockup board: **CaptainViewAsPlayer** (`docs/mockups/CaptainViewAsPlayer.dc.html`).

## Files
- `src/features/player-home/index.ts`: also export `mapProgramSnapshot`, the `ProgramResponse` type, and the pure next-day helper from `next-day.ts` (read it to find the name). Exports only.
- `src/features/nutrition/index.ts`: also export `mapNutritionSnapshot`, the `NutritionResponse` type, `itemMacros`, and `mealMacros`. Exports only.
- `src/features/player-preview/` (new):
  - `index.ts`
  - `data/preview.ts`, a `'use server'` action `fetchPlayerPreview(playerId, today)`:
    - zod: uuid plus `YYYY-MM-DD`
    - with the captain's session, read:
      - the player's active program, using the same select shape as `player-home/data/program-snapshot.ts`
      - `player_intake.training_days`
      - the active nutrition plan, using the same select shape as `nutrition-snapshot.ts`
      - the player's name
      - sessions and meal logs from the last 7 days (`training_date`/`log_date` ≥ today − 6)
    - Map them with `mapProgramSnapshot` and `mapNutritionSnapshot` imported from the features' `index.ts`.
    - Returns `{ data: { name, program, nutrition, week } }`, `{ data: null }` when `is_captain_of` is false (RLS returns nothing), or an Arabic `{ error }`.
    - It must not import any Dexie or `localDb` code.
  - `week.ts` (pure): `activityWeek(today, sessions, mealLogs)` returns 7 days, Saturday first, matching `player-home`'s strip, each with `{ date, trained, mealsEaten }`
  - `components/preview-screen.tsx`:
    - a header with «معاينة كلاعب · {name}» and a back link to `/captain`
    - a centered `phone-frame.tsx` (rounded, `glass-strong` border, max width about 390px, with internal scroll)
    - tabs inside the frame: «النهارده», «البرنامج», «الأكل», «الأسبوع»
    - an always-visible muted banner «ده عرض بس. أي تعديل من البرنامج أو النظام»
  - `components/phone-frame.tsx`
  - `components/preview-program.tsx`: exercise GIFs via `exerciseMediaUrl` (`unoptimized`), with the attribution «© Gym visual» once per list
  - `components/preview-nutrition.tsx`: totals versus targets using `itemMacros` and `mealMacros`
  - `components/preview-week.tsx`
  - States: loading, error with retry, no program «لسه مفيش برنامج متفعل», no plan «لسه مفيش نظام أكل متفعل», not your player → `notFound()` from the page.
  - `player-preview.test.ts`:
    - `activityWeek` covers Saturday-first order, a month boundary, and trained and meal counts
    - `fetchPlayerPreview` covers validation before any network call, `null` when the program read returns nothing, and error mapping, with a mocked client
- `src/app/(captain)/captain/players/[playerId]/preview/page.tsx` (new, thin): passes `localDate(new Date())`
- `src/features/roster/components/roster-row.tsx`: add one «شوف كلاعب» link next to «البرامج» and «الأكل», matching their style. This is the only change there.

## Requirements
1. Zero writes. No server action in this feature mutates anything.
2. It never renders the player's private photos or videos; those belong to the inbox.
3. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, use Egyptian Arabic, and give icon buttons an Arabic `aria-label`.

## Acceptance
- [ ] `player-preview.test.ts` passes, and the existing player-home and nutrition tests still pass.
- [ ] `/captain/players/[playerId]/preview` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- Rendering the real player components in `readOnly` mode (a later refactor)
- The demo workspace (T-012c)
- Editing from the preview
