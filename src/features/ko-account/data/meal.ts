import type { KoActor } from './account';
import { matchNamed, normalizeName } from './match';

export async function readMeal(actor: KoActor, meal: string | undefined, foods: string[] | undefined, locale: 'ar' | 'en') {
  const { data, error } = await actor.db.from('nutrition_plans')
    .select('title,meals(name,meal_items(grams,foods(name_ar,name_en),meal_item_alternatives(grams,foods(name_ar,name_en))))')
    .eq('player_id', actor.id).eq('status', 'active').eq('is_template', false).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const mealKey = meal ? normalizeName(meal) : null;
  const meals = data.meals.filter(item => !mealKey || normalizeName(item.name) === mealKey);
  const rows = meals.flatMap(item => item.meal_items.flatMap(food => [
    ...(food.foods ? [{ ...food.foods, meal: item.name, grams: food.grams, alternative: false }] : []),
    ...food.meal_item_alternatives.flatMap(alt => alt.foods
      ? [{ ...alt.foods, meal: item.name, grams: alt.grams, alternative: true }] : []),
  ]));
  const matches = foods?.length ? [...new Set(foods.flatMap(food => matchNamed(rows, food)))] : rows;
  return matches.slice(0, 20).map(row => ({
    food: (locale === 'ar' ? row.name_ar ?? row.name_en : row.name_en ?? row.name_ar) ?? '',
    meal: row.meal, grams: row.grams, alternative: row.alternative,
  }));
}
