# T-277 — Assessment editor redesign: settings summary on top, questions edited in place

**Phase:** captain v11 fixes · **Depends on:** T-271 (name, templates, summary line), T-272 (primitives) · **Status:** ready
Approved look: `docs/mockups/captain-workspace/v13-editors.html`, section two (owner approved 2026-11-14). Read `docs/tasks/V11-FIDELITY.md` first, including "Clickable things must look clickable".

## Goal
The owner found the editor messy. The order today is list, then add, then settings, then the question editor far below. The fix: settings in one line at the top, each question opening in place, and «ضيف سؤال» under the last question.

Match the mockup 1:1.

## Files
- `src/features/forms/components/v11-form-builder.tsx`
- `src/features/forms/components/v11-form-settings.tsx`
- `src/features/forms/components/v11-question-preview.tsx`
- New files in `src/features/forms/components/` as needed, for example a question card and a settings sheet.
- Forms messages and tests.

No database change.

## Requirements
1. **Top bar:**
   - back;
   - the assessment name, edited in place (`EditInPlace`);
   - the question count with correct plurals (`question-count.ts` from T-271);
   - «احفظ» as the one lime action.
2. **Settings line** (from T-271): one line saying when and to whom the assessment is sent, plus its reminder. A «عدّل» button opens the full settings in a v11 sheet (`ResponsiveDialog` with `title` and `footer`). Keep every setting that exists today.
3. **Question cards:**
   - Closed, a card shows a drag grip, a type icon, «N. السؤال», the type plus required, and a chevron.
   - Pressing a card opens it in place. Only one card is open at a time.
   - An open card shows:
     - the question text field;
     - the answer type as a segmented row («رقم», «كتابة», «اختيار», «تقييم», «صور»; keep every type that exists today, including multi and yes/no);
     - for choice types, the choices as chips plus a dashed «+ اختيار»;
     - the required toggle;
     - a delete icon with a translated aria-label.
   - Use `aria-expanded` on the card button.
4. **Reorder:** keep the reorder that exists today, and make it work by keyboard too (move up/down).
5. **«ضيف سؤال»** is a card under the last question, with one button per answer type. Pressing one adds that question at the end and opens it.
6. **Phone preview** («زي ما اللاعب هيشوفه») stays at the side on desktop and shows the open question. On 390px it moves under the list, or behind a «شوف زي اللاعب» button. Pick the simpler one and say which.
7. Saving, validation and templates keep working exactly as today. Opening `?template=<key>` loads the template into this editor.

## Acceptance
- [ ] Settings are no longer a long block on the page. The summary line and its sheet hold all of them.
- [ ] Questions open and edit in place, one at a time (test: `aria-expanded`, a single open card).
- [ ] Adding a question from the bottom card appends it and opens it.
- [ ] Every clickable part has a visible cue, `cursor-pointer`, a focus ring and a pressed state.
- [ ] Desktop and 390px match the mockup.
- [ ] No existing feature dropped. List anything that moved.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Answer scale 5 or 10 (T-269).
- Notifications for answered assessments (T-262).
- The player's answering screen.
