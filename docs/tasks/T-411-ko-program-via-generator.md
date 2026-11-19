# T-411: KO builds training programs with our generator, not by having Gemini write exercises

**Start after T-404 has landed.** It touches the same `intents.ts`, `execute.ts` and route.

## Owner report, 2026-11-19
The captain asked «اكتبله برنامج تضخيم», then «لعلى و٣ ايام», then «اعمله برنامج حسب بياناته من ٣ ايام». The replies were:
- «مش قادر أكمّل دلوقتي. جرّب تاني.»;
- «في اسم مش واضح أو يوم متكرر. ابعتلي الأسماء زي ما مكتوبة في المكتبة».

## Root cause
- `create_training` asks Gemini to output every day and exercise name.
- On the free Flash-Lite tier this long output often hits the 18 s timeout in `ko-agent/gemini.ts`. That causes the generic 502 and the «مش قادر أكمّل» text.
- When it does finish, `buildDraft` needs each name to match exactly one catalog row (`matchNamed`). Free-text names fail, so KO asks the captain to type library names. A captain should never need to do that.
- The app already has a tested deterministic generator: `@/features/program-generator`, with `generateProgram(brief, candidates)`, `generatorBriefSchema`, `loadCandidates`, and the `initialBrief(intake)` defaults.

## What to build
1. **New `create_training` schema.** It is a brief only, so Gemini returns a short object:
   ```ts
   { player?: name, title?: title,
     goal?: 'fat_loss'|'muscle'|'strength'|'general',
     days?: int 2..6,                // "3 ايام"
     weekdays?: int[] (0 Sunday..6) // only if the captain named days
     minutes?: 45|60|90, level?: 'beginner'|'intermediate'|'advanced',
     equipment?: 'bodyweight'|'dumbbells'|'gym', injuries?: ('knee'|'shoulder'|'lower_back')[] }
   ```
   - Description: «Captain asks to create a training program. Extract only the brief: goal (تضخيم/عضل → muscle, تنشيف/خسارة دهون → fat_loss, قوة → strength), number of days or named weekdays, session minutes, level, equipment, injuries. Never list exercises. Leave unknown fields empty; the player's intake fills them.»
   - Arabic-Indic digits («٣») must parse. Normalize them before zod, or make sure the model output is a number.
2. **Build the draft in our code** (new `data/training-draft.ts`; keep `drafts.ts` for nutrition):
   - **Defaults** come from the player's intake through the same mapping as `initialBrief`. Reuse it by exporting a server-safe helper from program-generator if needed; no deep imports.
   - **"حسب بياناته"** means use the intake. Explicit values in the message win.
   - **Days without weekdays:** spread them evenly, Builder-week style: 3 → Sat/Mon/Wed, 4 → Sat/Sun/Tue/Wed, 5 → Sat–Wed, 6 → Sat–Thu. Keep the generator's Saturday-based weekday convention, and convert correctly to the approval payload's `weekday` (0 = Sunday).
   - **Default title:** «برنامج {goal} {days} أيام – {player}», unless a title is given.
   - **Seed:** derived deterministically from the approval id; no `Math.random`.
   - Call `loadCandidates` with the captain's client, then `generateProgram`. Map the generated days and exercises (sets, reps_min/reps_max, rest) into the existing `training` approval payload. Reuse `toProgramDraft` where it fits.
   - **If generation fails** (`invalid_brief`, empty catalog), say a clear short message, for example «مش قادر أعمل البرنامج دلوقتي، جرّب من مولّد البرامج في صفحة اللاعب.» Never ask for library names.
3. **Preview text:** one line per day, «السبت – صدر وتراي: بنش برس 4×8-10، ...», plus a final line «تقدر تعدّل التمارين بعد الحفظ من محرر البرنامج.»
4. **Credits (T-406):** still exactly 1 big-action credit on confirm, as today.
5. **Confirm and apply:** unchanged. `ko_apply_action` already takes the `training` payload.
6. **Timeout:** with the short brief, 18 s is enough; keep it.

## Messages
- All strings go in `ko-account/messages.ts` and the arStd file, with `ar`, `arStd` and `en`. The `catalog` text stays only for nutrition.

## Out of scope
- Nutrition drafts. They keep today's flow; a later card covers them.
- UI.
- Migrations.
- No new dependency.

## Tests (deterministic)
- The brief parses from «برنامج تضخيم ٣ ايام» (mocked model args `{goal:'muscle', days:3}`).
- Intake defaults fill missing fields. Explicit values override intake.
- 3, 4, 5 and 6 days map to the right weekdays, with the payload weekday conversion checked.
- With a fixed candidate list, the generated payload has exercise ids from the list, no duplicates per day, and a title.
- `invalid_brief` → the friendly message, not `catalog`.
- The credit is still taken once on confirm.
- Eval: update the `create_training` cases in `eval/cases.ts` to the brief form.

## Checks
- `npx tsc --noEmit -p .`
- `npx eslint src/features/ko-account src/features/program-generator`
- `npx vitest run src/features/ko-account src/features/program-generator src/core/i18n/coverage.test.ts`
