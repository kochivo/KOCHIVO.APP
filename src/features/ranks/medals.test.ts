import { expect, it } from 'vitest';
import * as medals from './medals';
import * as estimate from './time-estimate';

it('tracks all four sets, including independent consecutive crowns', () => {
  const progress = medals.medalProgress({ workouts: 10, full_weeks: 2, prs: 25, crowns: 3, crown_streak: 3 });
  expect(progress.map(set => [set.earned.length, set.next?.threshold, set.percent])).toEqual([
    [2,50,20], [1,4,50], [3,50,50], [3,6,50],
  ]);
  expect(medals.earnedCount({ workouts: 250, full_weeks: 52, prs: 100, crowns: 12, crown_streak: 3 })).toBe(20);
});
it.each([undefined, 0])('omits an estimate at a weekly pace of %s', weekly => {
  expect(estimate.timeEstimate(100, weekly)).toBeNull();
});
it.each([[1,24,'lessWeek',0], [24,24,'oneWeek',1], [25,24,'oneWeek',1], [46,24,'weeks',2], [100,24,'months',1]] as const)(
  'rounds a %i point estimate at %i points per week', (needed, weekly, key, n) => {
    expect(estimate.timeEstimate(needed,weekly)).toEqual({ key,n });
  });
