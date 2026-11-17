# T-361 — Home summary tells the truth; inbox shows dates

**Migration:** none.

**Source:** the owner's logged-in screen review on 2026-11-17 (`docs/tasks/SCREEN-REVIEW-2026-11-17.md`: L-4 and D-4). On 2026-11-17 the owner asked for every item to be fixed.

## Items
### L-4. The KO card on home
**Time of day**
- In the evening, the header says «مساء الخير» but the KO card is titled «KO · ملخص الصبح».
- The card title must follow the same time-of-day rule as the greeting: use the same helper, in the captain's timezone. A neutral «ملخص النهارده» is also fine.

**Team status**
- The card says «خلصت كل مهام النهارده. فريقك ماشي تمام» while weekly adherence is 13% and 0 of 3 players trained today.
- "No tasks left" must not claim the team is fine. Split the message:
  - tasks done → «خلصت مهام النهارده»;
  - team status comes from the real numbers (adherence or players trained today). If adherence is low, say so calmly and point to the players list.
- Put the choice in a pure function with tests for low, mid and high adherence.

### D-4. The inbox has no dates
- Messages from Nov 4, 13 and 14 show only times (10:51, 23:40, 22:28, 23:15), so they look out of order.
- Add day separators («النهارده», «امبارح», or the date) between messages from different days, in the captain's timezone. Use `localDate()` and the existing date helpers.
- Do the same in the conversation list if it shows only times for older threads.
- Strings go in ar, arStd and en.

## Out of scope
- Captain nav and shell (T-358).
- Roster and leaderboard (T-359).
- Billing (T-360), including the «0 جنيه مستني» money-owed card on home, which T-360 handles. Do not edit `src/features/captain-workspace/money-owed`.
- Settings, forms, templates, and meal plans (T-362).

## Done when
- The card title matches the time of day.
- The status message matches the numbers.
- The inbox shows day separators.
- Tests cover both rules.
- `npm run check` and `npm run build` pass.
