import { expect, it } from 'vitest';
import { ramadanTarget } from './ramadan-intensity';
it('adjusts display targets without mutating the program', () => {
  const target = { weight: 100, sets: 3 };
  expect(ramadanTarget(target, 'lighter_20')).toEqual({ weight: 80, sets: 3 });
  expect(ramadanTarget(target, 'maintenance')).toEqual({ weight: 100, sets: 2 });
  expect(ramadanTarget({ weight: null, sets: 1 }, 'maintenance')).toEqual({ weight: null, sets: 1 });
  expect(ramadanTarget(target, 'same')).toEqual(target);
  expect(target).toEqual({ weight: 100, sets: 3 });
});
