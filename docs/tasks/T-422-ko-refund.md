# T-422 — KO refunds usage and credits when Gemini fails

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
A KO user never pays for an answer they never got. Today usage is taken before Gemini runs and is never refunded on failure, so every 429/503/timeout burns the daily cap and the shared monthly quota, and a failed big-action commit leaves the credit spent. After this, a busy or failing Gemini costs the user nothing and a retry after a failure is not punished.

## Design decisions (read first — they are load-bearing)
1. **Refund only what was actually taken.** `ko_usage_take` (`supabase/migrations/0158_ko_usage.sql:63`) increments both the daily row and the monthly `calls` counter only when it returns `'ok'` (`'daily'` and `'monthly'` return before any increment). The route must therefore refund usage only when `takeUsage` returned `'ok'` — track it in a local flag, do not guess from the reply.
2. **Refund is idempotent and keyed.** A refund RPC call can itself be retried (route code must call it at most once per request, but the DB must survive a double call). The refund RPC takes a per-request key (`uuidv7`, generated once in the route for that request) and records refunded keys in a new `security_private.ko_usage_refunds` table (PK on the key). A second call with the same key is a no-op returning "already refunded".
3. **Credits refund only when the action did not apply.** The 3-arg `ko_credit_take` is token-keyed and replay-aware (`0158:116`): it returns true when the approval row already exists. A refund must therefore NOT blindly delete the approval row. The refund RPC refunds only when there is no receipt for the action in `ko_action_receipts` (read `ko_apply_action` first and confirm where the receipt is recorded). If a receipt exists, the action applied and the credit stays spent.
4. **Gemini-failure paths only.** Refund usage on the Gemini-failure paths: `planIntent` returning 429/503, and `planIntent` throwing (timeout/502). Wrap the `planIntent` call so its throw is refunded there, not in the outer catch — the outer catch also covers `executeIntent` throws, where intents may already have partially executed, so a blanket outer-catch refund would be wrong. Read `src/features/ko-agent/gemini.ts` for the timeout/error shape (`KoModelError` statuses) so every Gemini failure mode is covered.
5. **The 40001 question is decided in code, not guessed.** `commitApproval` returns a "changed" reply on error code `40001` instead of throwing. Read `ko_apply_action` and decide, with a code comment: if 40001 means "not applied", refund the credit there too; if it means "applied by another device", do not refund. Document the decision in Notes for reviewer.

## Files
Create or modify only these:
- `docs/tasks/T-422-ko-refund.md`: this card
- `src/features/ko-account/data/usage.ts`: `refundUsage(actor, { day, kind, key })` and `refundCredit(actor, { month, token })` helpers (thin RPC wrappers; return whether a refund was applied; never throw on refund failure — the route logs a warning and continues).
- `src/features/ko-account/data/route.ts`: generate one refund key per request; set the usage-taken flag only when `takeUsage` returns `'ok'`; refund usage on the 429/503 replies and on a `planIntent` throw; in the confirm branch, track whether `takeCredit` returned true and refund the credit when `commitApproval` throws (and per decision 5, on 40001 if applicable). No other behaviour change.
- `supabase/migrations/0165_ko_usage_refund.sql`: new additive migration — `security_private.ko_usage_refunds` table plus `ko_usage_refund(p_day, p_kind, p_key)` and `ko_credit_refund(p_month, p_token)` (both `security definer`, `set search_path = ''`, following the `ko_usage_take` header style). Refund decrements the daily messages/photos counter and the monthly `calls` counter with a floor of 0, and the monthly `credits` counter with a floor of 0; grants: `revoke all … from public, anon; grant execute … to authenticated;` (same as the other ko RPCs). No other function in this migration. Never edit an applied migration.
- `supabase/tests/ko-usage-refund.test.ts`: PGlite tests for both RPCs (see Tests).
- `src/features/ko-account/data/usage.test.ts`: unit tests for the TS helpers with a mocked `actor.db` (refund called once, refund failure swallowed, no refund when usage was not taken).
- `src/types/app-database.ts`: add the two new RPCs' Functions entries only (mirror how `ko_usage_take` is typed there). Report the exact lines in your final message.

