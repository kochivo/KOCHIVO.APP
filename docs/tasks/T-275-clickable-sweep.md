# T-275 — Clickable sweep across the v11 main screens

**Phase:** captain v11 fixes · **Depends on:** T-272 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first, including the "Clickable things" section.

## Goal
Anywhere in the captain workspace, the captain can tell at a glance what can be clicked. These problems were seen on 2026-11-14:

**Meal plan editor**
- «◂ الأهداف والإجمالي» looks like plain text.
- «ضيف أكلة» looks like a grey line.
- The meal name does not look editable.

**Form editor**
- «◂ تعديل» is faint.
- The settings rows look like plain information.
- The question rows have no cue that they open.

## Files
- The v11 workspace components in:
  - `src/features/captain-workspace/`
  - `src/features/meal-plans/`
  - `src/features/forms/`
  - `src/features/billing/`
  - `src/features/inbox/`
  - `src/features/rank-review/`
  - `src/features/settings/`
- Their tests.

## Requirements
1. Walk every main v11 screen:
   - home, tasks, inbox, players and the player file;
   - join, ranks, billing;
   - programs and the program editor;
   - exercises and the exercise detail;
   - plans and the plan editor;
   - foods, forms and the form editor;
   - notifications and settings.
2. List every element that reacts to a click or tap: `onClick`, `Link`, `summary`, editable fields.
3. Apply the rule from `V11-FIDELITY.md`, using the T-272 primitives.
4. Find plain text styled like a link and fix it.
5. The final message includes a table with these columns: screen, element, before, after.
6. Do not change layouts or features. Only the clickable cues.

## Acceptance
- [ ] Every interactive element has a visible cue, `cursor-pointer`, a focus ring and a pressed state.
- [ ] A test asserts the chevron and expanded state for disclosures on the meal plan and form editors.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The meal plan editor (T-276) and the assessment editor (T-277). Those cards redo both screens.
