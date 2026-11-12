import { expect, it } from 'vitest';
import { libraryUsage } from './library-usage';

it('counts distinct plans across main foods and alternatives, ignoring deleted relations', () => {
  expect(libraryUsage({ meal_items: [{ meals: { plan_id: 'a' } }, { meals: { plan_id: 'a' } }, { meals: null }],
    meal_item_alternatives: [{ meal_items: { meals: { plan_id: 'a' } } }, { meal_items: { meals: { plan_id: 'b' } } }, { meal_items: null }] }))
    .toEqual({ uses: 2, alternativeUses: 3 });
});
