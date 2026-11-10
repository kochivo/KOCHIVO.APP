import { expect, it } from 'vitest';
import { ranksEnabled } from './ranks-enabled';

it('keeps ranks hidden unless the switch is exactly 1', () => {
  expect(ranksEnabled(undefined)).toBe(false);
  expect(ranksEnabled('')).toBe(false);
  expect(ranksEnabled('true')).toBe(false);
  expect(ranksEnabled('1')).toBe(true);
});
