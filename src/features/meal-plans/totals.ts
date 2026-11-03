import { macrosFor, sumMacros } from '@/lib/macros';
import type { Macros } from '@/lib/macros';
import type { Meal, PlanDraft } from './types';

export const mealTotals = (meal: Meal): Macros => sumMacros(meal.items.map(item => macrosFor(item.food, item.grams)));
export const planTotals = (draft: PlanDraft): Macros => sumMacros(draft.meals.map(mealTotals));
export function targetDelta(totals: Macros, targets: Macros): Macros {
  return { kcal: totals.kcal - targets.kcal, protein: totals.protein - targets.protein, carbs: totals.carbs - targets.carbs, fat: totals.fat - targets.fat };
}
export function macroTargetsFromKcal(kcal: number, split = { p: 30, c: 45, f: 25 }): Macros {
  return { kcal, protein: Math.round(kcal * split.p / 400), carbs: Math.round(kcal * split.c / 400), fat: Math.round(kcal * split.f / 900) };
}
