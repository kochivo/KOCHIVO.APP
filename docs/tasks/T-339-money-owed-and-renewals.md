# T-339 — Money owed and renewal fixes

**Migration:** `0138_money_owed_fixes.sql`

## Items
1. **(Audit #1)** In `captain_money_owed()` (latest: `0107_money_owed.sql`), a pending renewal or receipt hides older unpaid installment debt.
   - Report both the existing partial balance AND the pending renewal/receipt amount, without counting the same sale twice.
   - The return shape may gain rows, but not columns.
   - Keep current callers working. If one player can now have 2 rows, update the client mapping.
2. **(Audit #2)** The pending renewal amount must apply the same offer/discount rules as `decide_player_renewal()` and `renew_player_offer()`, so money owed matches what approval records.
3. **(Audit #19)** In `src/features/billing/components/workspace-billing-summary.ts:14`, a PT membership counts as active only when it has sessions left AND its validity date has not passed.
4. **(Audit #20)** When the player is frozen:
   - disable the Approve button for renewal requests (`src/features/billing/choice/renewal-requests.tsx`) and for receipt acceptance;
   - show a translated "unfreeze first" note;
   - include the frozen state in the review data.

## Out of scope
Access helpers (T-340), KO (T-340), workout, nutrition, notifications.

## Rules
- **Source:** on 2026-11-16 the owner asked to fix every item of the logic audit (`docs/tasks/AUDIT-2026-11-16.md`). The scenario for each item is there.
- **Verify first:** re-check each item in the code before fixing it. If an item turns out not to be a real bug, skip it and say why.
- **Database:**
  - All DB changes go in ONE new migration, with the exact number given above. Do not apply it.
  - The migration is additive: `create or replace` for functions, triggers and policies; new columns or tables only. No data rewrites or deletes.
  - Never edit old migrations.
- **Tests:** every fix gets a test. Use PGlite in `supabase/tests/` for SQL and vitest for TS. Tests must be deterministic.
- **UI:**
  - Every new string goes in ar, arStd and en.
  - Use tokens only and logical properties.
  - Touch targets are 48px or more.
  - Files are 250 lines or fewer.
- **Scope:** do not touch the out-of-scope features. Other cards are fixing them in parallel.
- **Gates:** `npm run check` and `npm run build`.
