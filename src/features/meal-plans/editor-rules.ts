import type { Macros } from '@/lib/macros';
import { cycle } from './energy';
import type { DayType, FoodUnit, Meal, PlanDraft } from './types';

export function targetStatus(planned: number, target: number): 'within' | 'over' | 'under' {
  return planned > target * 1.05 ? 'over' : planned < target * .95 ? 'under' : 'within';
}
export function unitGrams(quantity: number, unit?: FoodUnit) {
  if (!Number.isFinite(quantity) || quantity < 0 || (unit && (!Number.isFinite(unit.grams) || unit.grams <= 0))) throw new RangeError('Invalid quantity');
  return Math.round(quantity * (unit?.grams ?? 1) * 10) / 10;
}
export function unitQuantity(grams: number, unit?: FoodUnit) { return grams / (unit?.grams ?? 1); }
export function dayMeals(meals: Meal[], day: Exclude<DayType, 'all'>) {
  return meals.filter(meal => !meal.dayType || meal.dayType === 'all' || meal.dayType === day);
}
export function moveVisibleMeal(draft: PlanDraft, id: string, direction: number, day: 'training' | 'rest'): PlanDraft {
  const visible = dayMeals(draft.meals, day);
  const index = visible.findIndex(meal => meal.id === id);
  const neighbor = visible[index + direction];
  const current = visible[index];
  if (!neighbor || !current) return draft;
  return { ...draft, meals: draft.meals.map(meal => meal.id === id ? { ...neighbor, position: meal.position }
    : meal.id === neighbor.id ? { ...current, position: meal.position } : meal) };
}
export function dayTargets(targets: Macros, trainingDays: number, day: 'training' | 'rest'): Macros {
  // An empty numeric input is temporarily zero; save validation reports it without crashing the editor.
  if (!Number.isFinite(targets.kcal) || targets.kcal <= 0) return targets;
  const kcal = cycle(targets.kcal, trainingDays)[day];
  return { ...targets, kcal, carbs: Math.max(0, Math.round((kcal - targets.protein * 4 - targets.fat * 9) / 4)) };
}
export function copyTrainingMeals(draft: PlanDraft, id: () => string): PlanDraft {
  const retained = draft.meals.filter(meal => meal.dayType !== 'rest');
  const copies = draft.meals.filter(meal => meal.dayType === 'training').map(meal => ({ ...meal, id: id(), dayType: 'rest' as const,
    items: meal.items.map(item => ({ ...item, id: id(), alternatives: item.alternatives.map(alt => ({ ...alt, id: id() })) })) }));
  return { ...draft, meals: [...retained, ...copies].map((meal, index) => ({ ...meal, position: index + 1 })) };
}
