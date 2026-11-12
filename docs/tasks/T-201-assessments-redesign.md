# T-201: Assessments library and editor (mockup v6-assessments)

**Phase:** v6 owner review round 2. The owner approved the mockups on 2026-11-12 and wants them **100% like the mockup**. · **Status:** ready · **Depends on:** none
**Flag:** behind `captainWorkspaceEnabled()`. With the flag off, output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd` (see docs/I18N-STYLE.md) and `en`. Copy every Arabic string from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, touch targets at least 48px, 250 lines max per file, no new deps, no Get-Content/Set-Content on text files, no commits.
**Migration:** only if the duplicate fix needs a unique guard. In that case write a new additive migration, and ask the reviewer for its number. Do not pick one yourself.

Read first, in full: `docs/mockups/captain-workspace/v6-assessments.html` (all three screens).

## Files
- `src/features/forms/`: library page, list and metrics; assessment editor, fields, schedule entry and preview; messages and tests.
- `src/app/[locale]/(captain)/captain/library/forms/page.tsx` (thin), if needed.

## Requirements
1. **Bug: duplicate assessments.**
   - The library showed three «المتابعة الأسبوعية» copies, two of them assigned to all players.
   - Find why. It is likely a starter template copied on every visit.
   - Fix the cause so a starter is copied only when the captain taps it.
   - Do not delete captain data. Report what you found.
2. **Library**
   - Title and subline: «الأسئلة اللي اللاعبين بيجاوبوها كل فترة · {n} تقييمات شغالة · {m} إجابات مستنياك».
   - Primary button «تقييم جديد».
   - One card per assessment, showing:
     - status pill (شغال/متوقف) and waiting count;
     - title;
     - the «{n} أسئلة: …» question list;
     - schedule, like «كل جمعة · لكل اللاعبين (12)»;
     - last answer;
     - a ⋯ menu.
   - Remove the unlabeled number tiles.
   - Template chips «ابدأ من قالب جاهز».
3. **Editor schedule**
   - One sentence: «بيتبعت [كل أسبوع] يوم [الجمعة] لـ [كل اللاعبين] ولو ما جاوبش [فكّره بعد يوم]».
   - Use themed dropdowns, not native white menus.
   - If reminders are not supported yet, show that part disabled with the existing hint «التذكير هيبقى متاح قريب».
4. **Questions**
   - Collapsed by default.
   - Each header summarises itself: type · unit · «بيتسجل في ملف اللاعب: الوزن» · «بينبّهك لو أقل من 6».
   - An open question shows, in order:
     - the Arabic question input;
     - «+ اكتب السؤال بالإنجليزي (اختياري…)». English becomes optional, and the player falls back to Arabic;
     - the answer type as five cards: رقم، مقياس، اختيار، كلام، صورة;
     - toggles: لازم يجاوب / رسم بياني / نبّهني;
     - the alert as one sentence: «نبّهني لو الإجابة [أقل من] [6]»;
     - actions: ↑ ↓ كرّر شيل.
5. **Adding and preview**
   - «+ سؤال جديد» with quick chips.
   - A live player preview beside the editor («اللاعب بيشوفه كده»), stacked under it on mobile.
6. **Wording:** replace «الإجابة تروح فين؟» with «بيتسجل في ملف اللاعب: …».

## Feature inventory (nothing lost)
- All question types.
- Required, chart, profile field mapping, alert rules.
- Reorder, duplicate, delete.
- Templates.
- Per-player schedules (0096).
- View as player.
- Autosave and save status.
- Validation errors.

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Tests:
  - no duplicate starter on repeated visits;
  - optional English with Arabic fallback;
  - the alert sentence matches the stored rule both ways;
  - collapsed summaries.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
