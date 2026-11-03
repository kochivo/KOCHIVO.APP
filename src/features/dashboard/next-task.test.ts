import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@/features/roster';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
const { captainNextTasks } = await import('./next-task');
const today = '2026-11-03';
const player = (id: string, extra: Partial<RosterPlayer> = {}): RosterPlayer => ({
  playerId: id, fullName: id, accessUntil: '2026-12-30', startedOn: '2026-10-01',
  lastTrainingDate: '2026-11-02', programTitle: 'Program', openTasks: 0, ...extra,
});
describe('captain next task', () => {
  it('invites the first player', () => expect(captainNextTasks([], new Map(), today)[0]?.kind).toBe('invite'));
  it('follows the card order while keeping alert urgency within each category', () => {
    const result = captainNextTasks([
      player('missing', { programTitle: null }), player('review', { openTasks: 3 }),
      player('expired', { accessUntil: '2026-10-01' }), player('grace', { accessUntil: '2026-11-02' }),
      player('late', { lastTrainingDate: '2026-10-20' }),
    ], new Map([['review', 500]]), today);
    expect(result.map(task => task.kind)).toEqual(['noProgram', 'review', 'renew', 'renew', 'dues', 'late']);
    expect(result[1]?.count).toBe(3);
    expect(result[2]?.name).toBe('expired');
    expect(result[0]?.href).toBe('/captain/players/missing/programs');
  });
  it('aggregates inbox items and prioritizes the largest debt', () => {
    const tasks = captainNextTasks([player('a', { openTasks: 2 }), player('b', { openTasks: 4 })], new Map([['a', 10], ['b', 50]]), today);
    expect(tasks[0]).toMatchObject({ kind: 'review', count: 6, href: '/captain/inbox' });
    expect(tasks[1]).toMatchObject({ kind: 'dues', name: 'b' });
  });
  it('uses the oldest missing program and stable ids for identical names', () => {
    expect(captainNextTasks([player('b', { programTitle: null }), player('a', { programTitle: null, startedOn: '2026-09-01' })], new Map(), today)[0]?.name).toBe('a');
  });
  it('messages the longest inactive player, including never-trained players, at seven days', () => {
    const rows = [player('six', { lastTrainingDate: '2026-10-28' }), player('seven', { lastTrainingDate: '2026-10-27' }),
      player('never', { lastTrainingDate: null, startedOn: '2026-10-01' })];
    expect(captainNextTasks(rows, new Map(), today).map(task => task.name)).toEqual(['never', 'seven']);
  });
  it('ignores soon-ending subscriptions and falls back to the players list', () => {
    expect(captainNextTasks([player('a', { accessUntil: '2026-11-08' })], new Map(), today)).toEqual([{ kind: 'done', href: '/captain/players' }]);
  });
  it('keeps the oldest expiry first and resolves equal alert names deterministically', () => {
    const rows = [player('b', { fullName: 'Same', accessUntil: '2026-10-01' }),
      player('a', { fullName: 'Same', accessUntil: '2026-10-01' }), player('new', { accessUntil: '2026-10-25' })];
    expect(captainNextTasks(rows, new Map(), today).slice(0, 3).map(task => task.name)).toEqual(['Same', 'Same', 'new']);
    expect(captainNextTasks([player('only', { accessUntil: '2026-11-02' })], new Map(), today)[0]?.kind).toBe('renew');
    expect(captainNextTasks([player('only')], new Map([['only', 10]]), today)[0]?.kind).toBe('dues');
  });
});
