import type { MealLogRow, NutritionSnapshot } from '@/core/offline';
import { eatenTotals, targetsOf } from '@/features/nutrition';

interface DayNutrition {
  kind: 'today' | 'past' | 'future';
  eatenKcal?: number;
  targetKcal: number;
  mealsDone?: number;
  mealsTotal: number;
}

export function dayNutrition(
  snapshot: NutritionSnapshot, logs: readonly MealLogRow[], date: string, today: string,
): DayNutrition {
  const kind = date === today ? 'today' : date < today ? 'past' : 'future';
  const plan: DayNutrition = { kind, targetKcal: targetsOf(snapshot).kcal, mealsTotal: snapshot.meals.length };
  if (kind === 'future') return plan;
  const dayLogs = logs.filter(row => row.log_date === date && !row.deleted_at);
  return {
    ...plan, eatenKcal: eatenTotals(snapshot, dayLogs, date).kcal,
    mealsDone: snapshot.meals.filter(meal => dayLogs.some(row => row.meal_id === meal.id && row.completed_at)).length,
  };
}
