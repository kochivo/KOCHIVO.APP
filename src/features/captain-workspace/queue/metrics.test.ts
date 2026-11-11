import { expect, it } from 'vitest';
import { queueMetrics } from './metrics';
import { queueRow } from './model';
const now = new Date('2026-11-11T12:00:00Z');
const base = { kind: 'form' as const, id: 'one', player_id: 'p', player_name: 'Ahmed',
  created_at: '2026-11-10T08:00:00Z', reviewed_at: '2026-11-10T12:00:00Z', reply: null, exercise_name: 'Squat', note: null };
it('measures reply duration and compares two seven-day windows without counting pending rows', () => {
  const rows = [queueRow(base, undefined, now), queueRow({ ...base, id: 'old',
    created_at: '2026-11-02T06:00:00Z', reviewed_at: '2026-11-02T12:00:00Z' }, undefined, now),
  queueRow({ ...base, id: 'pending', reviewed_at: null }, undefined, now)];
  expect(queueMetrics(rows, now)).toMatchObject({ needsReply: 1, late: 1, reviewedWeek: 1, replyHours: 4, comparison: -2 });
});
it('does not invent an average or comparison when a window has no reviews', () => {
  expect(queueMetrics([], now)).toMatchObject({ replyHours: null, comparison: null, reviewedWeek: 0 });
});
it('uses the Cairo calendar week for reviewed this week and excludes future reviews', () => {
  const beforeSaturday = queueRow({ ...base, reviewed_at: '2026-11-06T21:00:00Z', created_at: '2026-11-06T20:00:00Z' }, undefined, now);
  const future = queueRow({ ...base, reviewed_at: '2026-11-12T12:00:00Z' }, undefined, now);
  expect(queueMetrics([beforeSaturday, future], now)).toMatchObject({ reviewedWeek: 0, replyHours: 1 });
});
