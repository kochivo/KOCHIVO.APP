import { expect, it, vi } from 'vitest';
import { buildHomeTasks, taskEstimate, weekChart, taskProgress, trainingToday } from './home/tasks';
import type { RosterPlayer } from '@/features/roster';

vi.mock('server-only', () => ({}));
const now = new Date('2026-11-12T10:00:00Z');
const player = (id: string, extra: Partial<RosterPlayer> = {}): RosterPlayer => ({ playerId: id, fullName: id,
  accessUntil: '2026-12-01', startedOn: '2026-11-01', lastTrainingDate: '2026-11-12', programTitle: 'Program', openTasks: 0, ...extra });

it('estimates three minutes for each pending task, including an empty day', () => {
  expect(taskEstimate(7)).toBe(21);
  expect(taskEstimate(0)).toBe(0);
});
it('uses completed reviews and pending work for progress without a sample daily target', () => {
  expect(taskProgress(3, 7)).toBe(0.3);
  expect(taskProgress(0, 0)).toBe(1);
  expect(taskProgress(0, 20)).toBe(0);
});
it('charts all sessions Saturday to Friday, keeps zero days, and distinguishes future days', () => {
  expect(weekChart([{ date: '2026-11-07' }, { date: '2026-11-07' }, { date: '2026-11-12' },
    { date: '2026-11-06' }, { date: '2026-11-14' }], '2026-11-12')).toEqual([
    { date: '2026-11-07', count: 2, passed: true }, { date: '2026-11-08', count: 0, passed: true },
    { date: '2026-11-09', count: 0, passed: true }, { date: '2026-11-10', count: 0, passed: true },
    { date: '2026-11-11', count: 0, passed: true }, { date: '2026-11-12', count: 1, passed: false },
    { date: '2026-11-13', count: 0, passed: false },
  ]);
});
it('keeps every review before operational tasks and does not cap the shared list at four', () => {
  const reviews = Array.from({ length: 6 }, (_, index) => ({ id: String(index), playerId: 'a', name: 'Ali',
    kind: 'form' as const, title: 'Squat', at: '2026-11-12T08:00:00Z', flags: [] }));
  const tasks = buildHomeTasks(reviews, [player('a'), player('b', { lastTrainingDate: '2026-11-07' }),
    player('c', { programTitle: null }), player('frozen', { frozenAt: '2026-11-01', programTitle: null })], new Map([['a', 100]]), now, 'Africa/Cairo');
  expect(tasks.slice(0, 6).map(task => task.id)).toEqual(['form:0', 'form:1', 'form:2', 'form:3', 'form:4', 'form:5']);
  expect(tasks.filter(task => task.kind === 'absent')).toMatchObject([{ name: 'b', days: 5 }]);
  expect(tasks.some(task => task.name === 'frozen')).toBe(false);
  expect(tasks.some(task => task.kind === 'noProgram' && task.name === 'c')).toBe(true);
  expect(tasks.some(task => task.kind === 'dues' && task.name === 'a')).toBe(true);
});
it('counts active players once using their local day across the Friday to Saturday boundary', () => {
  expect(trainingToday([player('tokyo', { timezone: 'Asia/Tokyo' }), player('cairo'),
    player('frozen', { frozenAt: '2026-11-01' }), player('pending', { pending: true }),
    player('expired', { accessUntil: '2026-11-01' })], [
    { playerId: 'tokyo', date: '2026-11-14' }, { playerId: 'tokyo', date: '2026-11-14' },
    { playerId: 'cairo', date: '2026-11-12' }, { playerId: 'frozen', date: '2026-11-13' },
    { playerId: 'pending', date: '2026-11-13' }, { playerId: 'expired', date: '2026-11-13' },
  ], new Date('2026-11-13T20:30:00Z'), 'Africa/Cairo')).toEqual({ trained: 1, active: 2 });
});
