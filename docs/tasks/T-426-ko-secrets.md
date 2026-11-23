# T-426 — KO secrets have one enforced source of truth

**Phase:** fix · **Depends on:** none · **Status:** done (coordinator-corrected: public RPC, see Notes)

## Goal
KO never silently breaks because two copies of the same secret disagree. Today the app signs approval tokens with env `KO_APPROVAL_SECRET` while the database verifies them against `security_private.ko_approval_config.signing_key`, the meal receipt is signed with env `KO_MEAL_RECEIPT_SECRET` but verified against `security_private.app_secrets` (`meal_receipt`), and the usage-warning proof is signed in the app but verified against the DB signing key — and nothing seeds either side or checks they match. If they differ, every KO confirmation fails and meal points are silently skipped. After this, a mismatch fails KO loudly and visibly at config time, by name, never by silently skipping.

## Design decisions (read first — they are load-bearing)
1. **The DB key is authoritative; the env key must equal it.** Moving token issuance into the database was considered and rejected: issuance (`issueApproval` in `execute.ts`) and verification (`verifyApproval` in `route.ts`) both run in the app, and `ko_private` functions are not exposed to the app's PostgREST client, so a DB-only design would require exposing a new signing surface. Instead, a dedicated check RPC proves agreement without ever revealing a secret value: the app HMACs a fixed challenge with its env secret and the DB compares it with an HMAC computed from its stored key, returning only a boolean. Coordinator correction (2026-11-22): the check RPC therefore lives in `public`, not `ko_private` — PostgREST only serves exposed schemas and `ko_private` is deliberately not exposed (T-116), so a `ko_private` check would be unreachable from the app and KO would fail closed everywhere. The original `ko_private` wording is struck in decision 2 and the Files list; see Notes.
2. **One check function, two kinds.** New `public.ko_secret_check(p_kind text, p_challenge text, p_mac text) returns boolean`, `security definer`, `set search_path = ''`: kind `'approval'` compares against `security_private.ko_approval_config.signing_key` (this same key backs the usage-warning proof in `ko_usage_claim_warning`, so one check covers both), kind `'meal_receipt'` compares against `security_private.app_secrets` where `name = 'meal_receipt'`. Unknown kind or missing DB key returns false. Grant execute to `authenticated` (a boolean oracle over a 256-bit HMAC with a ≥32-char secret is not a practical leak — same exposure class as `verified_approval` itself). Never log, return, or store a secret value anywhere in this flow.
3. **The check runs before any usage is taken, and is cached per secret value.** New `src/features/ko-account/data/secret-check.ts`: `verifyKoSecrets(actor, config)` HMACs the challenge with the env secrets, calls the RPC for each kind, and returns the list of mismatching secret names (names only). `route.ts` calls it right after `getKoActor()` and before `takeUsage`; on any mismatch KO replies unavailable (same shape as the existing origin-mismatch 404) and logs a `console.warn` naming the secret (name only). Cache the result in module scope keyed by a hash of the env secret values, so the check runs at most once per process per secret value — a DB secret rotation therefore needs a restart/redeploy, which is already true for env secrets; document this in Notes.
4. **A missing meal secret is a mismatch, not a silent skip.** `koAccountConfig()` (`ko-entry/config.ts`) gains `KO_MEAL_RECEIPT_SECRET` presence in its problem list (names only, following the existing `koConfigProblems` pattern). The route's current `if (!secret) console.warn('Meal points skipped…')` path must not be reachable with a live KO anymore: if the meal secret is missing or mismatched, KO is unavailable per decision 3. Meal-point award failures after a passing check stay as the existing warn (a real failure only).
5. **`.env.example` gets empty placeholders — and one existing line is fixed.** Add empty entries for `KO_ENABLED`, `KO_GEMINI_PAID`, `KO_ORIGIN`, `KO_APPROVAL_SECRET`, `KO_PILOT_USER_IDS`, `GOOGLE_GENERATIVE_AI_API_KEY` (currently mentioned only in a comment). Change the existing `KO_MEAL_RECEIPT_SECRET=<redacted>` line to an empty value: `<redacted>` is a non-empty value and the release audit's example-secret rule flags non-empty SECRET values — verify with `node scripts/release-audit.mjs` after editing. Values stay empty; never put a real or example secret in the file.

## Files
Create or modify only these:
- `docs/tasks/T-426-ko-secrets.md`: this card
- `src/features/ko-account/data/secret-check.ts`: new `verifyKoSecrets` helper (decision 3). One responsibility per file, ≤ 250 lines.
- `src/features/ko-account/data/route.ts`: call `verifyKoSecrets` after the actor is known and before `takeUsage`; on mismatch return unavailable + warn (decision 3). No other route behaviour changes.
- `src/features/ko-entry/config.ts`: add `KO_MEAL_RECEIPT_SECRET` presence to the config problems (decision 4). No other change.
- `supabase/migrations/0167_ko_secret_check.sql`: new additive migration — `public.ko_secret_check` only (decision 2, as corrected). Grants: `revoke all … from public, anon; grant execute … to authenticated;`. Never edit an applied migration.
- Route-test mocks updated by the coordinator (outside the original Files list — required so the new pre-check passes in a configured test environment; one line each: answer `ko_secret_check` with `true` and stub `KO_MEAL_RECEIPT_SECRET`): `src/features/ko-account/actions.test.ts`, `answer-route.test.ts`, `swap.test.ts`, `context.test.ts`, `ground.test.ts`, `rate-limit.test.ts`, `src/features/ko-account/data/usage.test.ts`.
- `supabase/tests/ko-secret-check.test.ts`: PGlite tests for the RPC (see Tests).
- `src/features/ko-account/secret-check.test.ts`: unit tests for the helper with a mocked `actor.db` (see Tests).
- `.env.example`: empty placeholders per decision 5 only.
- `src/types/app-database.ts`: add the new RPC's Functions entry only (mirror how `ko_usage_take` is typed there). Report the exact lines in your final message.

