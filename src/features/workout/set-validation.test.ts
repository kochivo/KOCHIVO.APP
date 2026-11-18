import { expect, it } from 'vitest';
import { parseSetValue, validateSet } from './set-validation';

it.each([
  [0, 0, false, 'both'], [0, 8, false, 'weight'], [20, 0, false, 'reps'],
  [20, 1, false, 'ok'], [0, 1, true, 'ok'], [0, 0, true, 'reps'],
  [-1, 1, false, 'weight'], [NaN, 1, false, 'weight'], [20, NaN, false, 'reps'],
  [Infinity, 8, false, 'weight'], [-Infinity, 8, false, 'weight'],
  [20, Infinity, false, 'reps'], [20, -1, false, 'reps'],
  [20, 1.5, false, 'reps'], [0, 1.5, true, 'reps'],
] as const)('validates %s kg and %s reps with bodyweight %s', (weight, reps, bodyweight, expected) => {
  expect(validateSet({ weight, reps, bodyweight })).toBe(expected);
});

it.each([
  ['weight', '٢٥٫٥', 25.5], ['weight', '۲۵,۵', 25.5], ['weight', '500', 500],
  ['weight', '500.01', null], ['weight', '0', null], ['weight', '.001', null],
  ['weight', '-2', null], ['weight', '25kg', null], ['weight', '', null],
  ['reps', '۱۲', 12], ['reps', '١٠٠', 100], ['reps', '101', null],
  ['reps', '0', null], ['reps', '1.5', null], ['reps', ' ', null],
] as const)('parses %s draft %s as %s', (kind, text, expected) => {
  expect(parseSetValue(kind, text)).toBe(expected);
});
