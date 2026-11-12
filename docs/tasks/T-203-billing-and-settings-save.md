# T-203: Billing page + fix settings save (mockup v6-home-billing-nutrition, screen «الدفعات»)

**Phase:** v6 owner review round 2. The owner approved the mockups on 2026-11-12 and wants them **100% like the mockup**. · **Status:** ready · **Depends on:** none · **Migration:** none expected
**Flag:** behind `captainWorkspaceEnabled()`. With the flag off, output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd` (see docs/I18N-STYLE.md) and `en`. Copy every Arabic string from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, touch targets at least 48px, 250 lines max per file, no new deps, no Get-Content/Set-Content on text files, no commits.

Read first: `docs/mockups/captain-workspace/v6-home-billing-nutrition.html`, screen «الدفعات» and its note.

## Files
- `src/features/billing/`: workspace billing components, messages and tests.
- `src/features/settings/`: workspace settings, for the «اشتراكي» section and the save bug.

## Requirements
1. **Bug first: settings save fails.**
   - Saving the captain settings modal fails with «تعذّر الحفظ وتمت استعادة البيانات السابقة».
   - Reproduce it in a test.
   - Find the root cause (payload, schema or RLS) and fix it. Keep the optimistic rollback.
   - Report the cause.
   - Replace that Standard-Arabic message with Egyptian copy in `ar`.
2. **Billing becomes «money from my players» only.**
   - Summary line: «اتدفع الشهر ده {x} جنيه · متأخر {y} جنيه من {n} لاعبين · {m} هيجددوا الأسبوع ده».
   - Primary button «سجّل دفعة».
   - One segment (الكل / متأخر / هيخلص قريب / دافع) plus search.
   - Table columns: اللاعب، الباقة، آخر دفعة، التجديد (as a pill), and the actions «فكّره» / «اتدفع».
   - Side card «باقاتك» with «+ باقة جديدة».
3. **Captain's own KOCHIVO plan moves to settings.**
   - Move «باقتي», its usage «{n} من {limit} لاعب» and its upgrade into settings, as the section «اشتراكي».
   - Keep one small plan line under the sidebar (the existing plan sidebar).
   - One upgrade label only: «رقّي باقتك».
   - Currency word: «جنيه» only.
4. **Empty state:** «لسه مفيش لاعبين. ابعت دعوة من صفحة اللاعبين» plus one button.

## Feature inventory (nothing lost)
- Collect, renew, activate.
- Payment history, balances, waiting room.
- Package CRUD.
- Plan badge and its errors.
- Optimistic updates.
- Loading, error and retry states.

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Tests:
  - settings save regression;
  - segment counts;
  - the plan section lives in settings;
  - a single upgrade action.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
