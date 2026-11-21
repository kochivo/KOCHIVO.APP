# T-250 — Captain v11: notifications page

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
A page, `/captain/notifications`, that matches the mockup `notifs` screen exactly. The bell in the top bar opens it.

## Files
- `src/app/[locale]/(captain)/captain/notifications/page.tsx` (thin route), plus `loading.tsx` and `error.tsx`
- `src/features/notifications/components/*`. New files are allowed.
- `src/features/notifications/messages.ts`
- tests in `src/features/notifications/`

## Requirements
1. **Header:** «الإشعارات», with a glass «علّم الكل مقروء» button on desktop, which uses the existing mark-all-read.
2. **One card of rows.** Each row has:
   - an icon by kind: video, payment, join, form, trophy;
   - the text and the relative time;
   - a lime dot when unread, and the highlighted row style.
3. Each row opens its target:
   - a video or form goes to the tasks page (T-240);
   - a payment goes to billing;
   - a join goes to join requests (T-244);
   - a rank goes to the ranks page.
   Opening a row marks it read.
4. Show a clear empty state, and loading and error states.

## Acceptance
- [ ] Desktop and 390px match the mockup `notifs`.
- [ ] There are tests for the kind-to-icon and kind-to-target mapping.
- [ ] `npm run check` and `npm run build` pass.
