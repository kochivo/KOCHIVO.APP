# T-408: KO answers "what is my workout today"

Owner report, 2026-11-19 (screenshot): the player asked «عندي تمرين ايه النهارده» and «تمرين النهارده؟». Both times KO replied «مش لاقي التمرين ده في خطتك. ابعتلي اسمه زي ما مكتوب في الخطة.»

## Root cause
- `ko-account/data/intents.ts` has no player tool for the day's workout.
- Gemini therefore picks `read_exercise` with an exercise name such as «تمرين النهارده».
- `execute.ts` finds no matching row and returns `exerciseMissing`.
- The data already exists: `playerWorkout(ctx, today)` is exported from `@/features/ai-tools/server` and is used by the MCP tool `get_my_workout_today`.

## What to build
1. **New player intent `my_workout`** in `intents.ts`:
   - Schema: `z.strictObject({ day: z.enum(['today', 'tomorrow']).default('today') })`.
   - Description: "Player asks what their workout is today or tomorrow, which exercises, or whether today is a rest day (عندي تمرين ايه النهارده، تمرين النهارده، تمرين بكرة، النهارده راحة؟). Not for one named exercise; use read_exercise for that."
   - Tighten the `read_exercise` description: "Only when the player names a specific exercise."
2. **Execution**, in a new `data/my-workout.ts` if `execute.ts` would pass 250 lines:
   - Player only. A captain gets `unclear`, as with the other player intents.
   - Date: `localDate(now, timezone)` with the player's timezone, plus one day for `tomorrow`. Use the same date helper the code already uses; never `toISOString().slice`.
   - Call `playerWorkout`. It needs a `ToolContext`: build it the way `mealToolContext` does for `log_meal`, or reuse that helper.
   - Replies:
     - **Workout day.** The first line is «تمرين النهارده: {title}» (or «تمرين بكرة: {title}»). Then one line per exercise: «{name}: {sets} × {reps}», with reps shown as `min` or `min-max`. Use the Arabic name when the locale is Arabic, otherwise the English name. Show at most 10 exercises.
     - **Rest day:** «النهارده راحة. ريّح جسمك واشرب مية كفاية.» (and the "بكرة" version).
     - **No active program:** «مفيش برنامج تمرين نشط دلوقتي. اسأل الكابتن.»
3. **Read-only.** No approval, and no credit or credit charge beyond the normal T-406 daily message count.
4. **Eval:** add cases to `eval/cases.ts`:
   - «عندي تمرين ايه النهارده» → `my_workout`;
   - «تمرين النهارده؟» → `my_workout`;
   - «بكرة عندي ايه» → `my_workout`;
   - «السكوات كام عدة» still → `read_exercise`.

## Messages
- All strings go in `ko-account/messages.ts` and the arStd file, with `ar`, `arStd` and `en`.
- Use Latin digits.

## Out of scope
- Natural-language replies (T-404).
- Meal-photo estimates (T-405).
- Any UI change.
- Migrations.
- No new dependency.

## Tests (deterministic, inject `now`)
- The intent parses with and without `day`.
- Execute:
  - a workout day lists the exercises;
  - a rest day;
  - no program;
  - `tomorrow` uses the next local date (test near midnight Cairo);
  - a captain gets `unclear`.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account`
- `npx vitest run src/features/ko-account src/features/ai-tools`

Report in the AGENTS.md final format.