## Requirements
1. `takeUsage` returning `'ok'` followed by Gemini 429/503/timeout/throw leaves the daily messages/photos counter and the monthly `calls` counter exactly where they were before the request (verified by the PGlite tests, not just by code reading).
2. Calling the refund RPC twice with the same key refunds once; a second refund with a different key for the same day/kind refunds again (each take has its own key — do not make the key the day/kind).
3. A failed `commitApproval` after a successful `takeCredit` refunds the credit exactly once; a successful commit never refunds; a receipt for the action blocks the refund.
4. The busy-Gemini replies (`koBusy` / `koBusyNow`) are unchanged in wording; only the usage accounting changes. No new user-facing strings.
5. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log` (a `console.warn` on refund failure is allowed — real failure only), TypeScript strict, dates via `localDate()` (Africa/Cairo).

## Acceptance
- [ ] Gemini 429, 503 and timeout/throw consume zero usage (daily + monthly counters unchanged).
- [ ] Double refund with the same key is a no-op; refund is safe under concurrent retries.
- [ ] Failed big-action commit refunds the credit; successful commit does not; replayed confirmation does not refund the original take.
- [ ] Targeted vitest files pass; `npx tsc --noEmit` and `npx eslint` on touched files pass.
- [ ] No change to rate limiting, tier caps, memory, swaps, or the answer guard.

## Tests (deterministic, inject `now`, no real timers, no network; mock Gemini)
- `supabase/tests/ko-usage-refund.test.ts` (PGlite, following `supabase/tests/ko-usage.test.ts`): take then refund returns counters to their prior values; refund twice with the same key refunds once; refund with an unknown key still decrements once and then is recorded (decide: unknown-key refund applies once — document if the card's key design differs); refund never drives a counter below 0; credit refund after a taken credit restores it, is blocked when a receipt exists, and is a no-op the second time; anon cannot execute either RPC.
- `src/features/ko-account/data/usage.test.ts`: helper returns false (not applied) when the RPC reports already-refunded; helper swallows RPC errors; route-level behaviour is covered by `answer-route.test.ts` only if it already mocks `takeUsage` — otherwise add a route test for the 429 path asserting the refund RPC was called once (mock `actor.db.rpc`, never a live Gemini call).

## Out of scope
- Changing tier caps, rate limits, or the 2-arg `ko_credit_take` bypass (audit H1 of the data track — a separate fix, note it under Notes, do not touch it).
- The `ko_usage_claim_warning` proof (T-426 owns the secret side of it).
- Refunding usage for non-Gemini failures (e.g. an `executeIntent` throw mid-loop) — deliberate boundary, see decision 4.
- No live Gemini calls, never run the live KO eval. Do not apply the migration to any real database.
- No new dependency.

## Notes for reviewer
- Record here: the 40001 decision (decision 5) with the `ko_apply_action` evidence, and the unknown-key refund behaviour.
- **40001 decision: refund the credit.** In `ko_apply_action` (`0071_ko_account_actions.sql`) the receipt is recorded first (`ko_private.record_receipt(p_token)`), before the `case` that mutates anything — but both 40001 raises (exercise prescription changed, renew subscription changed) happen *before* any write, and the raise aborts the whole RPC transaction, so the receipt insert rolls back with it. A 40001 therefore always means "not applied, no receipt left behind", and `ko_credit_refund`'s receipt check lets the refund through. The "applied by another device" case never produces 40001: a receipt already exists, so `record_receipt` returns false and the function returns `{'replayed': true}` instead. The route refunds on the `changed` reply and on a `commitApproval` throw; a replayed commit is never refunded, and if a commit somehow applied but its response was lost, the surviving receipt blocks the refund.
- **Unknown-key refund behaviour:** `ko_usage_refund` does not require a prior take. A refund with a fresh key decrements once (floored at 0) and records the key, so a second call with the same key is a no-op. The route only ever refunds after `ko_usage_take` returned `'ok'`, so in practice every refund balances a take; the unknown-key path exists so a retried refund can never double-decrement and a stray key can never drive a counter below 0.
- **Refund-failure warning placement:** the card says the route logs a warning, but the route cannot tell "already refunded" (a normal `false`) from an RPC failure, and warning on every `false` would break the existing `answer-route.test.ts` 429/503 expectations (its mock RPC returns `'ok'`, not `true`). So the `console.warn` lives in the `refundUsage`/`refundCredit` helpers, which are the only place that sees the error; the route just continues. No warning is emitted on an already-refunded key.
- **Route test placement:** `answer-route.test.ts` already mocks `takeUsage` (via its generic RPC mock), but it is outside this card's Files list, so it was left untouched; the 429/503/throw route tests live in `src/features/ko-account/data/usage.test.ts` instead.
- The pre-existing `npm run check` lint failure in `src/features/templates/components/workspace-programs-view.tsx` is out of scope; verify it is byte-identical to HEAD and do not fix it here.
- Out of scope, noticed while reading: the 2-arg `ko_credit_take` bypass (audit H1 of the data track) is untouched, as instructed.

## References
- `docs/ARCHITECTURE.md` §3, §5
- `src/features/ko-account/data/route.ts` (takeUsage call, planIntent catch, confirm branch), `usage.ts`, `execute.ts` (`commitApproval`)
- `supabase/migrations/0158_ko_usage.sql` (`ko_usage_take`, `ko_credit_take` 2-arg and 3-arg, `ko_usage_claim_warning`), `0071_ko_account_actions.sql` (`ko_apply_action`, `ko_action_receipts`)
- `docs/tasks/T-410-ko-launch-fixes.md` (the original T-410 refund requirement)
