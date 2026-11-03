import { expect, it } from 'vitest';
import { paidCaptainShare } from './kpis';

it('shows zero percent when there are no captains', () => {
  expect(paidCaptainShare(0, 0)).toBe(0);
});
it('calculates the paid share across all captains', () => {
  expect(paidCaptainShare(3, 12)).toBe(25);
  expect(paidCaptainShare(1, 3)).toBeCloseTo(33.3333);
});
