import { macrosFor, sumMacros } from '@/lib/macros';
import type { Food, Meal } from '../../types';

export function missingNutrition(food: Food): boolean {
  const values = [food.kcal, food.protein, food.carbs, food.fat];
  // Legacy custom foods saved empty fields as zero, without a completeness marker.
  return values.some(value => !Number.isFinite(value) || value == null) ||
    (food.custom && values.every(value => value === 0));
}

export function nutritionTotals(meals: Meal[]) {
  const items = meals.flatMap(meal => meal.items);
  return { totals: sumMacros(items.filter(item => !missingNutrition(item.food)).map(item => macrosFor(item.food, item.grams))),
    incomplete: items.some(item => missingNutrition(item.food)) };
}
