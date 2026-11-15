import { expect, it } from 'vitest';
import { macrosFor } from '@/lib/macros';
import { mealTotals } from '../totals';
import type { Food, PlanDraft } from '../types';
import { defaultPortion, portionGrams, setPortionUnit, unitGrams } from './meal-portions';
import { portionsChanged } from './portion-payload';

const food: Food = { id: 'food', name: 'Egg', photo: null, custom: false, kcal: 150, protein: 12, carbs: 1, fat: 10,
  units: [{ key: 'egg', name_ar: 'بيضة', name_en: 'egg', grams: 50 }] };
it('converts quantity using catalog grams and rejects unknown units', () => {
  expect(portionGrams(food, 3, 'egg')).toBe(150);
  expect(150 / unitGrams(food, 'egg')).toBe(3);
  expect(portionGrams(food, 150)).toBe(150);
  expect(() => portionGrams(food, 1, 'cup')).toThrow('Unknown food unit');
  expect(defaultPortion(food)).toEqual({ grams: 50, unit: 'egg' });
  expect(defaultPortion({ ...food, units: [] })).toEqual({ grams: 100, unit: null });
});
it('sums the exact portion macros for each meal row', () => {
  const row = { id: 'item', food, grams: 150, position: 1, alternatives: [] };
  const totals = mealTotals({ id: 'meal', name: 'Breakfast', position: 1, items: [row, { ...row, id: 'second', grams: 50 }] });
  expect(macrosFor(food, 150)).toEqual({ kcal: 225, protein: 18, carbs: 1.5, fat: 15 });
  expect(totals).toEqual({ kcal: 300, protein: 24, carbs: 2, fat: 20 });
});
it('uses the additive overload only for changed metadata', () => {
  const draft: PlanDraft = { id: 'plan', title: 'Plan', playerId: null, status: 'draft', targets: food, meals: [{ id: 'meal', name: 'Breakfast', position: 1, items: [] }] };
  expect(portionsChanged(draft, [{ id: 'meal', time_of_day: null }], [])).toBe(false);
  const timed = { ...draft, meals: [{ ...draft.meals[0], id: 'meal', name: 'Breakfast', position: 1, items: [], timeOfDay: '09:00' }] };
  expect(portionsChanged(timed, [{ id: 'meal', time_of_day: '09:00:00' }], [])).toBe(false);
  expect(portionsChanged(timed, [{ id: 'meal', time_of_day: null }], [])).toBe(true);
});
it('keeps grams unchanged when switching display units and persists the key', () => {
  const draft: PlanDraft = { id: 'plan', title: 'Plan', playerId: null, status: 'draft', targets: food,
    meals: [{ id: 'meal', name: 'Breakfast', position: 1, items: [{ id: 'item', food, grams: 150, position: 1, alternatives: [] }] }] };
  const changed = setPortionUnit(draft, 'item', 'egg');
  expect(changed.meals[0]?.items[0]).toMatchObject({ grams: 150, unit: 'egg' });
  expect(setPortionUnit(changed, 'item', null).meals[0]?.items[0]).toMatchObject({ grams: 150, unit: null });
  expect(() => setPortionUnit(draft, 'item', 'invented')).toThrow('Unknown food unit');
});
