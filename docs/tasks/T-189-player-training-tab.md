# T-189: Player training tab (mockup v6, screen ١)

**Phase:** Captain workspace v6 (owner approval 2026-11-12: "نفس الشكل 100%") · **Depends on:** T-188 · **Status:** ready
**Migration:** none. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

## Goal
The owner could not add exercises to a player directly; he had to pick a template. Rebuild the player file's التمرين tab to look and work exactly like mockup screen ١.

Read first: `docs/mockups/captain-workspace/v6-owner-review.html` (screen ١) and `docs/mockups/captain-workspace/v6-spec.md`. Use the shell, `underline-tabs`, `fact-row` and `save-status` from T-188.

## Files
- `src/features/captain-workspace/training/` (new) for the tab UI, and the training tab slot in the T-188 shell.
- `src/features/programs/` data and state hooks (reuse the existing draft/save/activate logic; add what is missing for inline add/remove/reorder) and tests.
- `src/features/programs/messages.ts` (`ar`/`en` only).
- This card.

## Requirements
1. **Layout:** 300px sticky «بياناته» panel (fact rows: الهدف، الوزن، الطول · السن، الخبرة، أيام التمرين، وقت التمرينة، إصابات in warn colour when present، المكان) + main column. Stacks on small screens.
2. **Start choice** (only when the player has no program yet, or when starting a new one): two cards «ابدأ من الصفر — ضيف الأيام والتمارين بنفسك» and «من خطة جاهزة — اختار خطة من خططك وعدّل عليها». Templates are optional, never forced.
3. **Days** as pill chips («اليوم ١ · صدر وضهر» …) plus «+ يوم». Rename a day inline.
4. **Exercises** in one card, each row: drag handle, English exercise name + small «muscle · equipment», sets stepper (− n +), reps range, «راحة {n}ث», remove ×. Reorder by drag and by keyboard.
5. **Add inline:** a search row at the bottom «دوّر على تمرين وضيفه… (bench, ضهر, كابل)» searching the existing exercise library (Arabic or English), plus suggestion pills «مقترح لـ{day}:» based on the day's muscles. No separate page or modal needed to add.
6. **Saving:** autosave, quiet. Header shows `save-status` («محفوظ»). No toasts on save.
7. **One primary action:** «ابعت للاعب» in the header (activates/sends the program with the existing activation logic and validation). Validation errors show inline.
8. Mobile (≤760px): rows collapse to name + sets + remove (as in the mockup CSS).
9. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches mockup ١ at 1440×900 and 390×844 (differences listed).
- [ ] A captain can build a full program from scratch for a player without opening a template.
- [ ] Unit tests: add/remove/reorder, stepper bounds, suggestions per muscle, send validation.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.

## Out of scope
- The templates library page (only reuse its data for «من خطة جاهزة»).
- Database changes.
