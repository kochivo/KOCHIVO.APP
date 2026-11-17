import { expect, it } from 'vitest';
import { setPerformance } from './set-performance';

it('keeps the unit beside the weight before reps in both directions', () => {
  expect(setPerformance(2.5, 8, 'كجم', 'ar')).toBe('2.5 كجم × 8');
  expect(setPerformance(2.5, 8, 'kg', 'en')).toBe('2.5 kg × 8');
  expect(setPerformance(null, null, 'kg', 'en')).toBe('0 kg × 0');
});
