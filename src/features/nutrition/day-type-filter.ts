import type { MealLogRow, NutritionMeal } from '@/core/offline';

export function filterMeals<Meal extends { id: string; day_type?: string | null }>(meals: readonly Meal[],
  rest: boolean | null | undefined, logs: readonly MealLogRow[] = [], today?: string): Meal[] {
  // Without a program, retain the training-day menu; undefined means still loading.
  return meals.filter(meal => (meal.day_type ?? 'all') === 'all' ||
    (rest !== undefined && meal.day_type === (rest ? 'rest' : 'training')) ||
    logs.some(log => log.meal_id === meal.id && log.log_date === today && log.completed_at && !log.deleted_at));
}

export function hasSplitMenu(meals: readonly Pick<NutritionMeal, 'day_type'>[]): boolean {
  return meals.some(meal => meal.day_type === 'rest' || meal.day_type === 'training');
}
