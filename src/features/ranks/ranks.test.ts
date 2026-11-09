import { expect, it } from 'vitest';
import { nextTier, tierFor } from './tiers';

it.each([
  [0, 'beginner', 'champion', 100], [99, 'beginner', 'champion', 1],
  [100, 'champion', 'elite', 200], [299, 'champion', 'elite', 1],
  [300, 'elite', 'legend', 300], [599, 'elite', 'legend', 1],
  [600, 'legend', 'legend', 0], [5000, 'legend', 'legend', 0],
] as const)('derives the tier and remaining points at %i', (points, tier, next, needed) => {
  expect(tierFor(points)).toBe(tier);
  expect(nextTier(points)).toEqual({ tier: next, needed });
});
