import type { MealLogRow, NutritionMeal, NutritionSnapshot } from '@/core/offline';
import { completedMeal, dayNutritionTargets, eatenTotals, filterMeals } from '@/features/nutrition';

interface DayNutrition {
  kind: 'today' | 'past' | 'future';
  eatenKcal?: number;
  targetKcal: number;
  mealsDone?: number;
  mealsTotal: number;
}

export function dayNutrition(
  snapshot: NutritionSnapshot | null, logs: readonly MealLogRow[], date: string, today: string, rest = false,
): DayNutrition {
  const kind = date === today ? 'today' : date < today ? 'past' : 'future';
  const meals = filterMeals(snapshot?.meals ?? [], rest);
  const plan: DayNutrition = { kind, targetKcal: snapshot ? dayNutritionTargets(snapshot, rest).kcal : 0, mealsTotal: meals.length };
  if (kind === 'future') return plan;
  return {
    ...plan, eatenKcal: eatenTotals(snapshot, logs, date).kcal,
    mealsDone: meals.filter(meal => logs.some(row => row.meal_id === meal.id && completedMeal(row, date))).length,
  };
}

export function nextMeal(meals: readonly NutritionMeal[], logs: readonly MealLogRow[], date: string, rest = false) {
  return filterMeals(meals, rest).find(meal =>
    !logs.some(log => log.meal_id === meal.id && completedMeal(log, date)));
}
