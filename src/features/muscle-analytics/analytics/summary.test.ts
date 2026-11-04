import { expect, it } from 'vitest';
import { weeklyVolume } from '../data/muscle-volume';
import { summary } from './summary';
import { balance, muscleGroup } from './balance';

const now = new Date('2026-11-04T10:00:00Z');
const week = weeklyVolume(['pectorals', 'pectorals', 'triceps', 'biceps', 'quads', 'abs'].map(target => ({
  completed_at: '2026-11-02T10:00:00Z', deleted_at: null, reps: 8,
  exercises: { target, body_part: 'chest' },
})), now)[3];

it('counts working sets once and identifies the most worked muscle', () => {
  expect(summary(week).total).toBe(6);
  expect(summary(week).mostWorked).toEqual({ muscle: 'chest', sets: 2 });
  expect(summary(undefined).mostWorked).toBeNull();
});
it('uses readiness boundaries before the volume fallback', () => {
  const high = weeklyVolume(Array.from({ length: 13 }, () => ({
    completed_at: '2026-11-02T10:00:00Z', deleted_at: null, reps: 8,
    exercises: { target: 'pectorals', body_part: 'chest' },
  })), now)[3];
  expect(summary(high).recovery).toBe('needsRest');
  expect(summary(week).recovery).toBe('excellent');
  expect(summary(high, 80).recovery).toBe('excellent');
  expect(summary(week, 79).recovery).toBe('average');
  expect(summary(week, 50).recovery).toBe('average');
  expect(summary(week, 49).recovery).toBe('needsRest');
});
it('keeps the selected week isolated and breaks ties consistently', () => {
  const data = weeklyVolume([
    { completed_at: '2026-10-20T10:00:00Z', deleted_at: null, reps: 8,
      exercises: { target: 'biceps', body_part: 'upper arms' } },
    { completed_at: '2026-11-02T10:00:00Z', deleted_at: null, reps: 8,
      exercises: { target: 'triceps', body_part: 'upper arms' } },
  ], now);
  expect(summary(data[1]).mostWorked).toEqual({ muscle: 'biceps', sets: 1 });
  expect(summary(data[3]).mostWorked).toEqual({ muscle: 'triceps', sets: 1 });
  expect(summary({ ...data[3], muscles: { chest: 12, biceps: 12 }, total: 24 } as NonNullable<typeof week>).recovery).toBe('excellent');
});
it.each([
  ['chest', 'push'], ['frontDelts', 'push'], ['triceps', 'push'],
  ['back', 'pull'], ['lats', 'pull'], ['rearDelts', 'pull'], ['biceps', 'pull'],
  ['quads', 'legs'], ['hamstrings', 'legs'], ['glutes', 'legs'], ['calves', 'legs'], ['core', null],
] as const)('classifies %s as %s', (muscle, group) => {
  expect(muscleGroup(muscle)).toBe(group);
});
it('excludes core from percentages, includes arm sets, and flags under 25 percent', () => {
  expect(balance(week?.muscles ?? {})).toEqual({ push: 60, pull: 20, legs: 20, core: 1, under: ['pull', 'legs'] });
  expect(balance({ chest: 1, back: 1, quads: 1 })).toEqual({ push: 34, pull: 33, legs: 33, core: 0, under: [] });
  expect(balance({ chest: 2, back: 1, quads: 1 }).under).toEqual([]);
  expect(balance({ core: 3 })).toEqual({ push: 0, pull: 0, legs: 0, core: 3, under: [] });
});
