# T-381: Foods library, no zeros while loading (v6, desktop)

**Migration:** none. **Owner decision 2026-11-18:** match canvas page «إصلاح شاشات الكمبيوتر», screens 5–6 (`docs/mockups/desktop-fixes/f5-05-foods.dc.html`, `f5-06-foods-loading.dc.html`).

## Problem
In `meal-plans/components/library/library-workspace.tsx`, `LibraryStats` renders while loading, so the page shows 0 everywhere, and the `Segmented` tabs wrap.

## Files
- `src/features/meal-plans/components/library/**`, tests. Do not touch other meal-plans components (T-378 owns them).

## What to build
1. Remove the separate stat row. Put the counts inside the tabs (الكل، مصري، أكلاتي، المفضلة).
2. While loading, show the tabs without numbers and a skeleton list with «بنجيب الأكلات...». Never show 0 before the data arrives. An empty result after loading shows the existing empty state.
3. Tabs never wrap. On narrow widths they scroll sideways inside their row.
4. Keep search, filters, new food and new recipe, and the food drawer as they are.

## Rules for this card
- Desktop layout stays as it is today (sidebar, header, page width). Only the page content changes. Phone layouts must keep working.
- Change only the v6 workspace view (`NEXT_PUBLIC_CAPTAIN_WORKSPACE=1`). The flag-off markup and its hash tests stay unchanged.
- Strings in ar, arStd (behind the `NEXT_PUBLIC_INTERNATIONAL` getter, as in other v6 message files) and en. Tokens only, logical properties only, 48px targets, files under 250 lines.
- No migrations, no new dependencies, no data writes changed.

## Done when
- Tests cover: no digits rendered while loading, the counts in the tabs after loading, and the empty state.
- `npm run check` passes.
