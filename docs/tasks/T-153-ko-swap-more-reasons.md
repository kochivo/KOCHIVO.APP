# T-153 — KO swap for a busy machine or discomfort, not only injuries

**Phase:** KO agent · **Depends on:** T-131, T-144 (landed) · **Status:** ready (owner request 2026-11-10)

## Goal
A player can ask KO for a replacement exercise only for knee, shoulder or lower-back pain. In a real gym the
most common reason is «الجهاز مشغول». After this card two more reasons work: the machine or equipment is
busy, and general discomfort with the movement.

## Files
Create or modify only these:
- `src/features/ko-account/intents.ts`: `swap_exercise` gains `reason: 'injury' | 'busy' | 'discomfort'`,
  with `injury` required only when the reason is `injury`.
- `src/features/ko-account/swap.ts`, `src/features/ko-account/messages.ts`, `src/features/ko-account/swap.test.ts`
- `src/features/ko-feed/components/feed-card.tsx`, `src/features/ko-feed/messages.ts` (the captain sees the reason)
- Migration only if the swap request table stores the injury in a constrained column:
  `supabase/migrations/0089_swap_reasons.sql` and a test in `supabase/tests/`; read 0080 first.
- This task card.

## Requirements
1. **busy:** alternatives are exercises for the same muscle group that use different equipment from the
   original. This is a same-session substitution: it applies to today's workout only and does not need
   captain approval. Read how T-131 applies an approved swap and add a today-only path; if that cannot be
   done without a schema change, stop and write the reason under "Notes for reviewer" rather than
   inventing one.
2. **discomfort:** same rules as injury (captain approval, permanent change in the plan) with the reason text
   «مش مرتاح في التمرين» shown to the captain.
3. Tool description tells Gemini: "machine busy / taken / occupied" → `busy`; "doesn't feel right / uncomfortable"
   without a body part → `discomfort`; a named pain in knee, shoulder or lower back → `injury`. Other pain → clarify
   and suggest asking the captain; never medical advice.
4. Existing injury flow and tests unchanged in behaviour.

## Acceptance
- [ ] Unit tests: schema accepts each reason and rejects `injury` without a body part; busy alternatives use
  different equipment; busy needs no approval and only affects today; discomfort creates a captain request with
  the reason; captain card shows the reason, ar and en.
- [ ] Migration test if a migration was needed.
- [ ] `npm run check` and `npm run build` pass (known sandbox limits).

## Out of scope
- New body parts, AI-picked alternatives, changing the approval UI beyond the reason line.

## Implementation notes
- Reviewer revision: busy alternatives are read-only advice. No plan write, options
  token, numeric-choice prompt, or captain request. A real today-only substitution
  still needs a dated override and workout/offline integration in a follow-up card.
- Busy options match the catalog `body_part` and require different nonempty catalog
  `equipment` values; the generator's broad `gym` category cannot distinguish machines.
  Choices are deterministic, distinct, and capped at three. Missing metadata or no
  matches produce a localized empty reply. Both languages include the today-only line.
- Injury remains the default for legacy calls and signed payloads. Discomfort uses
  same-pattern alternatives without inventing a body part, the existing signed numeric
  choice flow, captain approval, and a permanent plan change. The captain reason line
  is translated; legacy injury feed payloads keep their original shape.
- Migration 0089 is necessary because 0080 requires a non-null constrained injury.
  It adds a constrained reason with injury as the backfill/default, makes injury nullable,
  and checks reason/body-part consistency. The request RPC adds a defaulted fourth
  argument while preserving three-argument calls; busy requests are rejected. Existing
  ownership, suspension, lock ordering, RLS, and approval safety checks are preserved.
  Public database types track the changed RPC and row shape. No migration is deployed.
- Integration scope pending: `execute.ts` is not in the Files list, but its swap handler
  forwards only the injury. The necessary one-line change is to call
  `prepareSwap(actor, intent.args.exercise, intent.args.injury, locale, intent.args.reason)`.
  Approval to edit this additional file has been requested; it remains unchanged.
- Verification so far: `npx tsc --noEmit` and ESLint on touched TypeScript paths pass.
  Requested native/threads feature and migration tests: 81 passed, three failed solely
  because the reason is not yet forwarded by `execute.ts`. New migration plus legacy
  injury SQL tests: 14 passed. `git diff --check` passes.
- Review: `execute.ts` passes `intent.args.reason` to `prepareSwap` (one line, approved in review); the busy test fixture was renamed so the word "same" in the English line no longer clashes.
