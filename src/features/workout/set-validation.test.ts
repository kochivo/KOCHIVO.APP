import { expect, it } from 'vitest';
import { validateSet } from './set-validation';

it.each([
  [0, 0, false, 'both'], [0, 8, false, 'weight'], [20, 0, false, 'reps'],
  [20, 1, false, 'ok'], [0, 1, true, 'ok'], [0, 0, true, 'reps'],
  [-1, 1, false, 'weight'], [NaN, 1, false, 'weight'], [20, NaN, false, 'reps'],
] as const)('validates %s kg and %s reps with bodyweight %s', (weight, reps, bodyweight, expected) => {
  expect(validateSet({ weight, reps, bodyweight })).toBe(expected);
});
