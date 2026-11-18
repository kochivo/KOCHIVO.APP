import { expect, it } from 'vitest';
import { canOpenCheckin } from './week';

it('opens check-in only after a successful read for an unsent week', () => {
  const today = '2026-11-18';
  expect(canOpenCheckin(today, undefined, false, '')).toBe(false);
  expect(canOpenCheckin(today, [], true, '')).toBe(false);
  expect(canOpenCheckin(today, [], false, '2026-11-14')).toBe(false);
  expect(canOpenCheckin(today, [{ week_start: '2026-11-14' }], false, '')).toBe(false);
  expect(canOpenCheckin(today, [{ week_start: '2026-11-07' }], false, '')).toBe(true);
});
