# T-243 — Captain v11: player file

**Phase:** captain v11 fidelity · **Depends on:** T-238 · **Status:** ready

Read `docs/tasks/V11-FIDELITY.md` first. It is part of this card.

## Goal
`/captain/players/[playerId]` matches the mockup `player` screen exactly, in all six tabs.

## Files
- `src/features/player-profile/*` (workspace path). New files are allowed.
- `src/features/captain-workspace/player-file/*`, if the file panel lives there
- the messages files of those features
- tests next to them

## Requirements
1. **Head bar:**
   - a back icon button;
   - a large avatar;
   - the name, and «<goal> · باقي <n> يوم · <rank>»;
   - the glass buttons «شوف زي اللاعب» (the existing preview, desktop only) and «رسالة» (opens the chat).
2. **Tabs:** نظرة عامة، البرنامج، الأكل، المتابعات الأسبوعية، التقييمات، الشات.
3. **نظرة عامة.**
   - A row of three cards (`g3`):
     - a training-adherence ring, «3 من 4 الأسبوع ده», and the last RPE;
     - today's food: a calories ring plus legend bars for protein, carbs and fat, as logged against the target;
     - القياسات: weight, body fat and best squat, each with a change pill.
   - A row of two cards:
     - صور المتابعة: the first and last photos, with a «كلها» link to the check-ins tab;
     - آخر تمرين: the day name and when, then each exercise with sets×reps, weight and an RPE pill.
4. **البرنامج.**
   - The program name, a week pill «الأسبوع 6 من 12», «غيّر البرنامج» and «عدّل».
   - Day tabs, and exercise rows with sets×reps, rest and weight.
5. **الأكل.**
   - The plan name, «غيّر النظام», and the meals with what they contain, calories, and a logged or not-yet pill.
   - Beside that, today's calorie ring and macro legend.
6. **المتابعات الأسبوعية.** Rows show the week, date, weight and photo count, a new or reviewed pill, and «افتح».
7. **التقييمات.** Cards show the title, date and key numbers, plus a «تقييم جديد» card.
8. **الشات.** The same bubbles and compose box as T-241.
9. Where a metric has no data (for example no squat best), hide that line. Do not show a dash row.

## Acceptance
- [ ] All six tabs match the mockup at desktop and at 390px.
- [ ] There are tests for the change pills, the adherence text and the hidden empty metrics.
- [ ] `npm run check` and `npm run build` pass, and the route stays within 310 KiB.

## Out of scope
- Assessment and check-in data models.
