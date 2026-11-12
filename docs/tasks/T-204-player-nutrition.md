# T-204: Player nutrition tab (mockup v6-home-billing-nutrition, screen «أكل اللاعب»)

**Phase:** v6 owner review round 2. The owner approved the mockups on 2026-11-12 and wants them **100% like the mockup**. · **Status:** ready · **Depends on:** none · **Migration:** none expected
**Flag:** behind `captainWorkspaceEnabled()`. With the flag off, output stays byte-identical. **Messages:** `ar` (Egyptian), `arStd` (see docs/I18N-STYLE.md) and `en`. Copy every Arabic string from the mockup exactly.
**Rules:** AGENTS.md in full. Tokens only, logical properties, touch targets at least 48px, 250 lines max per file, no new deps, no Get-Content/Set-Content on text files, no commits.

Read first: `docs/mockups/captain-workspace/v6-home-billing-nutrition.html`, screen «أكل اللاعب».

## Files
`src/features/meal-plans/`: the v6 editor under `components/editor/`, item row, household quantity, food picker, targets bar, messages and tests.

## Requirements
1. **Bugs the owner saw.** Fix each one at its cause, with tests:
   - A custom food with no nutrition values was silently counted as 0 kcal.
   - Unit labels were cut off («طبؤ», «الم»).
   - The day total counted only one item.
2. **Targets row:** four tiles (سعرات، بروتين، كارب، دهون) showing target vs planned. A tile's bar turns amber when over.
3. **Day type:** segment «يوم تمرين / يوم راحة», with the note about the difference.
4. **Meal cards**
   - The header shows the meal totals.
   - Each food row shows:
     - photo and name;
     - a macros line per 100 g;
     - quantity input plus the full unit label, like «طبق (200 جم)» or «جرام»;
     - kcal;
     - remove.
   - A food with missing values gets an amber row «مفيش قيم غذائية · كمّلها» that links to the existing food editor.
   - That food shows «؟» instead of 0, and the totals mark themselves as incomplete.
5. **One add path per meal**
   - Inline search «ضيف أكلة للغدا…», with «+ أكلة جديدة مش في المكتبة» inside it.
   - Remove the second add button.
   - «+ وجبة» below the meals.
6. **Player facts** card beside the editor (existing facts).

## Feature inventory (nothing lost)
- Food picker, custom foods, units, alternatives.
- Reorder and remove.
- Training/rest copy.
- Manual targets, calculator, smart notes.
- Autosave, send to player, template mode.

## Acceptance
- [ ] Matches the mockup at 1440×900 and 390×844; differences listed.
- [ ] Tests:
  - a food with missing values is not counted as 0;
  - totals sum all items;
  - unit labels are never truncated;
  - a single add path per meal.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.
