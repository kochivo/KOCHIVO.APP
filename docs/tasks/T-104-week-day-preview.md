# T-104 — Tap a day in the week strip to preview its workout

**Phase:** Beta feedback · **Depends on:** none · **Status:** ready (owner request 2026-11-06)

## Goal
On a rest day the player home shows only the recovery state, so the player cannot see what is coming. After this card,
every day in the week strip is a button. Tapping another day shows that day's workout in a **read-only preview**
(no start/finish action) with a badge: "تمرين قادم / Upcoming workout", "مكتمل / Completed", or for a past day that was
not logged "متسجلش / Not logged". Tapping today brings back exactly the current home (recovery state on a rest day,
or the normal today card and next task).

## Current code to read first
- `src/features/player-home/components/home-screen.tsx` (79 lines; composes everything).
- `components/week-strip.tsx`, `week.ts` (`buildWeek`, `WeekEntry`), `next-day.ts` (`pickTodayDay`, `nextTrainingDay`), `rest-day.ts`.
- `components/today-card.tsx` (the card a preview should reuse visually), `weekly-rest-card.tsx`.
- `src/ui` `CardioCards`, `GlassCard`, `Chip`/badge primitives; `src/lib/dates` (`saturdayWeek`, `weeklyWeekday`, `localDate`).
- Existing tests: `weekly-ui.test.ts`, `rest-day.test.ts`, `fleet-ui-home.test.ts`, `a11y.test.ts`.

## Files
- `src/features/player-home/components/week-strip.tsx`: days become buttons; `selected` + `onSelect` props.
- `src/features/player-home/day-preview.ts` (new, pure): `previewFor(snapshot, sessions, date, today)` →
  `{ day: SnapshotDay | undefined; status: 'upcoming' | 'completed' | 'missed' | 'rest' }`.
- `src/features/player-home/components/day-preview-card.tsx` (new): read-only card.
- `src/features/player-home/components/home-screen.tsx`: holds `selectedDate` state (default today; reset to today when the calendar date changes).
- `src/features/player-home/messages.ts`: new strings.
- `src/features/player-home/day-preview.test.ts` (new) and updates to existing tests if markup changes.

## Requirements
1. **Week strip:** each `li` contains a `button` (min 48px tall, full cell) with the existing `aria-label`, plus
   `aria-pressed` for the selected day. Today keeps its lime outline; the selected non-today day gets a
   `glass-strong` fill. Keep logical properties and current visuals otherwise.
2. **Resolving a day (`previewFor`):**
   - Weekly programs: the day whose `weekday === weeklyWeekday(date)` (respect `weeklyFinished`). Rest if none or `is_rest_day`.
   - Rotating programs: if a session exists on that date, its program day. For future dates, walk forward from today's
     `pickTodayDay` over the training dates of the week (`snapshot.training_days`) to predict the day; non-training dates are rest.
     Past dates with no session: `missed` when it was a training date, else `rest`.
   - `completed` when a completed session exists on that date; `upcoming` for future training dates.
   Pure, deterministic, `today` injected; unit-test weekly, rotating, completed, missed, rest, and finished-cycle cases.
3. **Preview card:** same look as `TodayCard` (`GlassCard level="featured"`, weekday, title, counts, list of exercise
   names with sets × reps, cardio via `CardioCards`), plus a status badge. **No** start / finish / train-anyway link,
   and no `data-tour` attributes. Rest status shows a calm rest card ("يوم راحة") instead of exercises.
4. **Home screen:** when `selectedDate !== today`, render the preview card in place of the readiness / next-task /
   today-card block (week strip stays where it is so the player can tap back). When `selectedDate === today`, render
   exactly what renders today — no behaviour change for today, including the rest-day recovery state.
   `home-screen.tsx` must stay under 250 lines; extract a small component if needed.
5. **Transition:** fade/slide the swapped block with a short CSS transition (≤200ms) keyed on the selected date,
   disabled under `prefers-reduced-motion`. No new dependency.
6. Strings in `messages.ts`, Egyptian Arabic, short English, no emoji. Badge keys: `upcomingWorkout`, `completedWorkout`, `notLogged`, `backToToday` (optional link-button back to today).

## Acceptance
- [ ] On a rest day, tapping a future training day shows its exercises with an "تمرين قادم" badge and no start button.
- [ ] Tapping a past completed day shows "مكتمل"; tapping today restores the recovery state.
- [ ] Keyboard: days are focusable buttons, `aria-pressed` correct; axe/a11y test still passes.
- [ ] `day-preview.test.ts` covers the cases in requirement 2 with injected dates.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Starting a workout for a non-today day, or editing anything from the preview.
- Showing logged weights/reps of past sessions (history screen already does that).
- Any coach-side or program-builder change (that is T-103).

## References
- `AGENTS.md` §2–§4.
