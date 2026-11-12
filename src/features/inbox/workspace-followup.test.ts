import { expect, it } from 'vitest';
import { followupView, followupMetrics, checkinKpis } from './workspace-followup';
import type { WorkspaceItem } from './workspace-types';
const now = new Date('2026-11-12T10:00:00Z');
const checkin: WorkspaceItem = { kind: 'checkin', id: 'a', player_id: 'p', player_name: 'Ali',
  created_at: '2026-11-10T09:00:00Z', reviewed_at: null, reply: null, week_start: '2026-11-07',
  body_weight_kg: 82.4, waist_cm: 91, notes: null };
const video: WorkspaceItem = { kind: 'form', id: 'b', player_id: 'q', player_name: 'Mona',
  created_at: '2026-11-12T09:00:00Z', reviewed_at: null, reply: null, exercise_name: 'Squat', note: null };
const reviewed = { ...checkin, id: 'c', created_at: '2026-11-11T08:00:00Z', reviewed_at: '2026-11-11T13:00:00Z', reply: 'Good' };
const inputs = { history: [], dailyChecks: [] };
it('uses the same status predicate for counts and filtering, including search and kind', () => {
  const view = followupView([checkin, video, reviewed], inputs, now, { kind: 'all', status: 'waiting', search: '' });
  expect(view.counts).toEqual({ waiting: 2, overdue: 1, completed: 1 });
  expect(view.attention).toEqual([checkin]);
  expect(view.routine).toEqual([video]);
  expect(followupView([checkin, video, reviewed], inputs, now, { kind: 'all', status: 'overdue', search: '' }).visible).toEqual([checkin]);
  expect(followupView([checkin, video, reviewed], inputs, now, { kind: 'checkin', status: 'completed', search: 'ali' }).visible).toEqual([reviewed]);
  expect(followupView([checkin, video, reviewed], inputs, now, { kind: 'form', status: 'waiting', search: 'ali' }).counts).toEqual({ waiting: 0, overdue: 0, completed: 0 });
});
it('omits unknown averages and derives real reply times from this week only', () => {
  expect(followupMetrics([checkin], now, '2026-11-06T22:00:00Z')).toMatchObject({ reviewedWeek: 0, replyHours: null, oldest: checkin.created_at });
  expect(followupMetrics([reviewed, { ...reviewed, id: 'old', reviewed_at: '2026-11-01T13:00:00Z' }], now, '2026-11-06T22:00:00Z')).toMatchObject({ reviewedWeek: 1, replyHours: 5 });
});
it('never invents food adherence or a change against a missing or non-previous week', () => {
  expect(checkinKpis(checkin, inputs.history)).toEqual([
    { key: 'weight', value: 82.4, change: null }, { key: 'waist', value: 91, change: null }, { key: 'adherence', value: null, change: null },
  ]);
  const past = { ...checkin, id: 'past', week_start: '2026-10-31', body_weight_kg: 83, waist_cm: 92 };
  expect(checkinKpis(checkin, [past])[0]?.change).toBe(-0.6);
  expect(checkinKpis(checkin, [{ ...past, week_start: '2026-10-24' }])[0]?.change).toBeNull();
});
