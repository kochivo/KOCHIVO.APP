import { expect, it } from 'vitest';
import { weeklyVolume } from './data/muscle-volume';

it('buckets a completed set into the player week', () => {
  const now = new Date('2026-01-03T21:30:00Z');
  const rows = [{ completed_at: '2026-01-02T21:30:00Z', deleted_at: null, reps: 8,
    exercises: { target: 'pectorals', body_part: 'chest' } }];
  expect(weeklyVolume(rows, now, 'Asia/Dubai').at(-1)?.total).toBe(1);
  expect(weeklyVolume(rows, now, 'America/New_York').at(-1)?.total).toBe(0);
});
