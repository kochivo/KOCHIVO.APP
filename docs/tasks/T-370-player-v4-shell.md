# T-370: Player v4 shell (bottom bar, centre workout button, coach button)

**Migration:** none. **Owner decision 2026-11-18:** build the player v4 mockups 100%, fully working.

## Read first
- `AGENTS.md`, `DESIGN.md`, `docs/tasks/REFINED-LOOK.md`.
- The mockups in `docs/mockups/player-v4/`: open each `.html` and look at its `.png`. Screens `01`, `09`, `11` and `16` show this card's parts.

## Files
Edit only these:
- `src/features/player-shell/**`, except `captain-screen*`, `captain-heading*` and the assessments and profile screens, which belong to T-374
- `src/ui/pill-nav.tsx`, if the bar lives there
- tests

Every page body belongs to T-371..T-374. Do not restyle pages here.

## What to build
1. **Bottom bar.** It is shown on the main tabs only and keeps today's `showsNav` rules. It has five slots, read in RTL from the start:
   - النهارده `/player`
   - الأكل `/player/nutrition`
   - the centre workout button
   - التقدم `/player/progress`
   - التقييمات `/player/assessments` (this replaces the الكابتن tab)

   **Active tab:** a lime 4×16px skewed slash above the icon, with a lime icon and an ink label. Inactive tabs are faint.

   The bar sits on a fade from transparent to the background, as in the mockup. Every slot has a touch target of at least 56px.
2. **Centre workout button.** A 64px lime rounded square, turned 45°, holding the dumbbell icon, and raised above the bar.
   - **Tap:** goes to today's workout day, `/player/workout/<todayDayId>`. Use the same local snapshot and date logic the home screen already uses to find today's day. Do not add a new query if an existing hook gives it.
   - **Rest day:** the button turns blue (the existing rest mood colours) with a moon icon and goes to `/player`.
   - **No program yet:** the button goes to `/player`.
   - It needs a translated `aria-label` that matches its state.
3. **Coach button.** A 44px circle with the captain's avatar, plus:
   - a small chat badge at the bottom start;
   - the unread count at the top end, using the existing chat unread source.

   Tap opens `/player/captain` (the chat).

   Export it through the barrel as `coach-button-entry.tsx` so the page cards T-371..T-374 can put it in their headers. Do not place it on pages yourself.
4. **Messages.** Add new strings to ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, like the existing ones) and en.

## Do not change
- routes, auth, data writes, chat polling and the feedback button rules (update `showsFeedback` only if the bar's new height needs it)
- the flag-off (non-v6) shell markup, which must stay identical

## Done when
- Unit tests cover:
  - tab order and the active tab;
  - the centre-button target for a training day, a rest day and no program;
  - the coach button's unread badge.
- It fits at 360px and 390px.
- `npm run check` passes. The build may fail inside the worktree; the reviewer builds.
