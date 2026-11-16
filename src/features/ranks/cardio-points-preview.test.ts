import { expect, it } from 'vitest';
import { previewWorkoutPoints } from './points-preview';

it('previews the same cardio duration threshold as the server', () => {
  const input = { startedAt: '2026-11-01T10:00:00Z', completedAt: '2026-11-01T10:10:00Z',
    loggedSets: 0, plannedSets: 0, plannedSeconds: 0, cardioSeconds: 600 };
  expect(previewWorkoutPoints(input)).toEqual({ counted: true, points: 3 });
  expect(previewWorkoutPoints({ ...input, completedAt: '2026-11-01T10:09:59Z' }))
    .toEqual({ counted: false, reason: 'short', minMinutes: 10 });
  expect(previewWorkoutPoints({ ...input, cardioSeconds: 0 }))
    .toEqual({ counted: false, reason: 'short', minMinutes: 20 });
  expect(previewWorkoutPoints({ ...input, plannedSets: 1 }))
    .toEqual({ counted: false, reason: 'short', minMinutes: 20 });
});
