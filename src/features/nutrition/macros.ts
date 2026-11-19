import type { MealLogRow, NutritionItem, NutritionMeal, NutritionSnapshot } from '@/core/offline';
import { macrosFor, sumMacros, type Macros } from '@/lib/macros';
import { dayTargets, planTargets } from '@/lib/day-targets';
import { filterMeals, hasSplitMenu } from './day-type-filter';

export function eatenMacros(value: unknown): Macros | null {
  if (!value || typeof value !== 'object') return null;
  if (!('kcal' in value && 'protein' in value && 'carbs' in value && 'fat' in value)) return null;
  const { kcal, protein, carbs, fat } = value;
  if (![kcal, protein, carbs, fat].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return null;
  return { kcal, protein, carbs, fat } as Macros;
}

export function itemMacros(item: NutritionItem, swapId?: string): Macros {
  const chosen = item.alternatives.find((alt) => alt.id === swapId) ?? item;
  return macrosFor(chosen.per100g, chosen.grams);
}

export function mealMacros(meal: NutritionMeal, swaps: Readonly<Record<string, string>>): Macros {
  return sumMacros(meal.items.map((item) => itemMacros(item, swaps[item.id])));
}

export function completedMeal(log: MealLogRow | undefined, date: string): log is MealLogRow {
  return Boolean(log?.completed_at && log.log_date === date && !log.deleted_at);
}

export function eatenTotals(snapshot: NutritionSnapshot | null, logs: readonly MealLogRow[], today: string): Macros {
  const meals = new Map(snapshot?.meals.map(meal => [meal.id, meal]));
  return sumMacros(logs.filter(log => completedMeal(log, today)).flatMap(log => {
    const saved = eatenMacros(log.eaten_macros);
    if (saved) return [saved];
    const meal = log.meal_id === null ? undefined : meals.get(log.meal_id);
    return meal ? [mealMacros(meal, log.swaps)] : [];
  }));
}

export function dayNutritionTargets(snapshot: NutritionSnapshot, rest: boolean | null | undefined): Macros {
  if (rest !== undefined && snapshot.training_day_count !== undefined && hasSplitMenu(snapshot.meals)) {
    return dayTargets(planTargets(snapshot.targets), snapshot.training_day_count, rest ? 'rest' : 'training');
  }
  return targetsOf({ ...snapshot, meals: filterMeals(snapshot.meals, rest) });
}

export function targetsOf(snapshot: NutritionSnapshot): Macros {
  const fallback = sumMacros(snapshot.meals.map((meal) => mealMacros(meal, {})));
  return { kcal: snapshot.targets.kcal ?? fallback.kcal, protein: snapshot.targets.protein ?? fallback.protein,
    carbs: snapshot.targets.carbs ?? fallback.carbs, fat: snapshot.targets.fat ?? fallback.fat };
}
