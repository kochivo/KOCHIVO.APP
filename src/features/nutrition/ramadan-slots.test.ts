import { expect, it } from 'vitest';
import { groupRamadanMeals } from './ramadan-slots';
it('uses position for automatic slots and honors explicit slots without changing meals', () => {
  const meals = [{ id: 'last', position: 2 }, { id: 'first', position: 0 }, { id: 'middle', position: 1 },
    { id: 'override', position: 3, ramadan_slot: 'iftar' as const }];
  const groups = groupRamadanMeals(meals);
  expect(groups.iftar.map(meal => meal.id)).toEqual(['first', 'override']);
  expect(groups.post_workout.map(meal => meal.id)).toEqual(['middle', 'last']);
  expect(groups.suhoor).toEqual([]);
  expect(meals[0]?.id).toBe('last');
  expect(groupRamadanMeals([])).toEqual({ iftar: [], post_workout: [], suhoor: [] });
});
