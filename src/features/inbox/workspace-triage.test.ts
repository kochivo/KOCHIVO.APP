import { expect, it } from 'vitest';
import { orderWorkspaceTasks, workspaceTriage } from './workspace-triage';
import type { WorkspaceItem } from './workspace-types';
const now = new Date('2026-11-12T10:00:00Z');
const input = { history: [], dailyChecks: [] };
const checkin: WorkspaceItem = { kind: 'checkin', id: 'c', player_id: 'a', player_name: 'Ali', created_at: now.toISOString(),
  reviewed_at: null, reply: null, week_start: '2026-11-07', body_weight_kg: 80, waist_cm: null, notes: 'Help' };
const form: WorkspaceItem = { kind: 'form', id: 'f', player_id: 'b', player_name: 'Mona', created_at: '2026-11-01T10:00:00Z',
  reviewed_at: null, reply: null, exercise_name: 'Squat', note: null };
it('prioritizes attention over an older routine item and preserves all computed flags', () => {
  expect(orderWorkspaceTasks([form, checkin], input, now, 'all').map(item => item.id)).toEqual(['c', 'f']);
  expect(workspaceTriage(checkin, input, now).flags.map(flag => flag.key)).toEqual(['no_logs', 'note_present']);
  expect(orderWorkspaceTasks([form, checkin], input, now, 'routine')).toEqual([form]);
  expect(orderWorkspaceTasks([form, checkin], input, now, 'attention')).toEqual([checkin]);
});
it('puts an assessment with a flagged answer in attention', () => {
  const assessment: WorkspaceItem = { kind: 'assessment', id: 'a', player_id: 'a', player_name: 'Ali', title: 'Weekly',
    created_at: now.toISOString(), reviewed_at: null, reply: null, answers: [{ id: 'q', label_ar: 'Pain', label_en: 'Pain', value: true, photoCount: 0, alert: true }] };
  expect(workspaceTriage(assessment, input, now).group).toBe('attention');
});
