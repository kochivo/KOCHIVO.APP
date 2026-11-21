# T-260 — Captain sees join request intake before accepting

**Phase:** data gaps · **Depends on:** T-259 (goal field) · **Status:** ready
Shared rules: `docs/tasks/DATA-GAPS.md`. Board panel 8.

## Goal
On the join requests page, the captain sees each requester's details before deciding:
- goal;
- weight and height;
- training days;
- training place.

Today `player_intake` is readable only after acceptance, so the cards show just the name.

## Files
- `supabase/migrations/<next>_join_intake_preview.sql`:
  - captain-only RPC `join_request_preview(request_id)`.
  - It returns a fixed set of non-medical fields from `player_intake`: goal, `weight_kg`, `height_cm`, `training_days`, `session_minutes`, experience, and place if it is stored in `captain_intake`/intake. Check where place lives first; if it is not stored, leave it out and report.
  - It returns them only while the request is `pending` and addressed to the caller.
  - Injuries, medical, allergies and notes are not returned before acceptance.
  - No change to the `player_intake` policies.
- `supabase/tests/join-intake-preview.test.ts`:
  - another captain gets nothing;
  - a declined request gets nothing;
  - medical fields are never returned.
- `src/features/join/` (or wherever `/captain/join` loads): add the fields to each card, matching the board.
- `src/features/onboarding/`: one plain consent line in the join step, «الكابتن هيشوف هدفك ووزنك وأيامك قبل ما يقبلك».

## Requirements
1. Privacy: only the listed fields, only for the pending request, and only for its captain.
2. Missing fields show «—».

## Acceptance
- [ ] Pending cards show the fields.
- [ ] Accept and decline still work as before.
- [ ] RLS and RPC tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Showing medical details before acceptance. That stays private.
