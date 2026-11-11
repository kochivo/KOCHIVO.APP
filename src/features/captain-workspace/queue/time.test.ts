import { expect, it } from 'vitest';
import { cairoMidnight, weekStart } from './time';
it('uses Cairo midnight in both winter and summer', () => {
  expect(new Date(cairoMidnight('2026-11-11')).toISOString()).toBe('2026-11-10T22:00:00.000Z');
  expect(new Date(cairoMidnight('2026-07-11')).toISOString()).toBe('2026-07-10T21:00:00.000Z');
});
it('starts the review week on Saturday in Cairo rather than UTC', () => {
  expect(new Date(weekStart(new Date('2026-11-06T23:00:00Z'))).toISOString()).toBe('2026-11-06T22:00:00.000Z');
});
