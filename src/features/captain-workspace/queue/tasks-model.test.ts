import { expect, it } from 'vitest';
import type { RosterPlayer } from '@/features/roster';
import { buildTasks, contactedTasks, taskCounts, filterTasks } from './tasks-model';
const now = new Date('2026-11-14T12:00:00Z');
const player = (id: string, patch: Partial<RosterPlayer> = {}): RosterPlayer => ({
  playerId: id, fullName: id, accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-14', programTitle: 'Plan', openTasks: 0, ...patch,
});
const video = (id: string, at: string) => ({ kind: 'form' as const, id, player_id: 'a', player_name: 'A',
  created_at: at, reviewed_at: null, reply: null, exercise_name: 'Squat', note: 'Help' });
it('classifies all six kinds and orders videos, absence, check-ins, swaps, renewals, programs oldest first', () => {
  const tasks = buildTasks([video('new', '2026-11-13T10:00:00Z'), video('old', '2026-11-10T10:00:00Z'), {
    kind: 'checkin', id: 'check', player_id: 'a', player_name: 'A', created_at: '2026-11-01T10:00:00Z',
    reviewed_at: null, reply: null, week_start: '2026-11-01', body_weight_kg: 80, waist_cm: null, notes: null,
  }], [player('a'), player('absent', { lastTrainingDate: '2026-11-09' }),
    player('renew', { accessUntil: '2026-11-21' }), player('program', { programTitle: null })],
  [{ id: 'swap', player_id: 'a', created_at: '2026-11-01T10:00:00Z', from: 'Squat', to: 'Press' }], now, 'Africa/Cairo');
  expect(tasks.map(task => task.id)).toEqual(['video:old', 'video:new', 'absent:absent', 'checkin:check', 'swap:swap', 'renew:renew', 'program:program']);
  expect(taskCounts(tasks)).toEqual({ all: 7, video: 2, absent: 1, checkin: 1, swap: 1, renew: 1, program: 1, receipt: 0 });
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
