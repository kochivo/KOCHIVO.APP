# T-360 — Billing shows every player and the real paid amount

**Migration:** none expected. If one is truly needed, stop and explain.

**Source:** the owner's logged-in screen review on 2026-11-17 (`docs/tasks/SCREEN-REVIEW-2026-11-17.md`: L-6, L-7, C-6, D-7, D-1, D-2, and «لحد 5 لاعب» from C-2). On 2026-11-17 the owner asked for every item to be fixed.

## Already checked by the reviewer
L-5 («دخل الشهر» 1,300) is **correct**. On the live data:
- Alyy paid 300 (Nov 4).
- Youssef paid 500 (Nov 16).
- Youssef renewed on Nov 17 with price 500 and amount 0, and a collection of 500 was recorded one minute later. 300 + 500 + 500 = 1,300.

Do not change `summarizeRevenue`.

## Items
### L-7. The row ignores money collected after the renewal
- After that renewal, Youssef's row still shows amount «0», «InstaPay», and «تجديد من غير دفعة», even though the 500 was collected in full.
- The row must show what was paid for the current period: the payment amount plus collections against it. The status must follow that total (fully paid, partly paid, or not paid).
- Use one wording for "no money recorded": pick «من غير مبلغ» or similar, and never show «0» in one row and words in another.
- Do not show a payment method when nothing was paid.

### L-6. A player with an active subscription is missing from «كل الدفعات»
- Hesham has an active subscription (17 days left) and **no payment row**, so the table has 2 players while there are 3 active subscriptions.
- Every active player must appear, with a clear «مفيش دفعة متسجلة» state and the normal action to record a payment.

### D-7. Two empty states at once
- «المبالغ المستنية» shows a card «0 جنيه مستني من 0 لاعبين» **and** the text «مفيش مبالغ مستنية».
- When nothing is pending, show only the empty text.

### C-6. Page title and menu label disagree
- The page title says «الدفعات», but the menu says «الاشتراكات والدفعات», and the menu item wraps onto two lines.
- Use one short name in both places, for example «الاشتراكات», in ar, arStd and en.
- The nav label lives in the roster nav messages. Change **only that string**; do not touch the nav components (T-358 owns them).

### C-2 (billing part)
- «لحد 5 لاعب» must read «لحد 5 لاعبين»: use correct Arabic number grammar for plan limits.

### D-1. The renew button on the player's captain screen
- On the player's captain screen («جدد باقتك»), the button text is almost invisible, so it looks disabled.
- Give it the normal primary or secondary button style with readable contrast.

### D-2. The KO bubble covers buttons
- The floating KO «قريبًا» bubble and the report button sit over «ابعت إيصال الدفع» on the player captain screen, and over the bottom of the captain sidebar.
- Reserve bottom space (padding equal to the floating stack height) on the screens where they float, or move the floats, so no button is covered.
- Check at 390px and at desktop width.

## Out of scope
- Roster list and leaderboard (T-359), captain nav components (T-358), home and inbox (T-361), and settings, forms, templates, and meal plans (T-362).

## Done when
- Every active player shows in the payments table.
- Rows show paid totals including collections.
- One empty state.
- Names match between title and menu.
- Buttons are readable and not covered.
- Tests cover the row-total and status logic.
- `npm run check` and `npm run build` pass.
