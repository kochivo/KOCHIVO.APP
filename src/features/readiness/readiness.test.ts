import { describe, expect, it } from 'vitest';
import { readinessScore, reducedSets, suggestDecision } from './score';
import { waterGoalMl } from './water';

describe('daily readiness', () => {
  it('returns null without any answers', () => {
    expect(readinessScore({})).toBeNull();
  });
  it.each([[4, 0], [8, 1], [9, .75]])('scores sleep %s', (sleepHours, expected) => {
    expect(readinessScore({ sleepHours })?.parts.sleep).toBe(expected);
    expect(readinessScore({ sleepHours })?.score).toBe(Math.round(expected * 100));
  });
  it.each([[1, 1], [5, 0]])('scores soreness %s', (soreness, expected) => {
    expect(readinessScore({ soreness })?.score).toBe(expected * 100);
  });
  it.each([[0, 0], [3000, 1], [4000, 1]])('caps water %s', (waterMl, expected) => {
    expect(readinessScore({ waterMl, waterGoalMl: 3000 })?.parts.water).toBe(expected);
  });
  it('renormalizes partial weights and exposes red flags', () => {
    expect(readinessScore({ sleepHours: 8, soreness: 5 })?.score).toBe(53);
    expect(readinessScore({ sleepHours: 4, soreness: 4 })?.flags).toEqual({ lowSleep: true, highSoreness: true });
    expect(readinessScore({ sleepHours: 8, waterMl: 3000, waterGoalMl: 3000, soreness: 1 })?.score).toBe(100);
  });
  it.each([[null, 'keep'], [49, 'rest'], [50, 'reduce'], [79, 'reduce'], [80, 'keep']] as const)('suggests at %s', (score, decision) => {
    expect(suggestDecision(score)).toBe(decision);
  });
  it('reduces exercise sets and clamps water goals', () => {
    expect([1, 3, 5].map(reducedSets)).toEqual([1, 2, 4]);
    expect(waterGoalMl()).toBe(3000);
    expect(waterGoalMl(40)).toBe(2000);
    expect(waterGoalMl(200)).toBe(4000);
    expect(waterGoalMl(80)).toBe(2750);
  });
});
