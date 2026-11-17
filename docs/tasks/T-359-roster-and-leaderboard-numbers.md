# T-359 — Players list and leaderboard show the right numbers

**Migration:** if SQL must change, use `supabase/migrations/0152_leaderboard_counts.sql`. It is additive only; do not apply it.

**Source:** the owner's logged-in screen review on 2026-11-17 (`docs/tasks/SCREEN-REVIEW-2026-11-17.md`: L-1, L-2, L-3, L-9, and the roster part of C-2). On 2026-11-17 the owner asked for every item to be fixed.

## Items
### L-1. The players list shows the starting weight
- `src/features/roster/data/v6-roster.ts` `loadRosterExtras()` reads `player_intake.weight_kg`, which is the weight at sign-up.
- The player file shows the latest weight (Youssef: list 75, file 66, −9).
- The list must show the same **latest** weight the player file uses: find that source (check-ins or body measurements) and reuse it. Fall back to the intake weight only when there is no later reading.

### L-2. The filters do not match the rows
- Two players show «غايب 13 أيام», yet «محتاجينك» shows 0.
- The chips «ماشيين تمام 1» and «جداد 1» do not add up to «الكل 3». Hesham (active subscription, no payment, not new) is in no group.
- Fix the bucket rules:
  - a player who has been absent long enough to show the «غايب» badge counts in «محتاجينك»;
  - every player falls into exactly one bucket, so the chips add up to «الكل».
- Put the rules in one pure function with unit tests.

### L-3. The leaderboard workout count disagrees with the rest of the app
- Youssef has 2 workouts this week («2 من 7», «آخر RPE 3») in the player file, and the team chart shows workouts on Sunday and Monday.
- The leaderboard shows «0 تمرين · 5 نقطة» for him.
- Find what the leaderboard counts (period, table, and status filter). Make it count the same finished workouts the player file counts for the same period.
- If the cause is in SQL, use migration 0152 (`create or replace`; patch long functions with the `pg_get_functiondef` + `replace()` + drift-check pattern of 0139/0141/0144).

### L-9. The podium ranks players with nothing
- Players with 0 workouts and 0 points stand 2nd and 3rd on the podium.
- Only players with points above 0 go on the podium. The rest are listed below without a rank number, or with a calm «لسه» state; use whatever empty-state pattern the leaderboard already has.
- The «الشهر اللي جاي» button is unclear: say in the notes what it does and give it a clearer label in ar, arStd and en.

### C-2 (roster part). Number grammar
- «13 أيام» must read «13 يوم»; Arabic uses the singular after 11 and above.
- Use or extend the existing Arabic plural helper (search for one in `src/lib` or `src/core/i18n` before writing a new one) for the roster and leaderboard strings.

## Out of scope
- Captain nav, shell, or layout files (`captain-nav-groups.tsx`, `captain-frame-nav-view.tsx`, `captain-shell*`), which belong to T-358.
- Billing, home, inbox, settings, forms, templates, and meal plans, which belong to other cards in parallel.

## Done when
- The list weight matches the player file.
- The chips add up to «الكل» and the «غايب» players count in «محتاجينك».
- The leaderboard counts match the player file.
- Nobody with 0 points is on the podium.
- Tests cover each rule.
- `npm run check` and `npm run build` pass.
