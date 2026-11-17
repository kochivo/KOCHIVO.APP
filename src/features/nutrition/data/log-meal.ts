import { saveAndQueue, stableId, type KochivoDB, type NutritionMeal } from '@/core/offline';
import { mealMacros } from '../macros';

interface MealInput {
  mealId: string;
  meal: NutritionMeal;
  logDate: string;
  eaten: boolean;
  swaps: Record<string, string>;
}

export async function setMealEaten(db: KochivoDB, input: MealInput, now: number): Promise<void> {
  const id = await stableId('meal', input.mealId, input.logDate);
  const timestamp = new Date(now).toISOString();
  await saveAndQueue(db, 'meal_logs', { id, meal_id: input.mealId, log_date: input.logDate,
    swaps: input.swaps, completed_at: input.eaten ? timestamp : null,
    eaten_macros: input.eaten ? mealMacros(input.meal, input.swaps) : null,
    client_updated_at: timestamp, deleted_at: null }, now);
}
