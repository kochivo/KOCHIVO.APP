# T-187: Quick fixes from the owner's Preview review

**Phase:** Captain workspace polish (owner review 2026-11-12) · **Depends on:** T-182, T-184 landed · **Status:** ready
**Migration:** none.

## Goal
The owner tested the captain workspace on Preview and found noise and confusing labels. This card fixes the clear, small problems. The training editor and the nutrition plan editor get a full redesign in a later card (T-188, mockup first). Do not redesign them here.

## Files
- `src/features/player-home/` (`next-task.ts`, messages, tests, and the home card that renders the task).
- `src/features/roster/nav.ts`, `src/features/roster/messages.ts`, `src/features/roster/components/captain-nav.tsx` and nav tests.
- Messages only, for renames: `src/features/forms/messages.ts`, `src/features/captain-workspace/messages.ts`, `src/features/captain-workspace/forms/messages.ts`, `src/features/meal-plans/components/library/messages.ts`, `src/features/meal-plans/components/editor/messages.ts`, `src/features/ko-preview/messages.ts`, `src/features/programs/messages.ts`.
- `src/features/meal-plans/components/editor-entry.tsx` and the adherence block of the meal plan editor.
- `src/features/meal-plans/components/library/` (food row).
- `src/features/programs/components/program-builder.tsx`.
- The player file header that shows «عرض بس» (`src/features/captain-workspace/components/`).
- This card.

## Requirements
1. **New player sees a check-in task before anything exists (production bug, not behind the flag).**
   - In `playerNextTask`, the `checkin` task only appears when the player has a program snapshot **and** at least one completed workout session or completed meal log in the last 7 days. Otherwise, when there is no program and no meals, return a new kind `waiting`.
   - `waiting` renders «الكابتن بيجهزلك برنامجك» with a short line «هنبعتلك إشعار أول ما يبقى جاهز» and no primary button (no fake action). English: "Your captain is preparing your plan" / "We'll notify you when it's ready".
   - Keep every existing case unchanged. Add unit tests: brand-new player after intake → `waiting`; player with program but no sessions yet → `start` (unchanged); check-in only after real activity.
2. **"Saved" noise.** Saving must be quiet.
   - `program-builder.tsx`: remove the success toast on plain save. Keep error messages and the activation toast.
   - Meal plan editor (`editor-entry.tsx`): replace the always-visible «اتحفظ» paragraph with a small status that is **empty when saved**, shows «بيتحفظ…» while saving and shows the error with retry when it fails. Keep `role="status"`.
   - Do the same in any other workspace screen under the flag that writes «اتحفظ» after every change (grep for `t('saved')` in captain-workspace, forms, meal-plans). Settings forms stay as they are.
3. **Names and nav sections (flag on only; flag off stays byte-identical, with a test).**
   - Nav groups, in this order: الرئيسية، اللاعبين، المهام، then a heading **التمارين** with «خطط التمارين» (`/captain/templates`), then a heading **الأكل** with «الأنظمة الغذائية» (the existing meal plan templates route if one exists; otherwise omit this link and note it) and «مكتبة الأكلات» (`/captain/library/foods`), then a heading **المتابعة** with «التقييمات» (`/captain/library/forms`), then الدفعات، الإعدادات.
   - Replace every user-visible «فورم/فورمز/الفورمز» under the flag with «التقييمات» (plural/list) or «تقييم» (one form), e.g. «تقييم جديد», «مفيش تقييمات لسه». English: "Assessments" / "Assessment" (owner decision 2026-11-12). Code identifiers and routes stay `forms`.
   - Rename «البرامج» to «التمارين» in captain-facing labels under the flag (nav, ko-preview labels, player file tab already says التمرين).
   - The library page tabs («مكتبة الأكلات / الفورمز») follow the new names.
   - Mobile nav keeps four destinations: الرئيسية، اللاعبين، التمارين، الأكل.
