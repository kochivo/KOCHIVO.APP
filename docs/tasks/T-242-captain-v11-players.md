# T-242 — Captain v11: players list

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/players` matches the mockup `players` screen exactly.

## Files
- `src/features/roster/v6/*`. New files are allowed.
- `src/features/roster/v6/messages.ts`
- tests in `src/features/roster/`

## Requirements
1. **Header:**
   - «اللاعبين» with the total count;
   - a lime «ضيف لاعب» button, which opens the existing invite or the join page.
2. **Tabs with real counts:**
   - الكل
   - محتاجينك: any open task
   - ماشيين تمام
   - جداد: joined in the last 7 days
   - بيخلص اشتراكهم: 7 days or less left
   - متوقفين: subscription ended or paused
3. **Desktop table** (`tbl`), with these columns:
   - اللاعب: avatar, name, goal, and the rank tag;
   - الأسبوع: 7 dots, where done is lime, missed is warn, and future is empty;
   - الوزن;
   - آخر RPE;
   - الاشتراك: days left, in the warn colour at 3 days or less;
   - الحالة: a pill with the most urgent status, for example «فيديو مستني», «غايب 5 أيام», «بيخلص بعد 3 أيام», «محتاج برنامج» or «ماشي تمام».

   Clicking a row opens the player file.
4. **Mobile:** player cards (`pcard`) with avatar, name, «<goal> · باقي <n> يوم», the week dots and the status pill.
5. Keep the join requests and the team crown link that are on this page today only if the mockup shows them. It does not, so move join requests to T-244, and keep the crown link reachable from the ranks page.
6. The empty state for each tab uses the mockup tone.

## Acceptance
- [ ] Desktop and 390px match the mockup `players`.
- [ ] There are tests for the tab filters, the status priority and the week dots.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- The player file (T-243).
