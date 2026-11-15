# T-299: captain editors break on a phone (warm-up, meal, assessment preview, floating buttons, status bar)

## Problem
The owner sent 4 screenshots from an iPhone, installed app, English UI, about 390px wide. They are in `docs/tasks/T-299-shots/`; open each one before starting.

1. **`1-warmup.png`: the warm-up item row in the program builder is broken.** File: `src/features/captain-workspace/training/warmup-block.tsx`.
   - The drag handle is a huge full-width button.
   - The name ("Easy bike") and note inputs are squeezed into a narrow column.
   - The up and down buttons are tiny arrows in big boxes.
   - The remove (X) button takes a whole row.
   - Below that, the add row is crowded: the "Warm-up" input is cut off, and the "+ Warm-up" button and the "From my exercises" select are squeezed together.
2. **`2-meal.png`: the meal card header in the nutrition editor is broken.** The editor is `src/features/meal-plans/components/editor/...`; find the meal card component.
   - Row 1 holds a pencil, a kcal box, a time pill, "..." and a chevron. Then a lone chevron-down button sits on its own row.
   - The meal name is not visible in the header at all.
   - The food row macros "P 1.1 · C 22.8 · F 0.3" wrap over 3 lines next to the grams input.
   - Expected: one clean header with the meal name, the time and the kcal summary, one menu button and one expand control. Food rows read name, then macros on one line, then the amount and unit, then kcal, then remove.
   - Also, a new meal's time defaults to the current clock time ("12:19 PM"). Check what the existing code intends. If no time was chosen it should show "no time" or empty, not "now". Fix it only if that is clearly a bug, and note the decision.
3. **`3-form-preview.png`: the assessment "As the player sees it" preview.** The number answer box is a thin sliver on the end side, and the "kg" unit sits outside the card edge.
   - Expected: a full-width number input with the unit inside or next to it, inside the card.
   - There is also a large empty gap above "Next".
   - The file is in `src/features/forms/components/` (the builder preview).
4. **`4-form-editor.png` and all screenshots: the floating KO button ("Soon" bubble) and the feedback button cover content.**
   - The KO button sits over "Question settings" and the feedback button sits over the delete (trash) button.
   - Add enough end-of-page padding (`padding-block-end`) to the captain workspace content so the last controls can scroll clear of the floating buttons and the bottom nav. Also make sure the floating buttons never cover a control that can't be scrolled out from under them.
   - Use a shared token or variable; don't add per-screen hacks.
   - Find where those floating buttons are mounted: grep `FeedbackButton` and the KO launcher in the captain shell.
5. **Status bar overlap, in screenshots 1–3.** In the installed app, page content scrolls under the iOS status bar (the clock and battery overlap "Warm-up / Duration" and the macro tiles).
   - Give the captain shell a solid or glass backdrop strip of height `var(--safe-top)` fixed at the top, or the same treatment the player shell uses if it already solves this. Check `src/app/globals.css` for `--safe-top`.
6. **The assessment title input** ("Weekly as" in screenshot 4) is cut off.
   - Let it take the free width; on a phone the question count can drop below it or shrink.

## Rules
- Phone first: the result must work at 360, 390 and 430px with no horizontal scroll.
- Keep the v11 look (glass, tokens). The T-278 spacing tokens, the T-275 click cues, logical properties only, touch targets of at least 48px, and no hex values.
- Strings go in the messages files (ar, arStd, en) when one is needed.

## Files
- The components above.
- The captain shell, or wherever its floating buttons are mounted.
- Shared CSS only if needed.
- Tests: source or render tests for the new structure. For example: the warm-up row uses a single-row grid with a compact handle; the meal header renders the meal name; the preview number input keeps its unit inside the card; the captain content has the bottom padding variable.

## Out of scope
SQL, the player screens, the landing, and other findings. Note anything else broken that you notice under Notes for reviewer.

## Gates
1. `npx vitest run src/features/captain-workspace src/features/meal-plans src/features/forms src/features/programs src/ui`
2. `npm run typecheck`
3. `npm run lint`
