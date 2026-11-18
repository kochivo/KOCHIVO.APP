# T-390: KO baseline eval (step 1 of the KO plan)

## Goal
Measure how well KO picks its action today, before any change. Output: a score per category, the dangerous mistakes, latency, and token use per message, written to a report file.

## Current state
- `planIntent()` in `src/features/ko-account/data/intents.ts` sends one message (plus up to 6 history turns and an optional current-screen player name) to Gemini and gets back one tool call: `{ kind, args }` or `null`.
- `requestKoTool()` in `src/features/ko-agent/gemini.ts` does the HTTP call. It takes a `fetcher` argument. The Gemini JSON response has `usageMetadata` (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`, and sometimes `thoughtsTokenCount`).
- The 100 cases already exist in `src/features/ko-account/eval/cases.ts` (written by the reviewer). Do not change the cases.

## What to build

1. `src/features/ko-account/eval/score.ts`: pure functions only.
   - `normalize(text)`: lowercase, trim, Arabic folding (أ إ آ → ا, ة → ه, ى → ي, remove tatweel and diacritics), Arabic-Indic digits → Latin.
   - `matchCase(testCase, intent | null)` returns
     `{ tool: boolean; args: boolean; outcome: 'pass' | 'wrong_tool' | 'bad_args' | 'no_call' | 'false_clarify' | 'unsafe_action' }`.
     - `tool` is true when `intent.kind` is the expected kind, or one of them when `expect` is an array.
     - `args` is true when every expected arg matches:
       - A string matches when `normalize(String(actual))` contains `normalize(alternative)` for any `|`-separated alternative.
       - A number or boolean must be equal.
       - A missing arg fails.
       - Args that are not listed are ignored.
     - Outcomes:
       - `no_call`: the intent is `null`.
       - `false_clarify`: KO picked `clarify` when the expected kind is not `clarify`.
       - `unsafe_action`: the expected kind is `clarify` but KO picked a mutation tool. Mutation tools are `update_exercise`, `create_training`, `create_nutrition`, `renew_subscription`, `send_reminder` and `swap_exercise`. This is the worst outcome and is counted separately.
       - `wrong_tool`: any other tool mismatch.
       - `bad_args`: the tool is right but the args don't match.
       - `pass`: both the tool and the args are right.
   - `summarize(results)` takes `{ case, outcome, ms, tokens }[]` and returns:
     - totals: pass count and percent, and counts for each outcome;
     - per tag and per role: pass percent;
     - clarify rate, meaning the share of all answers that were `clarify`;
     - p50 and p95 latency in ms;
     - average and total prompt, output and thinking tokens;
     - the list of failed cases, with id, text, expected, and got (kind + args JSON).
   - `renderReport(summary, meta)` returns Markdown. `meta` holds the model name, date, and run count.

2. `src/features/ko-account/eval/ko-eval.live.test.ts`: the live runner, written as a vitest file so the `@/` aliases work.
   - Wrap the whole file in `describe.skipIf(process.env.KO_EVAL !== '1')`, so it is skipped in CI and in `npm run check`.
   - Read the key from `GOOGLE_GENERATIVE_AI_API_KEY`.
   - For each case, call `planIntent(role, { text }, key, AbortSignal.timeout(30_000), context, history ?? [], fetcher)`.
     - `fetcher` wraps `fetch` and reads `usageMetadata` from `response.clone().json()`.
     - Run the cases one by one, waiting `KO_EVAL_GAP_MS` between calls (default 4500, for the free tier).
     - If a call throws (HTTP 429 or a timeout), wait 20 s and retry it once. If it fails again, record the outcome `no_call` with the error text.
   - `KO_EVAL_ONLY` is an optional comma-separated list of case ids, for quick reruns.
   - Write the report to `docs/ko/eval/<YYYY-MM-DD>-baseline.md` and the raw results to `docs/ko/eval/<YYYY-MM-DD>-baseline.json`. Use `localDate(new Date(), 'Africa/Cairo')` for the date.
   - Test timeout: 20 minutes.
   - The test must never fail because of the score. It only writes the report, so `expect(results.length).toBe(cases.length)` is the one assertion.

3. `src/features/ko-account/eval/score.test.ts`: deterministic unit tests for `normalize`, every outcome of `matchCase` (including array expects and missing args), and `summarize` percentiles and percentages on a fixed small input.

## How it is run (by the reviewer, not by you)
```
node --env-file=.env.local node_modules/vitest/vitest.mjs run src/features/ko-account/eval/ko-eval.live.test.ts
```
with `KO_EVAL=1` set. Do not run it yourself. There is no key in your sandbox.

## Files
- New: `src/features/ko-account/eval/score.ts`, `score.test.ts`, `ko-eval.live.test.ts`.
- Read only: `src/features/ko-account/eval/cases.ts`, `src/features/ko-account/data/intents.ts`, `src/features/ko-agent/gemini.ts`.

## Out of scope
- Any change to `intents.ts`, `gemini.ts`, the prompts, the tools, or the cases. This card only measures.
- No new dependency. No `.env*` changes.

## Rules
AGENTS.md applies:
- max 250 lines per file;
- no `any`;
- `import type`;
- no `console.log`;
- deterministic unit tests.

The live test file may use `setTimeout` waits because it is skipped unless `KO_EVAL=1`.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account`
- `npx vitest run src/features/ko-account`

All three must pass, and the live file must show as skipped.
