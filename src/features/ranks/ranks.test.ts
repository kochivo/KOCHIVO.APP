import { expect, it } from 'vitest';
import { CROWN_MIN_WORKOUTS, legendStars, nextTier, tierFor } from './tiers';

it('requires four workouts', () => {
  expect(CROWN_MIN_WORKOUTS).toBe(4);
});

it.each([
  [0, 'beginner', 'champion', 100], [99, 'beginner', 'champion', 1],
  [100, 'champion', 'elite', 200], [299, 'champion', 'elite', 1],
  [300, 'elite', 'legend', 300], [599, 'elite', 'legend', 1],
  [600, 'legend', 'legend', 300], [5000, 'legend', 'legend', 100],
] as const)('derives the tier and remaining points at %i', (points, tier, next, needed) => {
  expect(tierFor(points)).toBe(tier);
  expect(nextTier(points)).toEqual({ tier: next, needed });
});

it.each([[599, 0, 1], [600, 0, 300], [899, 0, 1], [900, 1, 300],
  [1199, 1, 1], [1200, 2, 300], [10000, 31, 200]])('derives stars and the next goal at %i', (points, stars, needed) => {
  expect(legendStars(points)).toBe(stars);
  expect(nextTier(points).needed).toBe(needed);
});
