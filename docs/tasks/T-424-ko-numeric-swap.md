# T-424 — A numeric message is a swap choice only for a pending swap question

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
A player who answers KO with a bare number gets an answer, not a wrong swap. Today any numeric-only player message is intercepted before `planIntent` and either executes a swap choice or replies "expired" — so "30" (or "٥") as an answer to another KO question is swallowed, and inside the 10-minute swap window "1"–"3" meant as an answer executes a swap the player never chose.

## Design decisions (read first — they are load-bearing)
1. **The swap token is the pending question.** A swap choice is only real when a `swap_options` approval exists and is still valid: the token comes from the `ko_swap_options` cookie (set by `playerReply` on the reply that showed the options, Max-Age 600) or the `token` form field, verified by `verifyApproval` against the player id and expiry, exactly as today. No token, no valid swap action, no swap.
2. **The number must be a valid choice for that pending question.** Read `src/features/ko-account/data/swap.ts` (`chooseSwap`, `swapPayloadSchema`) first: the payload's `options` array has 1–3 entries, so a valid choice is an integer in `1..options.length` (after Latin-digit normalisation — reuse the existing digit handling, do not add a second one). Any other number is not a swap choice.
3. **Otherwise, fall through to normal answering.** When the message is numeric but there is no valid pending swap choice, the request must continue through the normal flow (`planIntent` and friends) exactly as if the numeric block did not exist — it must NOT return the "expired" reply. The `formPending` guard keeps its current behaviour, but only on the valid-swap-choice path: a numeric message that is not a valid swap choice and has a pending start form goes through the normal `formReply` handling downstream, not the swap branch.
4. **No new UI, no new strings.** The swap question, options and "expired" reply already exist; this fix only changes when the numeric branch fires. Do not add copy.

## Files
Create or modify only these:
- `docs/tasks/T-424-ko-numeric-swap.md`: this card
- `src/features/ko-account/data/route.ts`: the numeric-only player block only — gate it on decisions 1–2, fall through otherwise (decision 3). No other route behaviour changes.
- `src/features/ko-account/data/numeric-swap.ts`: new small helper — route.ts was already at exactly the 250 countable-line ESLint limit, so the cookie/token read plus the validity check live here and route.ts stays within the limit.
- `src/features/ko-account/swap.test.ts`: the existing route test file that covers the numeric block (see Notes) — new numeric cases here, plus the one existing test whose expectation this card changes (see Notes).
- `src/features/ko-account/data/swap.ts`: only if `chooseSwap` needs the range validation moved into it — otherwise leave untouched and say so in Notes.
- `src/features/ko-account/answer-route.test.ts`: extend for the numeric cases (see Tests). If that file does not cover the route's numeric block, add the cases to the existing route test file that does (name it in Notes) — do not create a second route test harness.

## Requirements
1. Bare "30" with no pending swap is answered normally (goes through `planIntent`; test asserts the swap path is not taken and no "expired" reply is returned).
2. Bare "5" (or "٤", or "0") with a pending 3-option swap is answered normally — it is not executed as a swap and does not return "expired".
3. "2" as an answer to a previous KO question while a swap is pending is answered normally — the pending swap is not executed. (The pending question is the one shown with the options; a number that answers a different question is not a choice for it.)
4. "1"–"3" for a pending swap with that many options still executes the swap exactly as today (no regression — `swap.test.ts` stays green).
5. An expired/invalid swap token with a numeric message falls through to normal answering (never "expired" for a message that was never a swap answer).
6. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, TypeScript strict.

## Acceptance
- [ ] The three fall-through cases above reach normal answering; the valid-choice case still swaps.
- [ ] No "expired" reply is ever returned for a numeric message that is not a swap answer.
- [ ] `swap.test.ts` and the extended route tests pass; `npx tsc --noEmit` and `npx eslint` on touched files pass.
- [ ] No change to swap option generation, the cookie, approval verification, or any other route branch.

## Tests (deterministic, inject `now`, no real timers, no network; mock Gemini)
- Extend the route tests with a mocked `actor.db` / mocked `planIntent` (follow the existing `answer-route.test.ts` harness — never a live Gemini call): numeric with no cookie/token → normal path; numeric out of range with a valid pending swap token → normal path; numeric as an answer to a previous KO question (history ends with a KO question, pending swap exists) → normal path; numeric in range with a valid pending swap token → `chooseSwap` runs; numeric with an expired token → normal path.

## Out of scope
- Changing how swap options are generated or how many options there are.
- Voice input (audio path already skips this block) and the `groundIntent` swap checks.
- The answer guard (T-425) and memory scoping (T-423).
- No live Gemini calls, never run the live KO eval.
- No new dependency.

## Notes for reviewer
- Record here: whether `swap.ts` needed a change, and which existing route test file the new cases went into.
- `swap.ts` needed NO change: `chooseSwap` already validates the payload and the 1–3 range (and returns "expired" only on the valid-swap path now, which route.ts no longer reaches for an invalid choice). The range check for gating lives in the new `numeric-swap.ts` helper, reusing `swapPayloadSchema` and `chooseSwap`'s own ١٢٣ Latin-digit normalisation.
- New route cases went into `src/features/ko-account/swap.test.ts` — that is the existing route test file covering the numeric block (cookie-backed choice, token rejection, pilot gate); `answer-route.test.ts` does not cover it. One Req-1 case ("30" with no swap pending) was also added to `answer-route.test.ts` via its mocked-Gemini harness.
- Deviation: the existing `swap.test.ts` case "rejects %s options before a request RPC" (missing/expired/foreign/wrong-player/tampered/wrong-kind tokens expecting the "expired" reply) directly contradicts requirement 5, so it was updated to "answers normally instead of expiring for %s options" — the numeric message now falls through to normal answering (`planIntent`) and never returns "expired" for a message that was never a swap answer. No other existing test changed.
- The pre-existing `npm run check` lint failure in `src/features/templates/components/workspace-programs-view.tsx` is out of scope; verify it is byte-identical to HEAD and do not fix it here.
- `route.ts` stayed within the 250 countable-line ESLint limit by extracting the numeric handling into `numeric-swap.ts` (new file, see Files list).

## References
- `docs/ARCHITECTURE.md` §3
- `src/features/ko-account/data/route.ts` (numeric block, `playerReply` swap cookie), `swap.ts` (`chooseSwap`, `swapPayloadSchema`), `approval.ts` (`verifyApproval`)
- `src/features/ko-account/swap.test.ts`, `answer-route.test.ts`
