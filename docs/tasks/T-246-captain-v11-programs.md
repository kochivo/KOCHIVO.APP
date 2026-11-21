# T-246 — Captain v11: training programs list

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/templates` matches the mockup `programs` screen exactly.

## Files
- `src/features/templates/components/*` (workspace path). New files are allowed.
- `src/features/templates/messages.ts`
- tests in `src/features/templates/`

## Requirements
1. **Header:** «برامج التمرين», with these buttons:
   - glass «اطلب من KO» on desktop, which opens the existing generator;
   - glass «برنامج للاعب», which picks a player and then opens the builder with that player's panel (T-236);
   - lime «برنامج جديد».
2. **Tabs with counts:**
   - برامجي: the captain's templates;
   - جاهزة من KOCHIVO: the built-in templates;
   - شغالة مع لاعبين: programs assigned to players.
3. **Cards** (`g3`, `tpl`):
   - the name, and a tag with how many players are on it;
   - the subtitle «<n> أيام · <weeks> أسبوع»;
   - the 7 day letters (س ح ن ث ر خ ج), with the training days lime;
   - a glass «عدّل» button and a glass «ادّيه للاعب» button.
4. **The last card** is a lime-text «برنامج جديد» card, with «من الصفر، من برنامج جاهز، أو KO يعمله».
5. «ادّيه للاعب» uses the existing assign flow.

## Acceptance
- [ ] Desktop and 390px match the mockup `programs`.
- [ ] There are tests for the tab filters and the day letters.
- [ ] `npm run check` and `npm run build` pass, and the route stays within 310 KiB.

## Out of scope
- The program builder (already done in T-236).
