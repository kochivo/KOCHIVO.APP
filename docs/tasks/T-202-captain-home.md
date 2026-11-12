# T-202: Captain home (mockup v6-home-billing-nutrition, screen «الرئيسية»)

**Phase:** v6 owner review round 2. The owner approved the mockups on 2026-11-12 and wants them **100% like the mockup**. · **Status:** ready
**Depends on:** none. Read follow-up data through the existing inbox/dashboard server exports. Do not edit `src/features/inbox/`, which T-200 owns. · **Migration:** none
**Flag:** behind `captainWorkspaceEnabled()`. With the flag off, output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd` (see docs/I18N-STYLE.md) and `en`. Copy every Arabic string from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, touch targets at least 48px, 250 lines max per file, no new deps, no Get-Content/Set-Content on text files, no commits.

Read first: `docs/mockups/captain-workspace/v6-home-billing-nutrition.html`, screen «الرئيسية» and its notes.

## Files
`src/features/dashboard/`: workspace home components, messages and tests.

## Requirements
1. **Greeting** by the captain's local time: «صباح الخير» before 12:00 and «مساء الخير» from 12:00. Inject `now`, and use the captain's timezone. The date line sits above the greeting.
2. **Summary line:** «عندك {a} مستنيين ردك، و{b} لسه ما دفعوش، و{c} اشتراكهم هيخلص الأسبوع ده». Drop the parts that are zero.
3. **Three tiles:**
   - لاعبين نشطين, with «من {limit} في باقتك».
   - التزام الأسبوع, compared with last week.
   - اتدفع الشهر ده, with the late amount in amber.
   - The currency word is «جنيه» everywhere.
4. **«محتاجينك النهارده»:**
   - Up to 4 rows, taken from follow-up triage plus absent players.
   - An absent player row shows «غايب {n} أيام» and a «ابعتله» button.
   - A link «افتح المتابعة».
5. **Side cards:** «هيخلص اشتراكهم» and «لاعب جديد عايز ينضم». Hide each one when it is empty.
6. **One primary action and the zero-player state:**
   - Show ONE «ضيف لاعب» button, in the header.
   - With zero players, show the three start steps instead of «محتاجينك النهارده». The add button then appears only in step 1.
   - Remove the unexplained «أدوات المتابعة» collapsible. Its links move into the cards above.

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Tests:
  - greeting at 11:59 and 12:00 in two timezones;
  - the summary line drops zero parts;
  - zero-player state;
  - a single primary action.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
