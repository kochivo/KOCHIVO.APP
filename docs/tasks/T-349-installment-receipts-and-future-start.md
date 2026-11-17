# T-349 — Receipts that pay old debt; invites with a future start date

**Migration:** `0147_receipts_and_start_date.sql`

## Items
1. **(C-1, HIGH, money)** A receipt sent without a renewal request (`renewal_request_id is null`) is meant to pay existing debt, and `0138_money_owed_fixes.sql` already shows it that way.
   - **The bug:** accepting the receipt (`review_payment_receipt`, latest in `0106_payment_receipts.sql:128`) always calls `renew_player_offer`. The captain has to enter days, access is extended, a new sale is recorded, and the old debt stays.
   - **When the fix applies:** the receipt has no renewal request AND the player has outstanding debt (use the same partial-debt rule as 0138).
   - **What acceptance should do in that case:**
     - Record the amount as a payment collection against the oldest unpaid sales. Use the existing collection logic and limits from `0037_captain_finance.sql`.
     - Do not renew.
     - Do not ask for days.
   - **Receipt larger than the debt:** never collect more than the debt. Choose clearly what happens (for example, block it with a translated message) and document the choice.
   - **Keep all of these working:**
     - photo and revision checks;
     - idempotent retry;
     - the payment-method tag;
     - notifications;
     - the normal renewal path, for receipts that have a renewal request or come with no debt.
   - **UI:** `src/features/billing/receipts/review-row.tsx` must not require days for an installment receipt, and must label it as paying the debt (ar, arStd, en).
2. **(C-2, MEDIUM)** An invite with a future start date gives access right away.
   - **Cause:** redemption activates at once (`0108_invite_start_forms.sql:80`), and `player_can_write()` (latest in `0139_waiting_access.sql`) only checks the end date.
   - **Store the start:** add a new nullable column for the subscription's effective start. Keep it separate from `coach_clients.started_on`, which defines history visibility.
   - **Block writes before that date:** the player cannot log workouts, meals or answers before it.
     - Do this in `player_can_write()`.
     - Restate the LATEST 0139 definition, keep its awaiting-plans clause, and add the start check.
     - Reading the plan stays allowed.
   - **Player shell:** show a translated "your subscription starts on {date}" state instead of dead buttons.
   - **Legacy rows:** rows with a null start behave exactly as today.

## Out of scope
Forms (T-347), workout (T-348), chat/dashboard (T-350), points (T-351), nutrition (T-352).

## Rules
- **Source:** on 2026-11-17 the owner asked to fix every item of audit round 2 (`docs/tasks/AUDIT-2026-11-17.md`). The evidence for each id is quoted in the card.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Patch, do not rewrite:** to change a long existing function, follow the pattern of 0139/0141/0144:
  1. read `pg_get_functiondef(...)`;
  2. `replace()` an exact fragment;
  3. raise on drift (the fragment count must be exactly 1);
  4. `execute` the result.

  Short functions may be restated with `create or replace`. If you do that, copy the LATEST definition exactly and change only what the card needs.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
