import type { MealLogRow, NutritionItem, NutritionMeal, NutritionSnapshot } from '@/core/offline';
import { macrosFor, sumMacros, type Macros } from '@/lib/macros';

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

export function eatenTotals(snapshot: NutritionSnapshot, logs: readonly MealLogRow[], today: string): Macros {
  return sumMacros(snapshot.meals.map((meal) => {
    const log = logs.find((row) => row.meal_id === meal.id && row.log_date === today && !row.deleted_at);
    return log?.completed_at ? eatenMacros(log.eaten_macros) ?? mealMacros(meal, log.swaps) : sumMacros([]);
  }));
}

export function targetsOf(snapshot: NutritionSnapshot): Macros {
  const fallback = sumMacros(snapshot.meals.map((meal) => mealMacros(meal, {})));
  return { kcal: snapshot.targets.kcal ?? fallback.kcal, protein: snapshot.targets.protein ?? fallback.protein,
    carbs: snapshot.targets.carbs ?? fallback.carbs, fat: snapshot.targets.fat ?? fallback.fat };
}
