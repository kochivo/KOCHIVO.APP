import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { FoodRow } from './food-row';
import { ItemRow } from '../item-row';
import { MealEditor } from '../meal-editor';
import { FoodSearch } from './food-search';
import { TargetTiles } from './target-tiles';
import { missingNutrition, nutritionTotals } from './nutrition-values';
import { mealTotals, planTotals } from '../../totals';
import type { Meal, PlanDraft } from '../../types';

vi.mock('../../data/foods', () => ({ searchFoods: vi.fn() }));
vi.mock('../food-picker', () => ({ FoodPicker: () => null }));
const meal: Meal = { id: 'meal', name: 'Lunch', position: 1, items: [
  { id: 'rice', position: 1, grams: 200, alternatives: [], food: { id: 'rice', name: 'Rice', photo: null, custom: false,
    kcal: 130, protein: 3, carbs: 28, fat: 0, units: [{ key: 'plate', name_ar: 'طبق', name_en: 'plate', grams: 200 }] } },
  { id: 'chicken', position: 2, grams: 200, alternatives: [], food: { id: 'chicken', name: 'Chicken', photo: null, custom: false,
    kcal: 165, protein: 31, carbs: 0, fat: 4 } },
] };
function render(element: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
}
it('sums every item across every meal, including different quantities', () => {
  const draft: PlanDraft = { id: 'plan', playerId: 'player', title: 'Plan', status: 'draft',
    targets: { kcal: 2000, protein: 150, carbs: 200, fat: 60 }, meals: [meal, { ...meal, id: 'dinner' }] };
  expect(mealTotals(meal)).toEqual({ kcal: 590, protein: 68, carbs: 56, fat: 8 });
  expect(planTotals(draft)).toEqual({ kcal: 1180, protein: 136, carbs: 112, fat: 16 });
});
it('shows an unknown custom food as unknown with a repair action rather than zero kcal', () => {
  const item = { ...meal.items[0], id: 'unknown', position: 1, grams: 100, alternatives: [],
    food: { id: 'unknown', name: 'Molto', photo: null, custom: true, kcal: 0, protein: 0, carbs: 0, fat: 0 } };
  const html = render(createElement(FoodRow, { item, update() {} }));
  expect(html).toContain('No nutrition values');
  expect(html).toContain('Complete them');
  expect(html).toContain('data-incomplete="true"');
  expect(html).toContain('?');
  expect(html).not.toContain('>0<');
  const details = render(createElement(ItemRow, { item, first: true, last: true, update() {}, enhanced: true }));
  expect(details).toContain('Incomplete nutrition total');
});
it('shows the full household unit and gram equivalent outside the native select', () => {
  const item = meal.items[0];
  if (!item) throw new Error('Missing fixture');
  const html = render(createElement(FoodRow, { item, update() {} }));
  expect(html).toContain('plate (200 g)</span>');
  expect(html).toContain('3 protein · 28 carbs · 0 fat per 100 g');
});
it('marks target totals incomplete and puts custom food creation inside the one search path', () => {
  const html = render(createElement(TargetTiles, { totals: mealTotals(meal), targets: { kcal: 500, protein: 100, carbs: 100, fat: 40 }, incomplete: true }));
  expect(html).toContain('Incomplete');
  expect(html).toContain('data-over="true"');
  const search = render(createElement(FoodSearch, { onPick() {} }));
  expect(search.match(/type="search"/g)).toHaveLength(1);
  expect(search).toContain('+ New food outside the library');
  const details = render(createElement(MealEditor, { meal: { ...meal, items: [] }, first: true, last: true, update() {}, enhanced: true, hideAdd: true }));
  expect(details).not.toContain('Add food');
  expect(details).not.toContain('+ New food');
  expect(details).not.toContain('type="search"');
});
it('excludes unknown foods from known subtotals while marking the whole day incomplete', () => {
  const unknown = { ...meal.items[0], id: 'unknown', position: 3, grams: 100, alternatives: [],
    food: { id: 'unknown', name: 'Molto', photo: null, custom: true, kcal: 0, protein: 0, carbs: 0, fat: 0 } };
  expect(nutritionTotals([{ ...meal, items: [...meal.items, unknown] }, meal])).toEqual({
    totals: { kcal: 1180, protein: 136, carbs: 112, fat: 16 }, incomplete: true,
  });
  expect(nutritionTotals([meal]).incomplete).toBe(false);
  expect(nutritionTotals([])).toEqual({ totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, incomplete: false });
  expect(missingNutrition({ ...unknown.food, custom: false })).toBe(false);
  expect(missingNutrition({ ...unknown.food, kcal: Number.NaN })).toBe(true);
});
