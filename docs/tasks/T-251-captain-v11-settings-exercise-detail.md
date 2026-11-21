# T-251 — Captain v11: settings and exercise detail

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/settings` matches the mockup `settings` screen exactly, and the exercise detail matches `exDetail` exactly.

## Files
- `src/features/settings/components/*` (captain settings). New files are allowed.
- `src/features/settings/messages.ts`
- `src/features/captain-workspace/library/exercise-detail.tsx`, plus new files next to it
- `src/features/captain-workspace/messages.ts`
- tests next to them

## Requirements
1. **Settings** (`g2`), with four cards:
   - «صفحتك»:
     - a glass «شوفها» button;
     - a row with avatar, «كابتن <name>», the public link and «انسخ»;
     - «النبذة»;
     - «الصور والشهادات» with a count.
   - «طرق الدفع»: انستاباي، فودافون كاش، تحويل بنكي, each showing مفعّل or مش مفعّل from the captain's payment settings.
   - «اللغة والوقت»: the language and the time zone, with «(تلقائي)» when it is automatic.
   - «الإشعارات»: toggles for رسالة جديدة، فيديو أداء، دفعة جديدة، ملخص الصبح, using the existing notification preferences.
   - Keep the sign-out button and any other existing settings below these cards, so nothing is lost.
2. **Exercise detail.**
   - The bar: back, the Arabic and English names, and a glass «ضيفه لبرنامج» button.
   - Two columns:
     - Start column: the GIF, square, plus the captain's video link chip.
     - End column, three cards:
       - العضلات: the main muscle (with the target), the helper muscles, and the equipment;
       - طريقة الأداء: the numbered steps, with «عدّل» on the captain's own exercises;
       - البدائل: alternative chips and «+ بديل».
   - Keep the current loading behaviour (`dynamic()` import) so the library route stays within budget.
3. Report any toggle or field that has no stored setting. Do not fake it.

## Acceptance
- [ ] Both screens match the mockup at desktop and at 390px.
- [ ] There are tests for the payment-method states and the detail fields.
- [ ] `npm run check` and `npm run build` pass.