## Requirements
1. When env and DB secrets agree, KO works exactly as today (no extra user-visible change, no extra per-request DB round trip after the first check per process).
2. When the approval secret disagrees, KO is unavailable with a loud warning naming `KO_APPROVAL_SECRET` (name only) — no confirmation is attempted, no usage is taken, and no meal points are silently skipped.
3. When the meal-receipt secret disagrees (or is missing in env), KO is unavailable with a loud warning naming `KO_MEAL_RECEIPT_SECRET`.
4. The check RPC never reveals a secret value: it returns only a boolean, and no secret value appears in any log, error, or reply (grep to prove it).
5. `node scripts/release-audit.mjs` passes with the edited `.env.example` (0 findings).
6. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log` (a `console.warn` naming a mismatching secret is required here — name only, never the value), TypeScript strict.

## Acceptance
- [ ] Matching secrets: KO chat works, check runs once per process per secret value.
- [ ] Mismatched approval secret: KO unavailable, warning names the secret, zero usage taken.
- [ ] Mismatched/missing meal secret: KO unavailable, warning names the secret.
- [ ] PGlite + unit tests pass; `npx tsc --noEmit` and `npx eslint` on touched files pass; release audit passes.
- [ ] No change to token issuance/verification logic, the usage-warning proof, or meal-point awarding other than the pre-check.

## Tests (deterministic, inject `now`, no real timers, no network; mock Gemini)
- `supabase/tests/ko-secret-check.test.ts` (PGlite): correct HMAC for the stored key returns true; wrong key returns false; unknown kind returns false; missing DB key returns false; anon cannot execute.
- `src/features/ko-account/secret-check.test.ts`: helper returns `[]` when both RPCs return true; returns the mismatching names when one/both return false; caches the second call (RPC called once per kind per secret value); swallows RPC errors as a mismatch (fail closed — KO unavailable, never silently proceed).

## Out of scope
- Rotating existing production secrets (owner action — say so in Notes, with the two places the owner must update).
- Moving token issuance into the database (considered and rejected in decision 1 — do not reopen it in this task).
- Changing the usage-warning proof or the meal-point award logic beyond the pre-check.
- Do not apply the migration to any real database. Do not create or modify any `.env` file (`.env.example` only).
- No new dependency.

## Notes for reviewer
- Record here: the DB-rotation restart requirement (decision 3), the owner action for rotation (which two places, in which order), and the exact `app-database.ts` lines added.
- The pre-existing `npm run check` lint failure in `src/features/templates/components/workspace-programs-view.tsx` is out of scope; verify it is byte-identical to HEAD and do not fix it here.
- **Coordinator correction — the check RPC lives in `public`, not `ko_private`.** The implementer built `ko_private.ko_secret_check` called via `actor.db.schema('ko_private').rpc(...)`, exactly as the card first wrote it. That cannot work in production: PostgREST only serves exposed schemas, `ko_private` is deliberately not exposed (T-116), and the card's own decision 1 already noted `ko_private` functions are not exposed to the app's PostgREST client. Without a dashboard change KO would have failed closed everywhere — the old deployment blocker is gone: no Supabase dashboard change is needed, and `ko_private` stays unexposed. `public.ko_secret_check` follows every other ko RPC (`ko_usage_take`, `ko_rate_take`, `ko_usage_refund`, …): `security definer`, `authenticated`-only grant, boolean-only return. Decision 1, decision 2, the Files list and the migration were updated to match.
- **Coordinator correction — the 7 route-test mock files were updated** (listed in Files). The new pre-check broke 67 existing route tests two ways: their mocked `actor.db` had no `.schema()` method, and no test environment sets `KO_MEAL_RECEIPT_SECRET` (a missing meal secret is a mismatch by decision 4). Each file now answers `ko_secret_check` with `true` and stubs the meal secret, simulating a configured environment. After the fix the KO suite is back to its pre-T-426 baseline: 307 passed, 11 failed — all 11 the pre-existing `answer-route.test.ts` "KO memory read failed" failures from the staged T-423 code, none mentioning the secret check.

- **Follow-up fix (2026-11-23, publish blocker):** the pre-check as written blocked *every* KO chat request — including meal replies — when the meal-receipt secret was missing or mismatched (`supabase/tests/points-ranks.test.ts` "preserves a successful meal reply with award outcome missing" failed 404 instead of 200). Owner decision on publish: scope the fail-closed pre-check to KO chat usage only. `route.ts` now calls new `verifyKoApprovalSecret` (approval secret only — it signs approval tokens and the usage-warning proof), and a missing/mismatched meal-receipt secret never blocks the reply: the meal-points award at the end of a meal reply is skipped with the pre-existing warning instead. Decision 3/4 above are amended accordingly for the meal secret only; an approval-secret mismatch still fails KO loudly before any usage is taken.

## References
- `docs/ARCHITECTURE.md` §3, §5
- `src/features/ko-account/data/approval.ts` (`issueApproval`/`verifyApproval`), `execute.ts` (issuance), `route.ts` (verification + meal receipt), `usage.ts:35` (warning proof), `meal-receipt.ts`
- `src/features/ko-entry/config.ts` (`koAccountConfig`, `koConfigProblems`)
- `supabase/migrations/0071_ko_account_actions.sql` (`ko_approval_config`, `verified_approval`), `0088_meal_check_receipt.sql` (`app_secrets`, `award_meal_check`), `0158_ko_usage.sql:143` (`ko_usage_claim_warning`)
- `.env.example`, `scripts/release-audit-rules.mjs` (`exampleRule`)