4. **Ugly details.**
   - Meal plan editor adherence: replace the list of `2026-11-07: 0 / 0` chips with a 7-day strip: short weekday name in the viewer's locale and timezone, and a dot (lime = all meals done, muted = partial, empty = none). No ISO dates on screen. Empty state when the plan was never sent: «لسه مبعتش النظام للاعب».
   - Food library: hide the units column value when a food has no units (empty cell, no «مفيش وحدات»). Keep the column header.
   - Player file header: replace «عرض بس» with a clear toggle label «وضع العرض» / «وضع التعديل», or remove it if it has no effect; explain which in Notes.
5. Do **not** add or edit `arStd` strings: two other tasks (T-185, T-186) are translating the same files in parallel. Change only `ar` and `en`. The reviewer reconciles standard Arabic after both land. If the coverage test fails only because of your new keys, list them in Notes.

## Acceptance
- [x] Unit tests for the player next-task rules above.
- [x] Nav tests: flag on (new groups and names) and flag off (byte-identical).
- [x] No «فورم» left in captain UI assessment strings under the flag (test or grep in Notes).
- [x] No success toast on plain program save; meal plan editor shows nothing while saved.
- [ ] All gates pass; route budgets unchanged.

## Out of scope
- Redesign of the player training tab and the nutrition plan editor (T-188).
- Database changes.

## Implementation notes for reviewer
- Reviewed and retained the previous agent's partial implementation. Added rendered waiting-card, save-status and food-unit tests, stronger legacy navigation assertions, and semantic navigation headings.
- Reviewed screens ٣ (navigation/names) and ٤ (new player) in the now-available `v6-owner-review.html`.
- No standalone meal-plan templates route exists, so the optional food-plan navigation link is omitted.
- Removed the player header's read-only badge because it had no effect or toggle behavior.
- With the reviewer's scope extension, renamed assessment strings in `src/features/forms/requests/messages.ts` and `src/features/meal-plans/components/calculator/messages.ts`, removed the shared hook's plain-save toast, and updated the five old-label assertions without weakening their checks.
- The plain-save hook regression test failed before the fix and passed afterward. Activation still asserts the exact translated confirmation; error checks remain intact.
- Remaining `فورم` occurrences in inbox/workout messages refer to exercise technique and videos, not assessment questionnaires, and retain that meaning.
- No standard Arabic dictionary, getter, dependency, migration, database, or route budget was changed.

## Verification in this worktree
- `npx tsc --noEmit -p .`: passed. `npx eslint .`: passed.
- `npm run check`: typecheck and lint passed; stopped at release audit with `spawnSync git EPERM`.
- `npm run audit:release`: blocked by `spawnSync git EPERM`. Fallback: piped `git ls-files` into Node and invoked the same `scanFile` / `scanRoutes` rules: `Release audit: 2114 tracked files, 0 findings`.
- Default `npx vitest run` and default budget test: config loading failed with `spawn EPERM`. Used `--maxWorkers=2 --configLoader native --pool=threads` instead.
- Full fallback suite after reviewer follow-up: `Test Files 1 failed | 554 passed (555)`; `Tests 1 failed | 3728 passed (3729)`. The only failure is `src/lib/perf-budget.test.ts`, which references missing `.next/static/chunks/34c8__-uasntr.js` from incomplete/stale build artifacts. All five updated label assertions pass.
- Reviewer follow-up gates: `npx tsc --noEmit -p .` and `npx eslint .` both passed (exit 0). The hook plus updated assertion suites passed: `Tests 22 passed (22)`; request/calculator suites passed: `Tests 64 passed (64)`.
- Scoped final fallback suite: `Test Files 26 passed (26)`; `Tests 109 passed (109)`. Translation coverage: `Tests 58 passed (58)`.
- `npm run build`: `Compiled successfully in 31.9s`, then `spawn EPERM` starting the TypeScript worker. Standalone TypeScript check passed; no build configuration was changed to bypass validation.
- Standalone fallback budget test: `1 failed`, missing `.next/static/chunks/34c8__-uasntr.js` from incomplete/stale build artifacts. Requires a completed build before budget validation.
- Assessment message grep: zero `فورم` matches; only exercise-technique references remain in inbox/workout messages. `git diff --check`: passed.
