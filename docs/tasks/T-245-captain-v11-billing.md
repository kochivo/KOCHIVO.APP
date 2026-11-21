# T-245 — Captain v11: subscriptions, payments and packages

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/billing` matches the mockup `billing` screen, and `/captain/billing/packages` matches the `packages` screen, exactly.

## Files
- `src/features/billing/components/*` (workspace path). New files are allowed.
- `src/features/billing/messages.ts`
- tests in `src/features/billing/`

## Requirements
1. **Billing header:** «الاشتراكات والدفعات», with a glass «الباقات والعروض» button.
2. **Four ring tiles:**
   - دخل الشهر: confirmed this month;
   - مستني تأكيد;
   - بيخلص الأسبوع ده;
   - اشتراك شغال.
3. **Two cards** (`g2`):
   - «مستني تأكيد», with a count. Each row shows the method, amount and package, a glass «إيصال» button that opens the receipt, and a lime «أكد» button that confirms with the existing mutation and toasts «اتأكدت دفعة <name> واتجدد اشتراكه».
   - «بيخلص قريب», with a count. Each row shows «بعد <n> يوم» and a «فكّره» button, which sends the existing renewal reminder.
4. **«كل الدفعات» table:** player, amount, method, date and a status pill. Method and date are hidden on mobile.
5. **Packages page:**
   - A back icon button, «الباقات والعروض», and a lime «باقة جديدة» button.
   - Tier cards (`g3`):
     - name and subtitle;
     - feature lines with lime checks;
     - the price rows for each duration;
     - «عدّل».
     - The featured tier gets the «مميزة» pill and the featured glass.
   - An «العروض» card: offer rows with a «%» or «+» avatar, the description, a «شغال» pill, and a «+ عرض جديد» link.
6. Keep the existing editors, opened from these buttons.

## Acceptance
- [ ] Both screens match the mockup at desktop and at 390px.
- [ ] There are tests for the tile numbers and the expiring-soon window.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Payment rules and receipts storage.
