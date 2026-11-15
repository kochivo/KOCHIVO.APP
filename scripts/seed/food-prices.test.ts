import { expect, it } from 'vitest';
import { mapFoodPrices } from './map-food-prices';

it('resolves seed keys without inventing missing catalog foods', () => {
  const entries = [{ seed_key: 'rice', unit: 'kg', unit_grams: 1000, price_egp: 30, estimate: true }];
  expect(mapFoodPrices(entries, [{ id: 'food', seed_key: 'rice' }]).rows).toEqual([
    { food_id: 'food', owner_id: null, unit: 'kg', unit_grams: 1000, price_egp: 30 },
  ]);
  expect(mapFoodPrices(entries, []).missing).toEqual(['rice']);
});
