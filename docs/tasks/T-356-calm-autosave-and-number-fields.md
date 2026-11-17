# T-356 — Calm auto-save and number fields captains can clear

**Migration:** none. Client side only.

**Source:** captain complaints sent to the owner on 2026-11-17. The owner approved this fix the same day.

## Problems (verified in code by the reviewer)
1. **Meal plan editor locks while it auto-saves.**
   - `use-editor-autosave.ts` calls `persist()` 800 ms after each edit.
   - `persist` sets `busy`, and `player-editor.tsx` disables the title input, the water target, the day chips, the meals `<fieldset>` and the food picker while `busy` is set.
   - On a phone this closes the keyboard and drops focus every time the captain pauses typing.
2. **The forms editor reloads the page after every auto-save.** `editor-session.tsx` calls `router.refresh()` inside the `onSaved` callback that every auto-save runs.
3. **Number fields cannot be cleared.** Many captain inputs clamp on every keystroke, for example:
   - `Math.max(1, … Number(v) || 1)`;
   - `Math.max(row.reps_min, … Number(v) || row.reps_min)`;
   - `Number(e.target.value)`, which turns "" into 0.

   Deleting the last digit jumps straight back to the minimum. Captains have to put the cursor in the middle of the number to change it, and cannot clear the field from either side.

## Fix
### A. Auto-save that does not get in the way
- **Never lock inputs during an auto-save.**
  - Meal plans: split the background save from the explicit actions. The auto-save must not set the `busy` flag that disables fields. Only the explicit Save / Send / Activate buttons (`persist(..., true)` or `activate`) may lock the editor.
  - Edits typed while a background save runs must stay, and must be saved in the next round. Keep the "latest wins" behavior.
- **Forms: no `router.refresh()` after each auto-save.**
  - Keep the URL `replaceState` for a new form.
  - Refresh the server data only when the editor closes or after an explicit save.
  - Check that the forms list still shows the new or renamed form after the editor closes.
- **Save after a 1.5 s pause, or when the focus leaves a field.** Use one shared delay constant of 1500 ms for all three editors: training (`use-training-autosave.ts`), meal plans and forms. Also flush when a field loses focus (`blur` / `focusout` on the editor root), so a captain who taps away does not wait.
- **A small status line in each editor:** «بيحفظ…» / «اتحفظ» / «محفظناش، جرّب تاني».
  - Training and forms already have one. Add the same quiet status to the meal plan editors (v11 template editor and player editor) if they lack it.
  - Strings go in ar, arStd and en.
- Keep the existing `beforeunload` warnings and the flush on unmount.

### B. Number fields captains can clear
- Add one shared component, `src/ui/number-input.tsx`, for plain number entry.
  - Keep the typed text in local state, and allow an empty field and partial input such as "1" or "1." while typing.
  - Parse with `parseTypedNumber` from `src/ui/typed-number.ts`, so Arabic digits work.
  - Clamp to `min`/`max` and call `onCommit(value)` only on blur or Enter. An empty or invalid field on blur goes back to the last valid value, or to `null` when the caller allows empty.
  - Use `type="text"`, `inputMode="numeric"` or `"decimal"`, and `dir="ltr"`, so the caret behaves the same in Arabic pages.
  - Select all on focus, so one tap and typing replaces the value.
  - Re-sync the text when the outside value changes while the field is not focused.
- Replace the clamp-on-every-keystroke inputs in the captain editors with it:
  - training: `exercise-fields.tsx`, `set-plan-editor.tsx`, `warmup-row.tsx`;
  - meal plans: `food-row.tsx`, `v11-food-row.tsx`, `meal-targets.tsx`, `target-calculator.tsx`, `targets-bar.tsx`, `food-picker.tsx`, `food-units-editor.tsx`, and the library `food-units.tsx`, `food-facts.tsx`, `add-to-plan.tsx`, `recipe-builder.tsx`;
  - forms: `assessment-fields.tsx`.
- Then search `src/features/{captain-workspace,programs,meal-plans,forms}` for any remaining `type="number"` input that clamps or coerces on change, and convert it too. List every converted file in the final message.
- Do not change player-side inputs (the workout logger has its own `workout-value.tsx`).

## Files (expected)
- `src/ui/number-input.tsx` (new) plus its test, exported where `src/ui` exports similar fields.
- `src/features/meal-plans/hooks/use-editor-autosave.ts`, `use-plan-draft.ts`, `components/editor/player-editor.tsx`, `components/v11-editor.tsx`, and the number inputs listed above.
- `src/features/forms/components/editor-session.tsx`, `forms-library-entry.tsx` (refresh on close), `hooks/autosave.ts`, `components/assessment-fields.tsx`.
- `src/features/programs/hooks/use-training-autosave.ts` (delay and blur flush only).
- `src/features/captain-workspace/training/*` for the number inputs.
- The messages files for any new status strings.

## Out of scope
- No migrations, no player screens, no billing, no landing.
- Do not change what gets saved or the save APIs (`saveProgram`, `saveForm`, the meal plan save). Only change when saves run and what the UI locks.
- Do not touch `package.json`.

## Tests
- `createAutosave` and the meal plan auto-save:
  - one save after 1500 ms of quiet;
  - a save on blur;
  - typing during a save is kept and saved after it;
  - fields are not disabled during a background save;
  - explicit Send still locks.
- Forms: `router.refresh` is not called by an auto-save, and is called on close.
- `number-input`:
  - clearing the field and typing "12" commits 12;
  - deleting the last digit from either side does not snap back while typing;
  - blur on empty restores the last value (or `null` when allowed);
  - Arabic digits «١٢» commit 12;
  - min/max are clamped on blur.
- Update existing tests that expected the old delays or the old disabled state. Do not delete coverage.

## Rules
- **Verify first:** re-check each problem in the code before fixing it. If one is not real, skip it and say why.
- **UI:** tokens only, logical properties, touch targets 48px or more, files 250 lines or fewer, every string in ar, arStd and en, no emoji.
- **Gates:** run `npm run check` and `npm run build`. Both must pass. Do not commit.
