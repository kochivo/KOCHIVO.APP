# T-098 — Player streak: quiet pill, avatar ring, details sheet

**Phase:** V1 retention · **Depends on:** none · **Status:** ready (owner approved the mockup on 2026-11-06)

## Goal
Players see how many training days in a row they have kept, in a quiet, premium way: a small pill under the greeting and a thin ring around the avatar. Tapping the pill opens a sheet with the details. Rest days in the program never break the streak, and only a missed training day does.

## Mockup (player home, RTL)
```
 (ring)(Y)  Thursday · 6 Nov
            Good morning, Youssef
 [flame 14 days | 4 of 5 this week]      <- pill, h-26px, rounded-full
 [today card ... lime "Start workout"]
```
The sheet (bottom sheet, opened from the pill) contains:
- A 168px thin ring (3px stroke) with the streak number centered: `font-light`, ~46px, with «يوم ورا بعض» under it.
- One line: «أيام الراحة اللي في برنامجك مش بتكسر الرقم. بيتكسر بس لو فوّت يوم تمرين.»
- 7 small dots for the Saturday week:
  - done: filled ember
  - planned training: thin line ring
  - rest: hollow `border-line`
  - today: ember outline
- A 3-column row with dividers: «الأسبوع ده» `4 من 5`, «أحسن رقم» `21`, «الشهر ده» `17` (completed sessions this calendar month).

## Files
- `src/app/globals.css`: add **one** token `--color-ember` (muted copper, around `#c8936f`) in `@theme` and in the second theme block if it redefines colors. Ember is a status accent, never an action. Lime stays the only action color.
- `src/features/player-home/streak.ts`: pure logic.
- `src/features/player-home/streak.test.ts`
- `src/features/player-home/hooks/use-streak-sessions.ts`: completed session dates for the window below.
- `src/features/player-home/components/streak-pill.tsx`, `streak-ring.tsx` (one SVG ring used at both sizes), `streak-sheet.tsx`, `avatar-ring.tsx` (or fold it into the greeting).
- `src/features/player-home/components/greeting.tsx` / `home-screen.tsx`: place the pill and ring.
- `src/features/player-home/messages.ts`: ar + en strings.

## Requirements
1. **Logic (`streak.ts`, pure, `today` injected).** `computeStreak({ today, completedDates, isTrainingDay, accountStart })` returns `{ current, best, weekDone, weekPlanned, monthDone }`.
   - Walk back from today one day at a time:
     - a day with a completed session counts +1, whether or not it was a planned day
     - a non-training day without a session is skipped (it neither counts nor breaks)
     - a training day without a session breaks the walk
     - **today** without a session is pending and never breaks
   - Each date counts at most once, however many sessions it has.
   - Stop at `accountStart` (the player's link start), so a new player starts at 0 without a "broken" history.
   - `best` is the longest such run inside the loaded window, and never less than `current`.
   - `isTrainingDay(date)` must reuse the same rule as `buildWeek` in `week.ts`: the weekly program via `pickTodayDay`/`isWeeklyProgram`, otherwise `trainingDays`, where empty means every day. Extract a shared helper so the two can never disagree.
   - All dates are `YYYY-MM-DD` from `localDate()`/`saturdayWeek()` in `@/lib/dates`. Never use `toISOString().slice(0,10)`.
2. **Data.**
   - **Do not store a counter in the database.** No migration.
   - Read completed `workout_sessions` dates for the last 120 days from the local offline db (`localDb()`) through `useLiveQuery`, like `use-week-sessions.ts`, so offline logging updates the pill at once.
   - If the local db does not keep that much history, add a read of `training_date` for the player's own completed sessions through the existing Supabase browser client pattern (`loadSupabaseBrowser()`), merged with the local rows, and say which you did in the reviewer notes.
   - Loading: the pill shows a skeleton of the same size. Error: hide the pill and ring silently (they are non-critical) and `console.warn` once.
3. **Pill.**
   - It is a real `<button>` with `min-h-12` hit area (the visual pill can stay ~26px with padding around it), `rounded-full`, a very subtle glass (`bg-ink/5 border border-ink/10`, or the closest existing token utilities), and `text-xs font-medium`.
   - A tiny lucide `Flame` icon (12px, `text-ember`), then the number + «يوم» in `text-ember`, a 1px divider, then «X من Y الأسبوع ده» in `text-muted`.
   - `current === 0`: show «ابدأ النهارده» instead of the number.
   - It needs an accessible label, such as «سلسلة التمرين: 14 يوم، 4 من 5 الأسبوع ده».
4. **Avatar ring.**
   - A 1.5px stroke around the existing avatar/initial: an `ember` arc for `weekDone / weekPlanned`, over a `line` track, with round caps, starting at the top.
   - With no avatar today, render the initial in a `surface-raised` circle.
   - One subtle 600ms draw-in on first mount only, and none under `prefers-reduced-motion`.
5. **Sheet.**
   - Reuse the existing sheet/dialog primitive in `@/ui` if there is one. Otherwise build a small accessible bottom sheet: focus trap, Esc, backdrop click, and a close button with an `aria-label`.
   - Use logical properties only. The numbers use `formatNumber`.
6. **No emoji, no confetti, no big card.** The today card's lime button stays the only primary action.
7. **Perf:** the player budget is 300 KB gzip. Lazy-load the sheet (`next/dynamic` from a client component) so only the pill and ring ship on first load.

## Tests
- `streak.test.ts` (deterministic, injected `today`):
  - rest days skipped
  - a missed training day breaks
  - today pending does not break
  - double sessions on one day count once
  - an unplanned extra session counts
  - weekly-program vs `trainingDays` rules
  - stops at `accountStart`
  - `best >= current`
  - month boundary
- The shared training-day helper produces the same result as `buildWeek` states for a sample week.
- Render tests:
  - the pill label in ar and en, and the 0 state
  - the ring dash offset for 4/5
  - the sheet shows the three stats and the rest-day line

## Out of scope
- Showing the streak to the captain (separate card later).
- Push notifications about streaks.
- Any database change.

## Acceptance
- [ ] At 375px, the pill and ring look like the approved mockup. Nothing else on player home moves except the greeting block.
- [ ] Logging a workout offline updates the pill without a reload.
- [ ] Gates: `npx tsc --noEmit -p .`, `npx eslint .`, `npm run audit:release`, `npm run build`, `npx vitest run --maxWorkers=2` (includes the perf budget).
