# T-274 — v11 look for the library editors, the generator, pending and packages

**Phase:** captain v11 fixes · **Depends on:** T-272 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first.

## Goal
These captain routes still use the old look, and should move to v11:

| Route | Closest v11 screen |
|---|---|
| `/captain/library/exercises/new` and `/[exerciseId]/edit` | the mockup `exNew` screen |
| `/captain/library/foods/new` and `/[foodId]/edit` | the mockup `foodNew` screen |
| `/captain/templates` | the program generator page and its sheet content (the sheet shell comes from T-272) |
| `/captain/pending` | — |
| `/captain/billing/packages` | the mockup `packages` screen |

## Files
- The components rendered by those routes, workspace path only. New files are allowed.
- Their messages and tests.

## Requirements
1. Match `exNew`, `foodNew` and `packages` 1:1 where the mockup has them, including the "كده هيظهر للاعب" preview cards.
2. Other pages follow the v11 header bar and card patterns.
3. Use the T-272 primitives.
4. Keep every feature, and list anything that moved.

## Acceptance
- [ ] Each route matches the v11 look at desktop and 390px.
- [ ] No feature dropped.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Player sub-pages (T-273).
