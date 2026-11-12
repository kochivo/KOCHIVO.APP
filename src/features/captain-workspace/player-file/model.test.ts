import { expect, it } from 'vitest';
import { primaryCard, progressDetails, weightProgress } from './model';

it('chooses only the first missing card in training, nutrition, assessment order', () => {
  expect(primaryCard({ training: false, nutrition: false, assessments: false })).toBe('training');
  expect(primaryCard({ training: true, nutrition: false, assessments: false })).toBe('nutrition');
  expect(primaryCard({ training: true, nutrition: true, assessments: false })).toBe('assessments');
  expect(primaryCard({ training: true, nutrition: true, assessments: true })).toBeNull();
});
it('retains dated weight history and the original latest/change/to-target summaries', () => {
  const result = progressDetails([{ weekStart: '2026-11-12', weightKg: 76.8 }, { weekStart: '2026-11-05', weightKg: 78 },
    { weekStart: '2026-11-01', weightKg: null }], 76.3);
  expect(result.points).toEqual([{ date: '2026-11-05', value: 78 }, { date: '2026-11-12', value: 76.8 }]);
  expect(result.summary).toEqual({ latest: 76.8, change: -1.2, toTarget: -0.5 });
  expect(progressDetails([], null).summary).toBeNull();
});
it('calculates progress toward either weight goal without inventing missing values', () => {
  expect(weightProgress(80, 75, 70)).toBe(50);
  expect(weightProgress(60, 65, 70)).toBe(50);
  expect(weightProgress(80, 85, 70)).toBe(0);
  expect(weightProgress(80, 65, 70)).toBe(100);
  expect(weightProgress(null, 65, 70)).toBeNull();
  expect(weightProgress(70, 70, 70)).toBe(100);
});
