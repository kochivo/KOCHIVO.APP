import { expect, it } from 'vitest';
import { libraryMetrics } from './data/metrics';

it('aggregates the sent cohort globally and per form, including archived forms globally', () => {
  const rows = [
    { form_id: 'a', player_id: 'p1', sent_at: '2026-11-01T00:00Z', answered_at: '2026-11-01T02:00Z' },
    { form_id: 'a', player_id: 'p1', sent_at: '2026-11-02T00:00Z', answered_at: null },
    { form_id: 'b', player_id: 'p1', sent_at: '2026-11-03T00:00Z', answered_at: '2026-11-03T04:00Z' },
    { form_id: 'archived', player_id: 'p2', sent_at: '2026-11-04T00:00Z', answered_at: null },
  ];
  expect(libraryMetrics(rows, ['a', 'b', 'empty'])).toEqual({
    metrics: { active: 3, sent: 4, answered: 2, recipients: 2, averageHours: 3 },
    byForm: {
      a: { active: 0, sent: 2, answered: 1, recipients: 1, averageHours: 2 },
      b: { active: 0, sent: 1, answered: 1, recipients: 1, averageHours: 4 },
      empty: { active: 0, sent: 0, answered: 0, recipients: 0, averageHours: null },
    },
  });
  expect(libraryMetrics([], []).metrics).toEqual({ active: 0, sent: 0, answered: 0, recipients: 0, averageHours: null });
});
