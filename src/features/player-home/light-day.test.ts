import { expect, it } from 'vitest';
import { isLightDay, periodDay } from './light-day';

it('uses the most recent nonfuture start, enabled setting, exclusive end and daily override', () => {
  const starts = ['2026-11-01', '2026-11-10'];
  expect(isLightDay(true, starts, '2026-11-02', 2, [])).toBe(true);
  expect(isLightDay(true, starts, '2026-11-03', 2, [])).toBe(false);
  expect(isLightDay(false, starts, '2026-11-01', 2, [])).toBe(false);
  expect(isLightDay(true, starts, '2026-11-01', 0, [])).toBe(false);
  expect(isLightDay(true, starts, '2026-11-01', 2, ['2026-11-01'])).toBe(false);
  expect(periodDay([], '2026-11-01')).toBeNull();
  expect(periodDay(starts, '2026-11-02')).toBe(1);
});
