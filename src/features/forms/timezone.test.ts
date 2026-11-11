import { expect, it } from 'vitest';
import { monthPeriod } from './data/metrics';

it('uses captain-local month boundaries, including DST offsets', () => {
  expect(monthPeriod(new Date('2026-07-01T00:00:00Z'), 'Europe/London'))
    .toEqual({ start: '2026-06-30T23:00:00.000Z', end: '2026-07-31T23:00:00.000Z' });
  expect(monthPeriod(new Date('2026-07-01T00:00:00Z'), 'America/New_York'))
    .toEqual({ start: '2026-06-01T04:00:00.000Z', end: '2026-07-01T04:00:00.000Z' });
});
