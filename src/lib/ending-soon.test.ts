import { expect, it } from 'vitest';
import { endingSoon } from './ending-soon';

it.each([['2026-11-13', false], ['2026-11-14', true], ['2026-11-21', true],
  ['2026-11-22', false], ['2026-12-14', false]])('checks the inclusive seven-day window: %s', (until, expected) => {
  expect(endingSoon('2026-11-14', until)).toBe(expected);
});
