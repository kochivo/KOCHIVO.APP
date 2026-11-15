import type { Food, Meal, MealItem, PlanDraft } from '../types';

export type TimedMeal = Meal & { timeOfDay?: string | null };
export type PortionItem = MealItem & { unit?: string | null };
export function unitGrams(food: Food, key?: string | null): number {
  if (!key) return 1;
  const unit = food.units?.find(unit => unit.key === key);
  if (!unit || !Number.isFinite(unit.grams) || unit.grams <= 0) throw new Error('Unknown food unit');
  return unit.grams;
}
export function portionGrams(food: Food, amount: number, key?: string | null): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid quantity');
  return Math.round(amount * unitGrams(food, key) * 10) / 10;
}
export function setPortionUnit(draft: PlanDraft, id: string, unit: string | null): PlanDraft {
  return { ...draft, meals: draft.meals.map(meal => ({ ...meal, items: meal.items.map(item => {
    if (item.id !== id) return item;
    unitGrams(item.food, unit);
    // Unit selection changes how the same stored weight is displayed.
    return { ...item, unit };
  }) })) };
}
export function defaultPortion(food: Food) {
  const unit = food.units?.find(unit => unit.grams >= 5 && unit.grams <= 2000);
  return { grams: unit?.grams ?? 100, unit: unit?.key ?? null };
}
