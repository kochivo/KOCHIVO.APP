import { expect, it } from 'vitest';
import { weightSummary } from './weight-summary';

it('supports weight loss, weight gain and missing goals without inventing targets', () => {
  expect(weightSummary(76.8, 78, 76.3)).toEqual({ change: -1.2, remaining: 0.5 });
  expect(weightSummary(76.8, 70, 80)).toEqual({ change: 6.8, remaining: 3.2 });
  expect(weightSummary(76.8, null, null)).toEqual({ change: null, remaining: null });
  expect(weightSummary(80, 80, 80)).toEqual({ change: 0, remaining: 0 });
});
