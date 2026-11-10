import { expect, it } from 'vitest';
import { previewWorkoutPoints } from './points-preview';

const startedAt = '2026-11-10T10:00:00Z';
const base = { startedAt, completedAt: '2026-11-10T10:20:00Z', loggedSets: 6, plannedSets: 10, plannedSeconds: 2000 };

it('counts exactly twenty minutes and sixty percent of sets', () => {
  expect(previewWorkoutPoints(base)).toEqual({ counted: true, points: 3 });
});
it('rejects just under twenty minutes before checking sets', () => {
  expect(previewWorkoutPoints({ ...base, completedAt: '2026-11-10T10:19:59Z', loggedSets: 0 }))
    .toEqual({ counted: false, reason: 'short', minMinutes: 20 });
});
it('uses half the planned duration when larger', () => {
  expect(previewWorkoutPoints({ ...base, plannedSeconds: 3600 })).toEqual({ counted: false, reason: 'short', minMinutes: 30 });
  expect(previewWorkoutPoints({ ...base, plannedSeconds: 3600, completedAt: '2026-11-10T10:30:00Z' }))
    .toEqual({ counted: true, points: 3 });
  expect(previewWorkoutPoints({ ...base, plannedSeconds: 3600, completedAt: '2026-11-10T10:29:59Z' }))
    .toEqual({ counted: false, reason: 'short', minMinutes: 30 });
});
it('rounds the minimum sets up', () => {
  expect(previewWorkoutPoints({ ...base, plannedSets: 11 })).toEqual({ counted: false, reason: 'sets', minSets: 7 });
});
it('allows zero planned sets after the duration threshold', () => {
  expect(previewWorkoutPoints({ ...base, plannedSets: 0, loggedSets: 0 })).toEqual({ counted: true, points: 3 });
});
