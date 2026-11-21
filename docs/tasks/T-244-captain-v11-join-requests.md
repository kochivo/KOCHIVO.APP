# T-244 — Captain v11: join requests page

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
A page, `/captain/join`, that matches the mockup `join` screen exactly. It replaces the join-request blocks on home and players.

## Files
- `src/app/[locale]/(captain)/captain/join/page.tsx` (thin route), plus `loading.tsx` and `error.tsx`
- `src/features/coach-page/components/*` (join requests). New files are allowed.
- `src/features/coach-page/messages.ts`
- tests in `src/features/coach-page/`

## Requirements
1. **Header:** «طلبات الانضمام», plus a glass «انسخ لينك الانضمام» button on desktop, which copies the existing coach link.
2. **Cards** (`g2`), one per pending request:
   - avatar, name, «بعت الطلب <relative time>», and a «جديد» pill;
   - key-value rows: الهدف، الجسم (weight · height)، أيام التمرين، مكان التمرين, taken from the request and intake data;
   - a lime «اقبل» button that fills the row, and a glass «ارفض» button.
3. Accept and reject use the existing mutations.
   - On accept, show the toast «اتقبل <name> وبعتناله رسالة ترحيب» and remove the card.
4. Show a clear empty state when there are no requests.
5. Remove the join-request blocks from home and players in the workspace path (T-239 and T-242 point here).

## Acceptance
- [ ] Desktop and 390px match the mockup `join`.
- [ ] There are tests for the card fields and the empty state.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The public signup flow.
