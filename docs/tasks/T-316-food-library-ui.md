# T-316 — Food library UI (v2)

Owner decision 2026-11-16: build the food library from `docs/mockups/food/food-library-v2.html` into the real captain library at `/captain/library/foods`. Match the mockup 1:1, using real data and real saves. This card depends on T-315, which provides migration 0126 and the new food fields.

## Goal
Upgrade the existing library feature (`src/features/meal-plans/components/library/`, `foods-library-entry.tsx`, `food-form.tsx`, `custom-food-sheet.tsx`, the existing drawer and the picker). Do not build a second library next to it.

1. **Header stats:** all foods, Egyptian, Arabic (Gulf + Levant + North Africa), international, my foods, and recently added (the captain's last added or used foods). Compute these from the loaded list; no new query per stat.
2. **Search:** one field that searches Arabic and English names.
   - Normalize Arabic: أ إ آ → ا, ة → ه, ى → ي, and remove tatweel and diacritics.
   - Map common Egyptian words: فراخ ↔ دجاج, عيش ↔ خبز, لحمة ↔ لحم.
   - Show example chips under the field. Put the matching logic in a pure module with unit tests.
3. **Filters:** region chips (All, Egyptian, Gulf, Levantine, North African, International, My foods, Favorites) and nutrition chips (High protein ≥ 15 g, Low fat ≤ 5 g, Low carb ≤ 10 g, Low calorie ≤ 120 kcal, all per 100 g).
4. **Favorites:** persist per captain. Reuse an existing per-captain store if one exists; otherwise use a new migration `0127_food_favorites.sql` with a table `food_favorites (captain_id, food_id, created_at)`, RLS limited to the owner, and a PGlite RLS test.
5. **Table and cards views**, with a toggle. The table columns are: food (photo, name, other-language name), type, kcal, P, C, F, first household serving, source, status badge, and actions (details, add to plan, favorite).
   - On phones the table becomes cards.
   - Every icon button has a translated aria-label and is at least 48 px.
6. **Details drawer:** photo, both names, state (raw or cooked), and the quantity calculator (grams input, ±10 steppers, serving chips) with live kcal, P, C and F tiles.
   - Show per-100 g facts including fiber, sugar and sodium, with «مش في مصدرنا لسه» when a value is null.
   - Show the source block (FDC number and dataset, recipe ingredient count, closest-match note, or "captain") and a confidence line per status.
   - End with the add-to-plan button.
7. **Status badges:** verified (USDA), recipe, closest match (proxy), captain. There is no "demo" status in production, and no food without a source is shown as verified.
8. **Custom food:** keep the existing form, and add:
   - fiber;
   - a live preview card;
   - the Atwater warning when kcal differs from 4P + 4C + 9F by more than 15% (reuse `macro-check.ts` if it already does this).
9. **Recipe builder (new):**
   - The captain adds ingredients from the library with grams and edits or removes them, then sets the cooked weight.
   - Show the totals, the per-100 g values and the small, medium and large plates (250, 350 and 450 g).
   - Save it as a captain food with `source_kind = 'recipe'` and `source_ref` holding the ingredient ids and grams, using the T-315 columns.
   - Show recipe foods' ingredients in the drawer.
10. **Add to plan:** from the drawer or a row, pick the player, then the meal (from that player's current plan days and meals), then the quantity, and show a preview.
    - Write through the existing plan editor or save path. If the plan editor already has an add-food path, open it pre-filled instead of duplicating the logic.
    - Show the success popup (T-281 style).

## Rules
- AGENTS.md applies in full: files under 250 lines, one component per file, all strings in messages (ar, gated arStd, en; no emoji), tokens only, logical properties, the T-275 click cues and the T-278 spacing.
- Keep the v11 look.
- Performance: the drawer, recipe builder and add-to-plan sheet load with next/dynamic. The library list must stay smooth with about 300 foods plus captain foods; use simple windowing or pagination if it gets heavy. The perf budget must pass.
- Photos: use `foodPhotoUrl`. A missing photo shows the same placeholder as captain foods.
- No KO panel in this card. The «اسأل KO» part of the mockup belongs to the KO phase.

## Tests
- A unit test for the search normalizer.
- Unit tests for the filters (region, nutrition, favorites).
- A unit test for the recipe math (totals, per 100 g, plates).
- Render tests for the drawer facts, including the null fiber label, the badges, and the empty and no-results states.
- An RLS test for favorites if 0127 is added.
- The existing library tests keep passing; update their assertions only where the markup changed on purpose.

## Out of scope
The KO food search, photo generation, prices or budget (T-312), and the player screens apart from showing the new food names and photos where they already appear.

## Gates
npm run typecheck, npm run lint, and the vitest files above. The orchestrator runs build and check.
