# T-402: KO accuracy fixes from the baseline eval

## Goal
The baseline eval (`docs/ko/eval/2026-11-19-baseline.md`) scored 83/100. It found 5 unsafe actions and 7 messages where KO gave no answer. Fix the causes in code so that:
- KO never proposes a change with values the user did not say;
- pain and machine-busy messages always reach `swap_exercise` or `clarify`.

No UI change. No look change.

## Findings and required fixes

### 1. Enum values never reach Gemini (cause of 6 of the 7 `no_call` results)
`geminiParameters()` in `src/features/ko-account/data/intents.ts` copies only `type`, `properties`, `items` and `required`. It drops `enum`, so Gemini never learns that `reason` must be `injury | busy | discomfort` and `injury` must be `knee | shoulder | lower_back`. Gemini then sends values like "ركبة", `parseIntent` rejects them, and KO answers «مش فاهمك».

The fix:
- Keep `enum` (Gemini supports `enum` on `STRING`).
- Keep `description` when the JSON schema has one.
- Keep `minimum` and `maximum` for numbers.
- Add `.describe()` text to the `reason` and `injury` fields: say which words map to which value, for example ركبة/knee → `knee`, كتف/shoulder → `shoulder`, ضهر من تحت/lower back → `lower_back`.

### 2. When Gemini's arguments fail validation, ask instead of saying «مش فاهمك»
Today `parseIntent` returns `null` and the route says `unclear`. Change the behavior:
- When the tool name is allowed but the args fail the schema, return a `clarify` intent with a fixed, translated question that fits that tool. Example for `swap_exercise`: «أنهي تمرين، والوجع فين بالظبط؟».
- Strings live in `src/features/ko-account/messages.ts`, in both `ar` and `en`, plus `arStd` if the file has it.
- `planIntent` has no locale, so return a marker the route can translate. One option: `{ kind: 'clarify', args: { question: '' }, reason: 'swap_exercise' }`, resolved in the route or in `executeIntent` with `t()`. Choose the smallest clean design and keep `Intent` typed.

### 3. Mutations must be grounded in what the user said (the 5 unsafe actions)
Add a pure function `groundIntent(intent, text)` in a new file `src/features/ko-account/data/ground.ts`. It runs after `planIntent` and before `executeIntent`, only when the request has text. Audio has no text, so for audio, keep today's behavior, where every mutation is still only a preview with the «نفذ» confirm step.

It turns these intents into the translated `clarify` from fix 2:

| Intent | Turn it into clarify when |
|---|---|
| `update_exercise` | Neither `sets` nor `reps` is set. Or a set value does not appear as a number in the text (Latin or Arabic-Indic digits, or a number word from 1 to 20 in Egyptian or standard Arabic, such as تلاتة/ثلاثة/أربعة/اربعة). Or the text is relative («زود», «قلل», «شوية», «more», «less») and no absolute number follows. Or `exercise` is generic: «التمرين», «تمرين», «exercise», «the exercise». |
| `renew_subscription` | The text has no duration. A duration is a number of days, or a period word: يوم/أيام/days, أسبوع/week (7), شهر/month (30), شهرين (60), 3 شهور/تلات شهور (90), سنة/year (365). When a period word is present, the `days` value must equal its mapping. |
| `create_training` | The text has no digit, no weekday name (السبت..الجمعة, sat..fri, saturday..friday), and no day-count word (يومين, تلات أيام, 3 days...). |
| `create_nutrition` | The kcal number Gemini sent does not appear in the text. |

Earlier turns can carry the values when KO asked a question and the latest turn answers it. Ground against the latest user text plus the last KO question in `history`. Never use older user turns.

### 4. Tool descriptions (3 of the 4 `wrong_tool` results)
In `intents.ts`:
- `send_reminder`: add the Egyptian verbs فكّر/فكره/ذكّر/ابعتله تنبيه.
- `player_summary`: when one player is named, use this tool even for questions like «بقاله كتير ما جاش» or «اختفى».
- `team_summary`: covers only this captain's roster. It does not cover payments or dues, or another captain's players. Those go to `clarify`.

## Files
- Edit: `src/features/ko-account/data/intents.ts`, `src/features/ko-account/data/route.ts` (call `groundIntent`), `src/features/ko-account/messages.ts`, and `execute.ts` only if needed for the clarify marker.
- New: `src/features/ko-account/data/ground.ts`, `src/features/ko-account/ground.test.ts`.
- Update the existing tests in `src/features/ko-account/*.test.ts` that cover `parseIntent` and `geminiParameters`.

## Out of scope
- `eval/cases.ts`, `eval/score.ts`, and the live eval file. The reviewer reruns the eval with the real key.
- `ko-agent/gemini.ts` (the demo), other features, and the UI.
- No new dependency. No `.env*` changes. No migration.

## Tests (deterministic)
- `geminiParameters` keeps `enum`, `description`, `minimum` and `maximum`, including nested ones.
- `parseIntent`, for an allowed tool with bad args, returns the clarify marker. For a tool that is not allowed, it still returns `null`.
- `groundIntent`, with one test per row of the table above, using the eval texts:
  - «زود البنش ليوسف شوية» → clarify
  - «زود مجموعة في السكوات لمنة» → clarify
  - «خلي التمرين 4 مجموعات» → clarify
  - «جدد اشتراك يوسف» → clarify
  - «عايز برنامج لمحمود» → clarify
  - and positive cases that pass through unchanged: «خلي البنش ليوسف 4 مجموعات», «جدد اشتراك يوسف شهر» with days 30, «جدد ليوسف 45 يوم», «برنامج لمحمود 3 أيام», «سعرات 2200» with kcal 2200.
- Audio requests (no text) are not grounded.

## Rules
AGENTS.md applies:
- max 250 lines per file;
- no `any`;
- `import type`;
- every user-facing string in `messages.ts`;
- no `console.log`.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-agent`
- `npx vitest run src/features/ko-account src/features/ko-agent`
