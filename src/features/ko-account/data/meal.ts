import type { KoActor } from './account';
import { playerWorkout } from '@/features/ai-tools/server';
import { filterMeals } from '@/features/nutrition/server';
import { localDate } from '@/lib/dates';
import type { Tables } from '@/types/database';
import { mealToolContext } from './log-meal';
import { matchNamed, normalizeName } from './match';

type Portion = { grams: number; foods: Pick<Tables<'foods'>, 'name_ar' | 'name_en'> | null };
type MealPortions = Pick<Tables<'meals'>, 'id' | 'name'> & {
  day_type?: 'all' | 'training' | 'rest';
  meal_items: (Portion & { meal_item_alternatives: Portion[] })[];
};

export async function readMeal(actor: KoActor, meal: string | undefined, foods: string[] | undefined, locale: 'ar' | 'en',
  day?: { now: number; signal: AbortSignal }) {
  const columns = `title,meals(${day ? 'id,day_type,' : ''}name,meal_items(grams,foods(name_ar,name_en),meal_item_alternatives(grams,foods(name_ar,name_en))))`;
  const plan = actor.db.from('nutrition_plans').select(columns)
    .eq('player_id', actor.id).eq('status', 'active').eq('is_template', false);
  const { data, error } = await (day ? plan.abortSignal(day.signal) : plan).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const mealKey = meal ? normalizeName(meal) : null;
  // The generated meal schema predates day_type.
  let menu = (data as unknown as { meals: MealPortions[] }).meals;
  if (day) {
    const ctx = await mealToolContext(actor, day.now, day.signal);
    const workout = await playerWorkout(ctx, localDate(ctx.now, ctx.timezone));
    menu = filterMeals(menu, workout?.rest ?? false);
  }
  const meals = menu.filter(item => !mealKey || normalizeName(item.name) === mealKey);
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
