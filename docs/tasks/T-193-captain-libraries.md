# T-193: Training plans, meal plans and foods libraries (mockup v6-rest)

**Phase:** Captain workspace v6 (owner: "100% UI/UX and backend") · **Depends on:** T-189, T-190 · **Status:** ready
**Migration:** none expected. **Flag:** behind `captainWorkspaceEnabled()`; flag off byte-identical.

Read first: `docs/mockups/captain-workspace/v6-rest.html` (screens «خطط التمارين», «الأنظمة الغذائية», «مكتبة الأكلات») and `docs/mockups/captain-workspace/v6-spec.md`. Reuse the shared UI from `src/ui/` (T-188) and the editors from T-189 (training) and T-190 (nutrition).

## Files
- `src/features/templates/` (training plans library) and tests.
- `src/features/meal-plans/` library page for plan templates (new route `src/app/[locale]/(captain)/captain/library/meal-plans/page.tsx`, thin) and the foods library components.
- `src/features/roster/nav.ts` only to point «الأنظمة الغذائية» at the new route.
- Messages (`ar`/`en` only). This card.

## Requirements
1. **خطط التمارين:** header, subline, primary «خطة جديدة»; level chips (الكل، مبتدئ، متوسط، متقدم) and search; cards (level pill, title, «{days} أيام · {minutes} دقيقة · {place}», «مع {n} لاعيبة» / «مش مستخدمة», «افتح»). Opening a plan uses the same training editor as the player file (T-189) in template mode. Keep existing actions (duplicate, archive, assign to player) in a ⋯ menu.
2. **الأنظمة الغذائية:** header, subline, primary «نظام جديد»; one row per plan template (icon, title, «{meals} وجبات · {protein} بروتين · …», «مع {n} لاعيبة» / «مش مستخدم», chevron). Opening uses the T-190 editor in template mode. Empty: one line «لسه معملتش نظام» + the primary button. Fix the duplicated «نظام جديد» cards for good. Assigning a template to a player copies it into that player's plan.
3. **مكتبة الأكلات:** chips الكل/أكلاتي/العامة with counts, search (Arabic or English); table header «الأكلة · لكل 100 جم», سعرات، بروتين، كارب، دهون، وحدات (shown only when present, e.g. «معلقة · 10 جم»), في أنظمة (count). Keep add/edit/delete of own foods and units.
4. Feature inventory per `v6-spec.md` for all three screens.
5. Copy every Arabic string from the mockup exactly. `ar` + `en` only.

## Acceptance
- [ ] Matches the three mockup screens at 1440×900 and 390×844 (differences listed).
- [ ] Feature inventory, nothing dropped.
- [ ] Unit tests: filters, search (Arabic/English normalisation), usage counts in one query, template → player copy.
- [ ] Flag off byte-identical; all gates pass; budgets unchanged.
