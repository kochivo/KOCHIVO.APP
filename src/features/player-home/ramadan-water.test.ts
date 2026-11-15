import { expect, it } from 'vitest';
import { completedCups, nextCupMl, nightWaterMl } from './ramadan-water';
it('excludes water before iftar and carries the night total through midnight', () => {
  const baseline = { date: '2027-02-08', water: 1000 };
  expect(nightWaterMl(baseline, [{ log_date: '2027-02-08', water_ml: 1750 }], false)).toBe(0);
  expect(nightWaterMl(baseline, [{ log_date: '2027-02-08', water_ml: 1750 }], true)).toBe(750);
  expect(nightWaterMl(baseline, [{ log_date: '2027-02-08', water_ml: 1750 }, { log_date: '2027-02-09', water_ml: 375 }], true)).toBe(1125);
});
it('keeps all eight cups integral and sums exactly to any allowed target', () => {
  for (const target of [1000, 1001, 2500, 3000, 6000]) {
    let water = 0;
    for (let cup = 1; cup <= 8; cup++) {
      const delta = nextCupMl(target, water);
      expect(Number.isInteger(delta)).toBe(true);
      water += delta;
      expect(completedCups(target, water)).toBe(cup);
    }
    expect(water).toBe(target);
  }
});
