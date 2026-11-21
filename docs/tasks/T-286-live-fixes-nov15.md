# T-286 — Fixes from the owner's phone check (2026-11-15)

**Phase:** production fixes · **Status:** ready
Read `AGENTS.md`, `DESIGN.md` and `docs/tasks/V11-FIDELITY.md` first. The owner tested production on an iPhone (390px wide). Fix each item at its root. Keep the v11 look; do not redesign.

## 1. Food library filters break the list (production bug)
- **What happens:** in captain nutrition → «مكتبة الأكلات», choosing «بروتين» or «كارب» shows «مش قادرين نحمّل. جرّب تاني».
- **Cause:** `searchFoods` in `src/features/meal-plans/data/foods.ts` calls `.contains('tags', [category])`. The `foods` table has no `tags` column. Its columns are `id, owner_id, name_ar, name_en, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, photo_path, source, created_at, seed_key, archived_at, units`. The tests mocked the client, so they did not catch it.
- **Fix:** filter by macros per 100 g. Protein: `protein_per_100g >= 10`. Carbs: `carbs_per_100g >= 20`. Put the two thresholds in one named constant. Do not add a schema change.
- **Test:** add one that records the builder calls and fails if any filter names a column outside the list above.

## 2. Demo: the "who owes money" row breaks the name one letter per line
- **Cause:** in `src/features/demo/guided/money.tsx`, the primary `Button` inside a `DemoRow` is full width on phones (`buttonClass`: a primary button with `block` undefined gets `w-full md:w-auto`). That leaves the name column at 0px.
- **Fix:** buttons inside `DemoRow` never stretch. Wrap the row's `children` in a `shrink-0` slot in `demo-row.tsx`, and pass `block={false}` where needed. Check every `DemoRow` that has a button.
- **Test:** the row's action is not `w-full`.

## 3. Demo: the minimized «كمّل الجولة / Continue tour» button covers content
- It is `fixed bottom-4 start-4` and sits on top of section titles («Package»).
- **Fix:** while the guide is minimized, give the demo stage enough bottom padding (button height + `card-gap` + safe area) so the last content scrolls clear of it. Keep the button.

## 4. Captain home: «ضيف لاعب» shows two plus icons
- `src/features/dashboard/home/home-invite.tsx` overlays `KoPlus` on top of `InviteButton`, which already renders its own icon.
- **Fix:** show one icon only, the KOCHIVO `KoPlus` (v6 rule: main action buttons use `src/ui/icons`). Remove the duplicate without changing `InviteButton` for its other callers. Pass an option or hide its icon on this call site only.

## 5. Captain home: the «… جنيه الشهر ده» ring shows a full blue circle
- With no income goal, the ring draws as a full circle in the calm colour, which reads as "100%".
- **Fix:** without a goal, show only the empty track (same as the other zero rings). With a goal, show progress toward it. Add a test for both cases.

## 6. Floating buttons cover the last content on captain pages
- The KO button («قريبًا») and the feedback button sit over the last card. For example, the tasks empty state «مفيش مهام. عاش يا كابتن.» on home is half covered.
- **Fix:** the captain page shell reserves bottom space on phones: tab bar + floating buttons + `card-gap` + safe area. The last content must be fully visible when scrolled to the end. Fix this once in the shell, not per page.

## 7. Captain nutrition plan editor on phones
- **Targets:** each target («سعرات», «بروتين», «كارب», «دهون») shows a box inside a box (the tile frame plus the input frame). Make each target one tile, with the label and an editable value that keeps the T-275 edit cue. No second frame.
- **Empty state:** «ضيف أول وجبة وابدأ النظام» sits in a frame that looks like a text field. Make it a plain empty-state line (muted text, no field frame) above the single «ضيف وجبة» button. Keep the button as it is.

## Files
- `src/features/meal-plans/`
- `src/features/demo/guided/`
- `src/features/dashboard/home/`
- The captain page shell in `src/features/roster/` or `src/features/captain-workspace/`, wherever the bottom space is set
- `src/ui/` only if a primitive is the cause
- Tests next to each

## Acceptance
- [ ] Each item fixed at its root, with a test where one is listed.
- [ ] At 390px there is no overlap and no letter-per-line text on demo money, captain home or captain nutrition.
- [ ] `npm run check` and `npm run build` pass.
- [ ] No new dependencies, no migrations.

## Out of scope
- The KO morning-summary strip redesign. That is a separate card, waiting for the owner's mockup approval.
- Editing catalog foods (T-287).
