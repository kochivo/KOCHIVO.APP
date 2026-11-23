# T-425 — Answer-guard numbers are grounded per cited source, not as a bag

**Phase:** fix · **Depends on:** none · **Status:** ready

## Goal
KO stops stating numbers it was never told. Today `guardAnswer` allows any number that appears anywhere in the facts or in the user's own question, so Gemini can assert a number the user merely asked about, or swap numbers between fields (a kcal target stated as protein). After this, every number in an answer must be justified by the facts it claims to come from.

## Design decisions (read first — they are load-bearing)
1. **The user's question justifies nothing.** Numbers appearing only in `userText` are removed from the allowed set entirely. An answer that echoes a number from the question ("You asked about 250 points") is not grounded — it must fail the guard and fall back. This is a deliberate behaviour change, documented here: echoing is not evidence.
2. **Allowed numbers come only from the sources the answer cites.** `reviewAnswer` already knows `args.sources`. Parse the facts into their `[source] …` lines (see `formatAccountFacts` / `appendMemoryFacts` in `facts.ts` — a facts line starts with `[<source>] `; the `[memory]` line is one source) and allow only numbers from lines whose source is in `args.sources`. Numbers from a fact line of a source the answer does not cite are not allowed — that is what stops cross-field swaps between sources.
3. **Within a cited line, numbers are allowed as a set — and that limit is documented, not hidden.** A single facts line can hold several fields (e.g. one nutrition line with kcal and protein), so a swap inside one line can still pass. Read the actual fact line formats in `read-progress.ts` / `facts.ts` first: if the lines carry structured `key: value` pairs that make key-aware matching feasible without guessing, implement it (a number is allowed only if it appears under the same key it is claimed for); if the formats do not support that reliably, keep line-level grounding and record the residual risk in Notes for reviewer. Do not invent a parser that guesses at Arabic prose.
4. **Small integers stay allowed (0–10).** The existing 0–10 allowance is for counts like sets and reps that Gemini composes legitimately; keep it. Everything else must be in the allowed set.
5. **The 250-points case now fails the guard.** The existing test case `['You asked about 250 points. You trained 13 times.', 'Do I have 250 points?', null]` must change its expectation to `'number'` (the fallback then rewords via `fallbackBySource`). Update that test case; do not delete it — it is the regression test for this fix.
6. **Signature change is contained.** `guardAnswer(text, facts, userText)` gains the cited sources as a parameter (e.g. `guardAnswer(text, facts, userText, sources)`); `reviewAnswer` passes `args.sources`. Update all callers (grep first) and the tests. If a caller has no sources, it passes an empty list, which means: only 0–10 numbers are allowed (no fact line is cited). Document any caller you find that this affects.

## Files
Create or modify only these:
- `docs/tasks/T-425-ko-answer-guard.md`: this card
- `src/features/ko-account/data/answer-guard.ts`: `guardAnswer` and `reviewAnswer` only, per decisions 1–6.
- `src/features/ko-account/answer-guard.test.ts`: update the 250-points expectation; add cases (see Tests).

## Requirements
1. A number that appears only in the user's question never justifies an asserted fact.
2. A number from a facts line whose source the answer does not cite never justifies the answer.
3. A number from a cited source's facts line justifies the answer (legit cases keep passing, e.g. "عملت ۱۳ تمرين والتزامك ٨٦٫٥٪." against the progress facts).
4. The `length` / `link` / `phone` / `action_claim` / `source` checks are unchanged.
5. Rules that still apply: files ≤ 250 lines, one component per file, kebab-case, import direction `app → features → (ui, core, lib)`, no `any`, no `console.log`, TypeScript strict.

## Acceptance
- [ ] The 250-points case fails the guard (`'number'`) and the fallback path is exercised.
- [ ] A cross-source number swap fails the guard (e.g. an answer citing only `progress` that states a number that exists only in the nutrition facts).
- [ ] Legit answers citing their sources still pass, including Arabic-Indic digits and percentages.
- [ ] All `guardAnswer` callers updated; `answer-guard.test.ts` passes; `npx tsc --noEmit` and `npx eslint` on touched files pass.
- [ ] No change to the guard's other checks, to `planIntent`, or to any route behaviour.

## Tests (deterministic, inject `now`, no real timers, no network)
- `src/features/ko-account/answer-guard.test.ts`: update the 250-points case to `'number'`; add: answer citing `progress` that uses a number found only in a `[nutrition]` facts line → `'number'`; answer citing `nutrition` that uses the same number → `null`; answer echoing a user-only number → `'number'`; answer with a 0–10 count and a cited fact number → `null`; `reviewAnswer` with a failing guard returns the `fallbackBySource` fallback for the first cited source (existing `me` test stays green).

## Out of scope
- Key-aware (per-field) matching inside one facts line, unless the line formats support it reliably (decision 3) — otherwise it is a documented follow-up.
- Voice-input grounding, prompt-injection hardening, memory scoping.
- Changing what Gemini is asked to answer or the fallback wording.
- No live Gemini calls, never run the live KO eval.
- No new dependency.

## Notes for reviewer
- Record here: whether key-aware matching inside a line was feasible (with the line formats as evidence), and any `guardAnswer` caller found that passes no sources.
- The pre-existing `npm run check` lint failure in `src/features/templates/components/workspace-programs-view.tsx` is out of scope; verify it is byte-identical to HEAD and do not fix it here.

## References
- `docs/ARCHITECTURE.md` §3
- `src/features/ko-account/data/answer-guard.ts` (`guardAnswer`, `reviewAnswer`, `fallbackBySource`), `facts.ts` (`formatAccountFacts`, `appendMemoryFacts`), `read-progress.ts` (fact line formats)
- `src/features/ko-account/answer-guard.test.ts`
