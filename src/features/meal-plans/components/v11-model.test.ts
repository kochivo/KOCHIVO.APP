import { expect, it } from 'vitest';
import { calorieState, filterFoods } from './v11-model';
import { mealTotals } from '../totals';
import { dayMeals } from '../editor-rules';

it('scales all meal macros by the actual quantity', () => {
  expect(mealTotals({ id: 'm', name: 'Meal', position: 1, items: [{ id: 'i', grams: 150,
    position: 1, alternatives: [], food: { id: 'f', name: 'Food', photo: null, custom: false,
      kcal: 200, protein: 20, carbs: 25, fat: 5 } }] })).toEqual({ kcal: 300, protein: 30, carbs: 37.5, fat: 7.5 });
});
it('caps the ring and distinguishes excess from remaining calories', () => {
  expect(calorieState(2700, 2600)).toEqual({ over: true, remaining: 0, progress: 1 });
  expect(calorieState(1800, 2600)).toEqual({ over: false, remaining: 800, progress: 1800 / 2600 });
  expect(calorieState(0, 0)).toEqual({ over: false, remaining: 0, progress: 0 });
});
it('filters own foods without assigning invented categories', () => {
  const foods = [{ custom: false, name: 'Global' }, { custom: true, name: 'Own' }];
  expect(filterFoods(foods, 'mine')).toEqual([{ custom: true, name: 'Own' }]);
  expect(filterFoods(foods, 'all')).toEqual(foods);
});
it('shows shared meals in both tabs while keeping training and rest meals separate', () => {
  const meals = [
    { id: 'shared', name: 'Shared', position: 1, items: [], dayType: 'all' as const },
    { id: 'training', name: 'Training', position: 2, items: [], dayType: 'training' as const },
    { id: 'rest', name: 'Rest', position: 3, items: [], dayType: 'rest' as const },
  ];
  expect(dayMeals(meals, 'training').map(meal => meal.id)).toEqual(['shared', 'training']);
  expect(dayMeals(meals, 'rest').map(meal => meal.id)).toEqual(['shared', 'rest']);
});
