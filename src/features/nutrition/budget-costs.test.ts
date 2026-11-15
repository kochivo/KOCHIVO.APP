import { expect, it } from 'vitest';
import { pricedDay } from './budget-costs';
import type { NutritionMeal } from '@/core/offline';
const food = { id: 'rice', name: 'Rice', tag: 'main' as const, kcal: 100, protein: 5, carbs: 20, fat: 0, pricePerGram: 0.1, unit: 'kg' as const, unitGrams: 1000 };
const meal: NutritionMeal = { id: 'meal', name: 'Lunch', position: 1, items: [{ id: 'item', position: 1, name: 'Rice', grams: 150, photo_path: null, per100g: food, alternatives: [] }] };
it('costs chosen portions and hides partial meal totals', () => {
  expect(pricedDay([meal], [food]).costEgp).toBe(15);
  expect(pricedDay([meal], []).meals[0]?.costEgp).toBeNull();
});
