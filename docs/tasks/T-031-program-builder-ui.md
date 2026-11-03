# T-031 — Program builder: cleaner layout and wording

**Phase:** 3 · **Depends on:** none · **Status:** ready

## Goal
The program builder logic is good, but the screen is crowded and looks heavy. Today it has three columns: days, the day editor, and a fixed exercise library.
After this card the builder has two columns, days and the day editor. The library opens only when the captain asks for it, and every surface uses the glass tokens.
This is UI only: no change to the draft logic, saving, or activation.

## Files
Create or modify only these:
- `src/features/programs/components/program-builder.tsx`:
  - remove the fixed library column
  - the layout becomes `days | day editor`
  - keep the file under 250 lines; move the days column into `day-list.tsx` if needed
- `src/features/programs/components/day-list.tsx` (new, optional): the days column, moved out of `program-builder.tsx` unchanged except for styling and wording.
- `src/features/programs/components/day-editor.tsx`:
  - a prominent "+ إضافة تمرين" (add exercise) button that opens the library drawer
  - show it under the exercise list, and also inside the empty state when the day has no exercises
- `src/features/programs/components/exercise-drawer.tsx` (new):
  - a side drawer that holds the existing `ExercisePicker` (lazy-loaded, as today, through the `Deferred` wrapper)
  - in Arabic (RTL) it slides in from the **left** edge; in English, from the right. In other words, it opens on the inline-end side, so use logical properties (`end-0`), not `left-`.
  - `glass-strong` surface, full height, at most `max-w-md`, full width on phones
  - a close button with a translated `aria-label`
  - closes on Escape and on a backdrop click
  - moves focus into the drawer when it opens and returns it to the button when it closes
  - reuse `ResponsiveDialog` from `src/ui` if it can do a side sheet; otherwise build on a native `<dialog>`, in the same way
  - after an exercise is added the drawer stays open and shows a short confirmation, «اتضاف: {name}» ("Added: {name}"), so the captain can add several in a row
  - honour `prefers-reduced-motion`: no slide animation
- `src/features/programs/components/exercise-row.tsx`, the exercise card:
  - a tidy card: the name and actions on top, and below them three clearly labelled fields in one row on desktop (stacked on phones): sets, reps (min–max or open), and rest
  - keep the existing steppers or number inputs, and keep the open-reps and superset controls
  - the rest control stays a select, with glass styling, no solid `bg-surface`
- `src/features/programs/components/builder-header.tsx`:
  - the primary button `activateForPlayer` becomes «حفظ الخطة» / "Save plan"; it still saves and then activates, as it does today
  - the existing ghost save button becomes «حفظ كمسودة» / "Save draft"
- `src/features/programs/messages.ts`:
  - `addDay` becomes «+ إضافة يوم تدريبي» / "+ Add training day"
  - new keys for the button, drawer, close and confirmation strings
  - keep Arabic Egyptian and English short
- Tests: update the `programs` tests that assert old labels or layout (`a11y.test.ts`, `locale-render.test.ts`, `programs.test.ts`), and add one render test: the library is not in the page until "+ إضافة تمرين" is pressed.

## Requirements
1. Glass look:
   - Columns and cards use the existing tokens `glass` / `glass-raised` / `glass-strong` from `src/app/globals.css`. They are already translucent with blur and a light border.
   - Do not write raw `bg-white/5 …` utilities or hex values in components; AGENTS.md allows tokens only.
   - Remove the solid backgrounds in this builder (`bg-surface`, `bg-surface-raised` on inputs, selects and badges) in favour of `glass-raised` or transparent with `border-line`.
   - If a needed variant is missing, add it to `globals.css` as a token and say so in the notes.
2. Lime stays the only action colour, with one primary action on the screen («حفظ الخطة», "Save plan"). "+ إضافة تمرين" (add exercise) is secondary, but visually strong (glass with a lime icon).
3. RTL logical properties only. Touch targets are at least `min-h-12`. Every icon-only button has a translated `aria-label`.
4. No behaviour change: the same draft operations, autosave, validation and activation. Do not touch `draft.ts`, `data/`, `hooks/`.
5. No new dependencies.

## Acceptance
- [ ] There are 2 columns at `lg`; no library column is visible until the captain presses "+ إضافة تمرين".
- [ ] The drawer opens from the left in Arabic, adds exercises, and closes with Escape, the backdrop or the close button; focus is managed.
- [ ] The labels read «حفظ الخطة», «حفظ كمسودة» and «+ إضافة يوم تدريبي».
- [ ] There are no `bg-surface` solids left in `src/features/programs/components`.
- [ ] `npm run check` and `npm run build` pass, and the perf budget test passes after the build.

## Out of scope
- The nutrition builder (another card is changing `src/features/meal-plans` right now; do not touch it).
- Any data, schema or saving change.
