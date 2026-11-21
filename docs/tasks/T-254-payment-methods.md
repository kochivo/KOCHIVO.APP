# T-254 — Payment methods the captain accepts

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 2.

## Goal
The captain chooses which payment methods they accept and writes the account detail for each one. The player sees only the enabled methods when renewing and picks one. Every recorded payment then shows its method in the billing table.

The method keys are:
- `instapay`
- `vodafone_cash`
- `cash`
- `bank_transfer`

## Files
- `supabase/migrations/<next>_payment_methods.sql`:
  - new table `public.captain_payment_methods`, one row per enabled method, with these columns:
    - `captain_id`
    - `method` (check on the four keys)
    - `account_detail text` (≤80, nullable for cash)
    - `position`
    - `updated_at`
    - primary key `(captain_id, method)`
  - The captain writes their own rows. A player reads only the rows of their active captain.
  - New nullable `method text` column on `player_payments` and on `player_renewal_requests`, with the same check.
- `supabase/tests/payment-methods.test.ts`
- `src/features/settings/`:
  - a "طرق الدفع" card in captain settings: toggles plus an account field, matching the board.
- `src/features/billing/`:
  - method picker in the player renewal sheet;
  - method column in the payments table;
  - method choice when recording a payment by hand.

## Requirements
1. With no methods enabled, the renewal sheet works as it does today and asks for no method.
2. The account detail is shown with a copy button and LTR digits.
3. Old payments with a null method show «—».

## Acceptance
- [ ] The captain toggles methods and edits details, and the changes persist.
- [ ] The player sees only the enabled methods of their own captain.
- [ ] The method shows in the billing table.
- [ ] RLS tests pass. `npm run check` and `npm run build` pass.

## Out of scope
- Receipts (T-253). It reads `method` once this card lands.
- Online payment.
