# T-253 — Payment receipts: player uploads, captain accepts or declines

**Phase:** data gaps · **Depends on:** none · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 1.

## Goal
A player can photograph a payment receipt and send it from the renewal screen. The captain sees the photo with the amount and method, then accepts or declines it.
- **Accept:** records the payment and extends the subscription, through the same path the captain uses today to record a payment. The player is notified.
- **Decline:** needs a one-line reason, which the player sees. The player can then send a new receipt.

## Files
- `supabase/migrations/<next>_payment_receipts.sql`:
  - new table `public.payment_receipts`:
    - `id uuid` (uuidv7 from the client);
    - `player_id`, `captain_id`;
    - `renewal_request_id` (nullable, references `player_renewal_requests`);
    - `amount_egp int` (1..100000);
    - `method text` (the method keys from T-254, nullable until T-254 lands);
    - `photo_path text`;
    - `status` (`pending|accepted|declined`);
    - `decline_reason text` (≤200);
    - `created_at`, `decided_at`;
    - a check that `decided_at` is set exactly when the status is not pending.
  - private storage bucket `payment-receipts`, with a path policy where the player writes and the captain of that player reads;
  - RPCs `submit_payment_receipt`, `accept_payment_receipt` and `decline_payment_receipt`. Accept inserts into `player_payments` the same way the existing record-payment path does.
- `supabase/tests/payment-receipts.test.ts`: RLS, the storage path policy, and accept creating exactly one payment (idempotent on retry).
- `src/features/billing/` with data, components and messages:
  - player upload sheet on the renewal screen;
  - captain list «إيصالات مستنية مراجعة» on the billing page, with accept and decline.
- `src/features/captain-workspace/queue/`: a pending receipt shows up as a task of kind `receipt`.

## Requirements
1. Images only (jpeg/png/webp, ≤5 MB). Compress on the client the way the existing check-in photos do.
2. Only one pending receipt per player and captain. Sending again replaces the photo of the pending one.
3. Accepting creates the payment and extends the period exactly as recording a payment by hand does today. No second code path for the dates.
4. A declined receipt shows its reason to the player, with a button to send a new one.
5. Signed URLs for the photos. No public bucket.

## Acceptance
- [ ] Player sends a receipt and the captain sees it in billing and in tasks.
- [ ] Accept extends the subscription once; a double click does not create two payments.
- [ ] Decline requires a reason, and the player sees it.
- [ ] RLS tests pass: another captain and another player cannot read the row or the photo.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Payment methods settings (T-254).
- Notifications for a new receipt (T-262). For now, the task row is enough.
- Online payment gateways.
