# T-255 — Money owed: who still owes, how much, since when

**Phase:** data gaps · **Depends on:** T-253 (pending receipts) · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 3.

## Goal
The captain sees the total owed and a list of the players who owe it, on the home page, the billing page and in the player file.

A player owes money when any of these is true:
- their subscription ended and was not renewed;
- a pending renewal request is waiting;
- a receipt is waiting for review.

The amount comes from the package price of their current or requested package. A payment with a partial collection (`payment_collections`) owes the rest.

## Files
- `supabase/migrations/<next>_money_owed.sql`:
  - captain-only RPC `captain_money_owed()`. It returns one row per player with:
    - `player_id`
    - `amount_egp`
    - `reason` (`expired|renewal_pending|receipt_pending|partial`)
    - `since date`
  - This is a read-only function, so there are no new tables.
- `supabase/tests/money-owed.test.ts`: each reason, a partial payment, and a captain seeing only their own players.
- `src/features/billing/data/`: a server loader exported via `billing/server.ts`.
- `src/features/captain-workspace/`:
  - home stat «جنيه مستني من N لاعبين», which links to billing;
  - billing list with pills «متأخر», «مستني» and «قريب»;
  - one line in the player file.

## Requirements
1. Never guess an amount. If a player has no package price, show the row without an amount and mark it «من غير سعر».
2. Days late are counted with `localDate()` in the captain's timezone.
3. «قريب» means the subscription ends within 3 days. It is shown but not counted in the total.

## Acceptance
- [ ] The total equals the sum of the rows from the RPC.
- [ ] The pill for each reason is correct.
- [ ] Empty state when nobody owes.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Reminders to pay.
- Payment gateway.
