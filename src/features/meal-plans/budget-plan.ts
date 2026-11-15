import { localDate } from '@/lib/dates';
import type { Macros } from '@/lib/macros';

export interface BudgetFood extends Macros {
  id: string; name: string; tag: 'breakfast' | 'main' | 'snack';
  pricePerGram: number; unit: 'kg' | 'piece' | 'pack'; unitGrams: number;
  kitchenGrams?: number; maxDailyGrams?: number;
}
export interface BudgetItem { food: BudgetFood; grams: number }
export interface BudgetMeal { tag: BudgetFood['tag']; items: BudgetItem[]; costEgp: number; macros: Macros }
export interface BudgetDay { meals: BudgetMeal[]; costEgp: number; macros: Macros; feasible: boolean; shortBy: number }

// Seed keys are stable across devices; caps are edible grams per day.
export const dailyFoodCaps: Readonly<Record<string, number>> = {
  eggs: 300, 'canned-tuna': 280, 'chicken-breast': 400, 'chicken-liver': 150,
  'peanut-butter': 60, milk: 750, 'white-cheese': 150,
  'food_eggs-v1': 300, 'food_tuna-v1': 280, 'food_chicken_breast-v1': 400,
  'food_chicken_liver-v1': 150, 'food_peanut_butter-v1': 60, 'food_whole_milk-v1': 750,
  'food_feta-v1': 150, 'food_frozen_chicken-v1': 400,
};
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const emptyMacros = (): Macros => ({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
const validFood = (food: BudgetFood) => food.pricePerGram > 0 && Number.isFinite(food.pricePerGram)
  && food.unitGrams > 0 && [food.kcal, food.protein, food.carbs, food.fat].every(n => Number.isFinite(n) && n >= 0);
const step = (food: BudgetFood) => food.kitchenGrams ?? (food.unit === 'piece' ? food.unitGrams : 25);

export function dailyBudget(monthly: number, now: Date, timezone: string): number {
  const [year = 0, month = 1] = localDate(now, timezone).split('-').map(Number);
  return monthly / new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function budgetPlan(input: { kcal: number; protein: number; mealsPerDay: number; dailyBudget: number; foods: BudgetFood[] }): BudgetDay {
  const foods = input.foods.filter(validFood).filter(food => step(food) > 0);
  const amounts = new Map<string, BudgetItem>();
  let cost = 0;
  const macros = emptyMacros();
  function fill(key: 'protein' | 'kcal', target: number) {
    const sorted = foods.filter(food => food[key] > 0).sort((a, b) =>
      a.pricePerGram / a[key] - b.pricePerGram / b[key] || a.id.localeCompare(b.id));
    for (const food of sorted) {
      const missing = target - macros[key];
      if (missing <= 0) break;
      const previous = amounts.get(food.id)?.grams ?? 0;
      const cap = food.maxDailyGrams ?? dailyFoodCaps[food.id] ?? 500;
      const unit = step(food);
      const available = Math.min(cap - previous, Math.max(0, input.dailyBudget - cost) / food.pricePerGram);
      const grams = Math.min(Math.ceil(missing * 100 / food[key] / unit) * unit,
        Math.floor((available + 1e-8) / unit) * unit);
      if (grams <= 0) continue;
      amounts.set(food.id, { food, grams: previous + grams });
      cost += grams * food.pricePerGram;
      for (const macro of ['kcal', 'protein', 'carbs', 'fat'] as const) macros[macro] += grams * food[macro] / 100;
    }
  }
  fill('protein', input.protein);
  fill('kcal', input.kcal);
  const count = Math.max(1, Math.min(8, Math.trunc(input.mealsPerDay) || 1));
  const meals: BudgetMeal[] = Array.from({ length: count }, (_, index) => ({
    tag: index === 0 ? 'breakfast' : index === count - 1 && count > 2 ? 'snack' : 'main',
    items: [], costEgp: 0, macros: emptyMacros(),
  }));
  const tags = [...new Set([...amounts.values()].map(item => item.food.tag))].sort();
  for (const meal of meals) {
    // A restricted catalog should still spread affordable portions across the requested meals.
    if (!tags.includes(meal.tag)) meal.tag = tags.includes('main') ? 'main' : tags[0] ?? meal.tag;
  }
  for (const item of amounts.values()) {
    const matches = meals.filter(meal => meal.tag === item.food.tag);
    const destinations = matches.length ? matches : meals.filter(meal => meal.tag === 'main');
    const targets = destinations.length ? destinations : meals;
    let remaining = item.grams;
    targets.forEach((meal, index) => {
      const grams = index === targets.length - 1 ? remaining : Math.floor(remaining / (targets.length - index) / step(item.food)) * step(item.food);
      remaining -= grams;
      if (!grams) return;
      meal.items.push({ food: item.food, grams });
      meal.costEgp = round(meal.costEgp + grams * item.food.pricePerGram);
      for (const key of ['kcal', 'protein', 'carbs', 'fat'] as const) meal.macros[key] += grams * item.food[key] / 100;
    });
  }
  const shortBy = round(Math.max(0, input.protein - macros.protein));
  return { meals, macros, costEgp: round(cost), shortBy, feasible: shortBy === 0 && macros.kcal >= input.kcal };
}

export function cheaperSwap(item: BudgetItem, foods: BudgetFood[]): (BudgetItem & { saving: number }) | null {
  const protein = item.food.protein * item.grams / 100;
  if (protein <= 0) return null;
  const candidates = foods.filter(food => validFood(food) && food.id !== item.food.id && food.tag === item.food.tag && food.protein > 0)
    .map(food => {
      const grams = Math.max(1, Math.round(protein * 100 / food.protein / step(food))) * step(food);
      return { food, grams, saving: round(item.grams * item.food.pricePerGram - grams * food.pricePerGram) };
    }).filter(candidate => candidate.grams <= (candidate.food.maxDailyGrams ?? dailyFoodCaps[candidate.food.id] ?? 500)
      && Math.abs(candidate.grams * candidate.food.protein / 100 - protein) <= protein * 0.1 && candidate.saving > 0)
    .sort((a, b) => b.saving - a.saving || a.food.id.localeCompare(b.food.id));
  return candidates[0] ?? null;
}

export function weeklyShoppingList(days: BudgetDay[]) {
  const quantities = new Map<string, BudgetItem>();
  for (const day of days) for (const meal of day.meals) for (const item of meal.items) {
    quantities.set(item.food.id, { food: item.food, grams: (quantities.get(item.food.id)?.grams ?? 0) + item.grams });
  }
  const items = [...quantities.values()].sort((a, b) => a.food.id.localeCompare(b.food.id)).map(item => {
    const units = Math.ceil(item.grams / item.food.unitGrams);
    const grams = units * item.food.unitGrams;
    return { ...item, grams, units, costEgp: round(grams * item.food.pricePerGram) };
  });
  return { items, total: round(items.reduce((sum, item) => sum + item.costEgp, 0)) };
}
