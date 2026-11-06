# T-105 — Polish for T-103 / T-104 found in the in-app check

**Phase:** Beta feedback · **Depends on:** T-103, T-104 (merged) · **Status:** ready (owner approved 2026-11-06)

## Goal
The 2026-11-06 click-through of T-103 and T-104 found four defects. Fix them without changing anything else.

## Files
- `src/features/programs/components/exercise-row.tsx`
- `src/features/player-home/components/week-strip.tsx`, `home-screen.tsx`, `day-preview-card.tsx`
- `src/features/player-home/week.ts` (only if needed for the next-week page), `messages.ts`
- Tests next to them (`a11y.test.ts`, `weekly-ui.test.ts`, `day-preview.test.ts`, programs `builder-ui.test.ts`)

## Requirements
1. **Builder grid wraps.** In the desktop program builder the exercise card sits in a narrow column, so with four cells
   (Sets / Reps / Rest / RIR) the values "8–12" and "90 ث" wrap onto two lines. The `sm:grid-cols-4` breakpoint follows the
   viewport, not the card. Make the card a container (`@container`) and switch to 4 columns on the container size
   (Tailwind v4 container variant, e.g. `@md:grid-cols-4`), staying 2 columns otherwise. Values must never wrap
   (`whitespace-nowrap` on the value). No new dependency.
2. **No upcoming days at the end of the week.** The strip shows Saturday–Friday only, so on Friday there is nothing upcoming
   to tap, which defeats the feature. Add a next-week page: two icon buttons (lucide chevrons, flipped for RTL with
   `rtl:rotate-180`, translated `aria-label`s "الأسبوع ده" / "الأسبوع الجاي", ≥48px) that switch the strip between this
   week and next week. Only those two pages. Next week's days are built with the same `buildWeek` (date = today + 7) and are
   selectable; `previewFor` already handles any date. Selecting today or tapping "this week" returns to the current page.
   When the calendar date changes, reset to this week and today (same as the existing selection reset).
3. **Rest preview says "يوم راحة" twice** (badge and title). For `rest` status show no badge; keep the title and the
   recovery line.
4. **Loading flash when returning to today.** The today block (`NextTaskSlot`, `PlayerReadiness`) unmounts while a
   preview is shown, so going back refetches and shows a skeleton. Keep it mounted and hide it with the `hidden`
   attribute while previewing, so returning to today is instant. Keep the fade on the preview card only.

## Acceptance
- [ ] Builder: at a 1280px viewport the exercise values stay on one line; on a narrow card the grid is 2×2.
- [ ] On a Friday (inject today) the player can open next week and preview next Saturday with the "تمرين قادم" badge.
- [ ] Rest preview shows one "يوم راحة".
- [ ] Switching to another day and back does not remount the next-task slot (test or markup assertion).
- [ ] Tests updated/added for 2–4; `npm run check` and `npm run build` pass.

## Out of scope
- The "أكل النهارده" card under a preview (owner has not decided).
- Any SQL, RIR logic, or picker change.
