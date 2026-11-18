# T-378: Meal plans page, tidier (v6 captain, desktop)

**Migration:** none. **Owner decision 2026-11-18:** match screen 2 of canvas page «الاشتراكات والأكل والترتيب» (`docs/mockups/desktop-fixes/h5-02-meals.dc.html`).

## Problem
Five plain cards with calories and macro bars, «مفيش لاعبين عليه», and a lot of empty space.

## Files
- `src/features/meal-plans/components/meal-library-page.tsx`, `refined-meal-card.tsx`, `v11-new-plan.tsx`, `components/v11/**`
- tests. Do not touch `src/features/meal-plans/components/library/**` (T-381 owns it).

## What to build
1. Header subtitle: «{n} أنظمة · {m} لاعبين عليها». Actions stay (write a plan for a player, new plan).
2. Filter row: search by name, and a segmented switch الكل / مستخدمة / مش متعيّنة with counts. Filtering is client-side.
3. Card, three per row on desktop:
   - name, goal tag (from the existing plan goal or day type; draft when unfinished), calories per day on the end side;
   - one split bar for protein, carbs and fat by their calories, with a legend in grams;
   - footer: meals count, then the player avatars and count, or «مش متعيّن لحد» with a «عيّنه» button that opens the existing assign flow.
4. A dashed last card «نظام جديد من الصفر أو من قالب» that opens the existing new-plan flow.
5. Empty state when there are no plans.

## Rules for this card
- Desktop layout stays as it is today (sidebar, header, page width). Only the page content changes. Phone layouts must keep working.
- Change only the v6 workspace view (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). The flag-off markup and its hash tests stay unchanged.
- Strings in ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, as in other v6 message files) and en. Tokens only, logical properties only, 48px targets, files under 250 lines.
- No migrations, no new dependencies, no data writes changed.

## Done when
- Tests cover the filter counts, the macro split maths, the assigned vs unassigned footer, and the empty state.
- `npm run check` passes.
