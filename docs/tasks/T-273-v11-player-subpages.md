# T-273 — v11 look for the captain's player sub-pages

**Phase:** captain v11 fixes · **Depends on:** T-272 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first.

## Goal
Every page under a player that is not the v11 player file tabs uses the v11 look. These pages still look old:
- `/captain/players/[playerId]/assessments`
- `/captain/players/[playerId]/chat`
- `/captain/players/[playerId]/checkins`
- `/captain/players/[playerId]/nutrition`
- `/captain/players/[playerId]/preview`
- `/captain/players/[playerId]/programs`

Each one should look like the closest v11 screen:
- chat looks like the inbox detail;
- check-ins look like the player file check-in tab;
- nutrition and programs look like the player file food and program tabs;
- preview keeps the phone frame on a v11 page.

## Files
- The components rendered by those routes (find them from each `page.tsx`), workspace path only. New files are allowed.
- Their messages and tests.

## Requirements
1. Same header bar pattern as the v11 pages: back, title, actions.
2. Use the T-272 primitives: `RowLink`, `Disclosure`, `EditInPlace`, and the sheet header and footer.
3. Keep every feature on these pages. Compare old against new and list anything that moved.
4. The program sub-page stays within its 315 KiB budget.

## Acceptance
- [ ] Each route matches the v11 look at desktop and 390px. Give a short note per route in the final message.
- [ ] No feature dropped.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Library editors, the generator and pending (T-274).
