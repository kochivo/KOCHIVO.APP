import { expect, it } from 'vitest';
import type { RosterPlayer } from '@/features/roster';
import { buildTasks, contactedTasks, taskCounts, filterTasks, taskTabs } from './tasks-model';
import type { CustomFormItem } from './model';
const now = new Date('2026-11-14T12:00:00Z');
const player = (id: string, patch: Partial<RosterPlayer> = {}): RosterPlayer => ({
  playerId: id, fullName: id, accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-14', programTitle: 'Plan', openTasks: 0, ...patch,
});
const video = (id: string, at: string) => ({ kind: 'form' as const, id, player_id: 'a', player_name: 'A',
  created_at: at, reviewed_at: null, reply: null, exercise_name: 'Squat', note: 'Help' });
it('adds nutrition after program tasks only for eligible players without an active nutrition plan', () => {
  const tasks = buildTasks([], [player('missing'), player('both', { programTitle: null }), player('covered'),
    player('pending', { pending: true }), player('frozen', { frozenAt: '2026-11-01' }),
    player('expired', { accessUntil: '2026-11-13' })], [], now, 'Africa/Cairo', [], new Set(['covered']));
  expect(tasks.map(task => task.id)).toEqual(['program:both', 'nutrition:both', 'nutrition:missing']);
  expect(filterTasks(tasks, 'nutrition')).toHaveLength(2);
  expect(taskCounts(tasks).nutrition).toBe(2);
  expect(taskTabs.slice(taskTabs.indexOf('program'))).toEqual(['program', 'nutrition']);
  expect(tasks.find(task => task.id === 'nutrition:missing')?.href).toBe('/captain/players/missing/nutrition');
});
it('does not create nutrition tasks when nutrition coverage is unknown', () => {
  expect(buildTasks([], [player('a')], [], now, 'Africa/Cairo')).toEqual([]);
});
it('includes an answered assessment once and excludes reviewed assessments', () => {
  const request: CustomFormItem = { kind: 'request', id: 'r', player_id: 'a', player_name: 'A',
    title: 'Monthly assessment', created_at: '2026-11-13T10:00:00Z', reviewed_at: null, reply: null,
    alert: false, snapshot: { source: { kind: 'form', id: 'r', at: '2026-11-13T10:00:00Z' }, facts: {} } };
  const tasks = buildTasks([request, { ...request, id: 'done', reviewed_at: '2026-11-14T10:00:00Z' }],
    [player('a')], [], now, 'Africa/Cairo');
  expect(tasks).toMatchObject([{ id: 'request:r', kind: 'checkin', text: 'Monthly assessment',
    href: '/captain/players/a/assessments?requestId=r#assessment-details' }]);
  expect(taskCounts(tasks).all).toBe(1);
});
it('classifies all six kinds and orders videos, absence, check-ins, swaps, renewals, programs oldest first', () => {
  const tasks = buildTasks([video('new', '2026-11-13T10:00:00Z'), video('old', '2026-11-10T10:00:00Z'), {
    kind: 'checkin', id: 'check', player_id: 'a', player_name: 'A', created_at: '2026-11-01T10:00:00Z',
    reviewed_at: null, reply: null, week_start: '2026-11-01', body_weight_kg: 80, waist_cm: null, notes: null,
  }], [player('a'), player('absent', { lastTrainingDate: '2026-11-09' }),
    player('renew', { accessUntil: '2026-11-21' }), player('program', { programTitle: null })],
  [{ id: 'swap', player_id: 'a', created_at: '2026-11-01T10:00:00Z', from: 'Squat', to: 'Press' }], now, 'Africa/Cairo');
  expect(tasks.map(task => task.id)).toEqual(['video:old', 'video:new', 'absent:absent', 'checkin:check', 'swap:swap', 'renew:renew', 'program:program']);
  expect(taskCounts(tasks)).toEqual({ all: 7, video: 2, absent: 1, checkin: 1, swap: 1, renew: 1, program: 1, nutrition: 0, receipt: 0 });
  expect(filterTasks(tasks, 'video').map(task => task.id)).toEqual(['video:old', 'video:new']);
});
it('includes receipts for expired players, supports their filter and keeps them after contact', () => {
  const tasks = buildTasks([], [player('a', { accessUntil: '2026-10-01' })], [], now, 'Africa/Cairo', [
    { id: 'receipt-1', player_id: 'a', created_at: '2026-11-13T10:00:00Z' },
    { id: 'receipt-2', player_id: 'outsider', created_at: '2026-11-12T10:00:00Z' },
  ]);
  expect(tasks.map(task => [task.id, task.kind])).toEqual([['receipt:receipt-1', 'receipt']]);
  expect(taskCounts(tasks).receipt).toBe(1);
  expect(filterTasks(tasks, 'receipt')).toEqual(tasks);
  expect(contactedTasks(tasks, { a: '2026-11-14T11:00:00Z' }, 'Africa/Cairo')).toEqual(tasks);
});
it('excludes reviewed items, four-day absences, eight-day renewals and inactive roster players', () => {
  const tasks = buildTasks([{ ...video('done', '2026-11-01T10:00:00Z'), reviewed_at: '2026-11-02T10:00:00Z' }], [
    player('recent', { lastTrainingDate: '2026-11-10', accessUntil: '2026-11-22' }),
    ...[{ pending: true }, { frozenAt: '2026-11-01' }, { accessUntil: '2026-11-13' }].map((patch, i) =>
      player(String(i), { lastTrainingDate: null, programTitle: null, ...patch })),
  ], [], now, 'Africa/Cairo');
  expect(tasks).toEqual([]);
  expect(taskCounts(tasks).all).toBe(0);
  expect(filterTasks(tasks, 'checkin')).toEqual([]);
});
it('uses each player local date and join date for a player who never trained', () => {
  expect(buildTasks([], [player('new', { startedOn: '2026-11-09', lastTrainingDate: null })], [], now, 'Africa/Cairo')
    .map(task => task.kind)).toEqual(['absent']);
});
it('orders timestamps by their instant when they have different timezone offsets', () => {
  const tasks = buildTasks([video('later', '2026-11-10T09:00:00Z'), video('earlier', '2026-11-10T10:00:00+02:00')], [], [], now, 'Africa/Cairo');
  expect(tasks.map(task => task.id)).toEqual(['video:earlier', 'video:later']);
});
it('keeps early contact from hiding new absence and renewal tasks, and clears contacted tasks across reloads', () => {
  const tasks = buildTasks([], [player('a', { lastTrainingDate: '2026-11-08', accessUntil: '2026-11-20' })], [], now, 'Africa/Cairo');
  expect(contactedTasks(tasks, { a: '2026-11-12T10:00:00Z' }, 'Africa/Cairo').map(task => task.kind)).toEqual(['absent', 'renew']);
  expect(contactedTasks(tasks, { a: '2026-11-13T10:00:00Z' }, 'Africa/Cairo')).toEqual([]);
  const changed = buildTasks([], [player('a', { lastTrainingDate: '2026-11-14', accessUntil: '2026-11-21' })], [], now, 'Africa/Cairo');
  expect(contactedTasks(changed, { a: '2026-11-13T10:00:00Z' }, 'Africa/Cairo').map(task => task.kind)).toEqual(['renew']);
});
