// Shared with supabase/tests/food-library-columns.test.ts, which runs these against the real migrations:
// a column the database lacks fails the whole library load, not just one field.
export const FOOD_COLUMNS = ['id', 'owner_id', 'name_ar', 'name_en', 'photo_path', 'kcal_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'units'] as const;

export const FOOD_LIBRARY_SELECT = `${FOOD_COLUMNS.join(',')},region,state,diet_tags,fiber_per_100g,sugar_per_100g,sodium_mg_per_100g,source_kind,source_ref,meal_items(meals(plan_id)),meal_item_alternatives(meal_items(meals(plan_id)))`;
