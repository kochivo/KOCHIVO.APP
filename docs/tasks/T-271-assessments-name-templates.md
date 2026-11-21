# T-271 — Assessments: name back to «التقييمات», ready templates back, tidy editor settings

**Phase:** captain v11 fixes · **Depends on:** T-248 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first, including the new "Clickable things" section.

## Goal
Owner review on 2026-11-14 found three problems in the captain forms area. This card fixes all three:
1. The area is called «الفورمات», but the captain knows it as «التقييمات».
2. The v11 library dropped the ready templates. The old library offered seven:
   - checkin
   - onboarding
   - progress
   - injury
   - update
   - photos
   - feedback

   The v11 «تقييم جديد» card says «ابدأ من قالب أو من الصفر», but it only links to `?template=custom`. That broke the "drop no feature" rule.
3. The editor settings read «يدوي» three times and the counts read «1 أسئلة».

## Files
- `src/features/roster/components/captain-frame-messages.ts`: sidebar label (ar, arStd, en).
- `src/features/forms/messages.ts`, `src/features/forms/redesign/messages.ts`, `src/features/forms/standard/messages.ts`: the title, «تقييم جديد» and the button labels.
- `src/features/forms/components/v11-library-list.tsx`, `forms-library-page.tsx`, and new files as needed: the templates.
- The v11 form editor components under `src/features/forms/components/`: the settings summary and plural counts.
- The command palette or search labels, if they list «الفورمات».
- Tests in `src/features/forms/` and the frame tests.

## Requirements
1. **The name.** Every captain-facing «الفورمات»/«فورم» becomes «التقييمات»/«تقييم», in the Egyptian and standard Arabic copy. English: «Assessments»/«New assessment». The route paths stay the same.
2. **Templates.** «تقييم جديد» opens a chooser:
   - one glass card per template, each with its name, a one-line description, its question count and its schedule;
   - a «من الصفر» card at the end.

   Use the existing `templates.ts` entries, `template-copy` and the `?template=<key>` flow. Nothing new in the database.
3. **Editor settings.** Replace the three «يدوي» rows with one plain summary line, then an «عدّل» button (a real button, not a «◂» glyph). Examples:
   - «بتبعته بإيدك لأي لاعب»
   - «بيتبعت كل جمعة 9 الصبح لكل اللاعبين»
4. **Counts.** Use proper Arabic plurals: «سؤال واحد», «سؤالين», «3 أسئلة», «11 سؤال». There is already a helper from commit 2b246460, so reuse it.
5. **Type labels.** Use one label per question type everywhere: «كتابة», not «كلام».

## Acceptance
- [ ] The sidebar, the page title and the new button read «التقييمات»/«تقييم جديد».
- [ ] All 7 templates can be picked and open pre-filled.
- [ ] The settings show one clear summary line and a visible edit button.
- [ ] Tests cover the plurals, the template list (7 plus «من الصفر») and the labels.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Redesigning the question editor layout. That waits for the owner-approved mockup (later card).
