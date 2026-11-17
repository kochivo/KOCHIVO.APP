import { expect, it } from 'vitest';
import { freezeInput, remainingFreezeDays } from './model';

it('treats missing and zero limits as disabled and subtracts approved days', () => {
  expect(remainingFreezeDays(null, 0)).toBe(0);
  expect(remainingFreezeDays(0, 0)).toBe(0);
  expect(remainingFreezeDays(10, 8)).toBe(2);
  expect(remainingFreezeDays(5, 8)).toBe(0);
});
it('validates whole days, allowance and a 200-character optional note', () => {
  for (const days of [0, 3.5, 11, 91]) expect(freezeInput(days, '', 10)).toBeNull();
  expect(freezeInput(2, 'x'.repeat(201), 10)).toBeNull();
  expect(freezeInput(2, '  Travel  ', 10)).toEqual({ days: 2, note: 'Travel' });
  expect(freezeInput(1, '', 1)).toEqual({ days: 1, note: null });
});
