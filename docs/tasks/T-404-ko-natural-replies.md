# T-404: KO answers like a person, from the user's real data, in the same single call

Owner, 2026-11-19: KO must be dynamic and give clear answers that fit the question. Today every read answer is a fixed template. Examples:
- «الفطار: أرز أبيض مطبوخ، 204 جم»;
- «مش لاقي التمرين ده في خطتك»;
- a list when the player asked «أنا ماشي كويس؟».

**Constraint: still one Gemini call per message.** We are on the free tier (500 requests per day for the whole site). Do not add a second "compose" call.

## Idea
Before the single Gemini call, load a small **facts pack** for the signed-in user. Then give the model a new `answer` tool, so it can reply in natural Egyptian Arabic (or the user's language) from those facts. Action tools (log meal, swap, renew, create plan, and so on) stay exactly as they are, with the same approvals.

## What to build

### 1. Facts pack (new `data/facts.ts`, pure formatter plus a loader)
The loader runs in parallel with the usage take, before `planIntent`. Its budget is about 1,500 tokens; trim lists to fit.

**Player:**
- today's and tomorrow's workout: title and exercises with sets and reps, or rest day, or no program. Reuse `playerWorkout`.
- today's nutrition: plan meals with their foods and portions, the meals already logged today, and the kcal/protein remaining and target. Reuse `playerNutritionPlan`, `playerMealLogs` and `nutritionDay`.
- progress: this month done/planned/adherence, rank and points, distance to the crown, last workout date. Reuse `readProgress` internals; export a data function if needed.
- captain name.

**Captain:**
- a roster summary: count; players inactive 7+ days (names, max 10); subscriptions ending within 7 days (names and dates, max 10); this month's crown leader.
- the current screen's player summary when `contextPlayer` is set. Reuse the `player_summary` and `team_summary` data.

**Format:** compact, labeled lines with stable section ids, for example:
```
[workout_today] ...
[nutrition_today] ...
[progress] ...
```
- Use Latin digits.
- No ids, emails or phone numbers.
- Cache nothing across requests.

### 2. The `answer` tool (`intents.ts`, both roles)
- Schema: `z.strictObject({ text: z.string().trim().min(1).max(700), sources: z.array(z.enum([...section ids])).min(1).max(4) })`.
- Description:
  > Answer the user's question in 1-4 short sentences, in the user's language and dialect (Egyptian Arabic by default). Use only the facts given. Prefer the exact numbers from the facts. If the facts do not contain the answer, say so in one sentence and suggest asking the captain. No medical advice. Never claim something was saved or changed.
- The facts pack goes into the system instruction under a heading «Facts about this user (trusted, from the database)». The user text stays untrusted, as today.
- System rule: «For questions answer with `answer`. For anything that changes data, use the action tools.»
- The existing read tools stay as a fallback:
  - `my_workout`, `read_nutrition`, `read_exercise`, `my_progress`, `why_not_counted`, `player_summary`, `team_summary`.
  - Remove their "prefer" wording so the model picks `answer` for normal questions.

### 3. Safety check on every `answer` (pure, unit-tested: `data/answer-guard.ts`)
- **Numbers:** every number in `text` (Arabic-Indic digits normalized to Latin) must appear in the facts pack or in the user's message. Allow 0-10 as small words or counters.
- **Banned:** links, phone numbers, and the words "حفظت/سجلت/اتسجل/غيرت" claiming an action.
- **Length:** at most 700 characters.
- **If the check fails,** do not show the model text. Answer with the existing template for the first cited source. This needs a mapping:
  - `workout_today` → `my_workout`;
  - `nutrition_today` → `read_nutrition`;
  - `progress` → `my_progress`;
  - and so on.
  - Log `console.warn('KO answer guard', reason)` with the reason name only.
- **Kill switch:** server env `KO_ANSWER=0` turns off the `answer` tool and the facts pack. When the switch is off, today's behavior is unchanged. Add the key, empty, to `.env.example`.

### 4. A follow-up feels like a conversation
- History already goes to the model. Keep it.
- The `answer` text becomes part of the KO turn in history, as today.

### 5. Source chips (small, existing style)
- Under an `answer` bubble, show the cited sources as small text chips: «خطة الكابتن», «أكل النهارده», «تقدّمك», «لاعيبتك».
- Use the `text-xs text-muted rounded-chip border border-line px-inline` style used elsewhere. They are read-only.
- Add an optional `sources` array to the wire message (zod, max 4) and pass it through `playerReply`.

## Eval
- Add 12 cases to `eval/cases.ts` with `expect: 'answer'`, mixing player and captain. For example:
  - «أنا ماشي كويس الشهر ده؟»
  - «فاضلي كام سعرة النهارده»
  - «الغدا بتاعي إيه»
  - «مين من لاعيبتي بقاله كتير ما جاش»
  - «عندي تمرين ايه النهارده»
- Keep the action cases unchanged: they must still route to their action tools.
- Also add 3 guard cases with mocked model output carrying a made-up number; they must fall back to the template.

## Out of scope
- T-405 meal estimate.
- The UI layout (T-409).
- Migrations.
- No new dependency.

## Tests (deterministic, inject `now`, mocked fetch)
- **`facts`:** player and captain packs; trimming to budget; no ids or emails; rest day; no program.
- **`answer-guard`:**
  - a number from the facts passes;
  - a made-up number fails;
  - Arabic-Indic digits are normalized;
  - an action claim fails;
  - a link fails.
- **Route:**
  - a model `answer` returns the text plus `sources`;
  - a guard failure returns the template;
  - with `KO_ANSWER=0`, the tool is absent and no facts are loaded;
  - still exactly one Gemini fetch per message.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/ko-core src/features/ko-preview src/features/ko-agent`
- `npx vitest run src/features/ko-account src/features/ko-core src/features/ko-preview src/features/ko-agent src/core/i18n/coverage.test.ts src/lib/timezone-source.test.ts`

Report in the AGENTS.md final format, with a one-line description of every visible change.
