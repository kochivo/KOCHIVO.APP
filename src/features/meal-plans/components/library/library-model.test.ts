import { expect, it } from 'vitest';
import { matchesFood, filterFoods, recipeNutrition, foodStatus } from './library-model';
import type { Food } from '../../types';

const food: Food = { id: 'chicken', name: 'دَجَاج مشوي', nameEn: 'Chicken', photo: null, custom: false,
  kcal: 120, protein: 15, carbs: 10, fat: 5, region: 'eg' };

it('normalizes Arabic letters, marks, tatweel and Egyptian synonyms in both directions', () => {
  for (const [name, query] of [['دَجَاج', 'فراخ'], ['فراخ', 'دجاج'], ['خبز', 'عيش'], ['عيش', 'خبز'],
    ['لحم', 'لحمة'], ['لَحْمة', 'لحم'], ['أإآةىـ', 'اااهي']] as const) {
    expect(matchesFood({ ...food, name }, query)).toBe(true);
  }
  expect(matchesFood(food, 'CHICKEN')).toBe(true);
  expect(matchesFood(food, 'rice')).toBe(false);
});
it('combines region, owner, favorites and inclusive nutrition thresholds', () => {
  expect(filterFoods([food], '', 'eg', ['protein', 'fat', 'carbs', 'kcal'], new Set())).toEqual([food]);
  expect(filterFoods([food], '', 'gulf', [], new Set())).toEqual([]);
  expect(filterFoods([food], '', 'mine', [], new Set())).toEqual([]);
  expect(filterFoods([food], '', 'favorites', [], new Set([food.id]))).toEqual([food]);
  expect(filterFoods([food], '', 'favorites', [], new Set())).toEqual([]);
  expect(filterFoods([{ ...food, protein: 14.9 }], '', 'all', ['protein'], new Set())).toEqual([]);
});
it('calculates ingredient totals, cooked yield and 250/350/450 gram plates', () => {
  const result = recipeNutrition([{ food, grams: 200 }], 400);
  expect(result.total).toEqual({ kcal: 240, protein: 30, carbs: 20, fat: 10 });
  expect(result.per100.kcal).toBe(60);
  expect(result.plates.map(plate => plate.kcal)).toEqual([150, 210, 270]);
  expect(() => recipeNutrition([{ food, grams: 200 }], 0)).toThrow();
});
it('never verifies food without provenance', () => {
  expect(foodStatus({ ...food, source_kind: 'usda', source_ref: null })).toBe('captain');
  expect(foodStatus({ ...food, source_kind: 'usda', source_ref: { fdc_id: '1', dataset: 'Foundation', description: 'Chicken' } })).toBe('usda');
});
