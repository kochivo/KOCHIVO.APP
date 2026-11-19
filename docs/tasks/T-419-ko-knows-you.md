# T-419: KO knows who you are, chats naturally, and its phone sheet clears the status bar

**Depends on:** none · **Status:** ready · **Source:** owner screenshot 2026-11-19 («درب ال ai افضل من كده»)

## Owner report (captain account, phone, installed app)
- «انا اسمي ايه» → «مش لاقي إجابة واضحة في بياناتك.»
- «عارفني؟» → a dump of the team summary (inactive players, expiring subscriptions, crown).
- An earlier reply said «٣ لاعيبة» with an Arabic-Indic digit. The app uses Latin digits everywhere.
- **The KO sheet starts under the iPhone status bar.** The clock and battery sit on top of the sheet header. At the bottom, the edge of the bottom nav (labels and the lime centre button) shows under the sheet.

## Root causes
- **No facts about the user.** `ko-account/data/facts.ts` sends Gemini the workout, nutrition, progress, captain, team and player sections, but nothing about the person asking: no name, no role. So identity questions have no facts, and `answer` falls back to `clarify_answer`.
- **Nothing tells the model how to handle small talk.** Greetings, «عارفني؟», «انت مين», «تعرف تعمل ايه» and thanks get no guidance, so the model grabs the nearest read tool (`team_summary`).
- **The fallback text is a dead end.** `clarify_answer` does not say what KO can help with.
- **Some reply paths skip `latinDigits`.**
- **The sheet height is computed** as `calc(var(--visible-viewport-height, 100dvh) - var(--safe-top) - 0.75rem)` with `bottom-0` (`ko-preview/components/ko-panel.tsx:43/55`). On the iPhone standalone app this put the top edge under the status bar and did not cover the nav.

## What to build
1. **A `me` facts section for both roles.** Add `me` to `answerSources` (`ko-core/answer-sources.ts`), with a source-chip label in `ko-preview` messages (`ar`, `arStd`, `en`) and `fallbackBySource.me` = clarify.
   - **Player:** their name, role «player», their captain's name, coaching start date, goal and training days from the intake if present.
   - **Captain:** their name, role «captain», public page or brand name if set, roster count, and plan name if readable.
   - Read through existing queries and RLS. No migration. Keep the 3,000-byte budget and the uuid/contact scrubbing in `formatFacts`.
2. **Small talk and identity go to `answer` with the `me` facts.** Add to the system prompt in `planIntent` (and the `answer` description):
   - For greetings, «عارفني؟», «انا مين / اسمي ايه», «انت مين», «تعرف تعمل ايه», thanks or compliments, use `answer` with source `me`.
   - Reply warmly in 1–2 short sentences, using the user's first name.
   - For «تعرف تعمل ايه», list 3–4 things KO can do for that role.
   - Never use `team_summary`, `player_summary` or other read tools unless the user asks about the team or a player.
   - Keep the KO voice rule.
3. **A useful fallback.** Replace `clarify_answer` with role-aware text that says what KO can help with, in all three styles. Example (`ar`, captain): «المعلومة دي مش عندي. أقدر أقولك مين واقع من لاعيبتك، أو أعمل برنامج، أو أفكّر لاعب.» Player: «المعلومة دي مش عندي. أقدر أقولك تمرينك، أكلك، أو تقدمك.» Keep it short and plain.
4. **Latin digits in every KO reply.** Run every text KO returns (answers, reads, quick replies, clarify questions, model questions) through `latinDigits` at one place in the route's reply path. Do not touch numbers inside approval tokens or payloads.
5. **Sheet anchoring on phones.** Anchor the interactive phone sheet with `top: calc(var(--safe-top) + 0.75rem)` and `bottom: 0` (logical `inset-block`), instead of a computed height. It must:
   - never go under the status bar;
   - fully cover the bottom nav;
   - keep the keyboard behavior and the drag-to-close.
   - Keep everything else in T-409's look the same. Add `pb` safe-area padding to the composer if needed.
6. **Eval cases** in `ko-account/eval/cases.ts`, expected to route to `answer` with source `me`, for both roles:
   - «انا اسمي ايه»
   - «عارفني؟»
   - «انت مين»
   - «تعرف تعمل ايه»
   - «شكرا»
   - «صباح الخير»
   - Franco «ana esmy eh»
   - English «who am I»

   Also add negative cases: «مين واقع من لاعيبتي» stays `team_summary`, and «عندي تمرين ايه النهارده» stays `my_workout`.

7. **Remove the Gemini line under the composer** (owner decision 2026-11-19). In `ko-preview/components/ko-chat.tsx:252`, delete the `<p>` that shows `accountPrivacy` / `chatPrivacy`.
   - Remove both keys from `ko-preview` messages in `ar`, `en` and `arStd`.
   - Update `ko-entry.test.ts` and the dev demo (`src/app/[locale]/dev/ko/demo.tsx`) so they no longer use those keys.
   - Do not touch the legal pages: the privacy policy keeps the Gemini disclosure.

## Out of scope
- New tools.
- The paid model.
- Meal photo (T-405).
- Migrations.
- No new dependency.

## Tests (deterministic)
- `formatFacts` includes a `[me]` line with the name for both roles, and still has no uuid, phone or email.
- `reviewAnswer` accepts an answer that cites `me`.
- With the mocked model returning `answer` for «عارفني؟», the reply contains the first name.
- The fallback text is role-aware.
- Arabic-Indic digits in any KO reply become Latin.
- Sheet source test: the interactive phone sheet uses the safe-top anchor and not the computed `--ko-sheet-height` (update `sheet-surfaces` / KO panel tests).

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-core src/features/ko-preview src/features/ko-entry src/app`
- `npx vitest run src/features/ko-account src/features/ko-core src/features/ko-preview src/features/ko-entry src/ui src/core/i18n/coverage.test.ts src/lib/shared-surface-imports.test.ts`
