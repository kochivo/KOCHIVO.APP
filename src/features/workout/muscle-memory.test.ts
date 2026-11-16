import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { lastSession, latestSession, performanceFor } from './data/last-performance';
import { isLightDay } from '@/features/player-home';
import type { PastSet } from './data/last-performance';
import { remoteLastSession } from './data/remote-last-session';

const set = (session_id: string, set_index: number, weight_kg: number, reps: number, minute: number): PastSet => ({
  id: `${session_id}-${set_index}`, session_id, set_index, weight_kg, reps, completed_at: `2026-11-0${minute < 60 ? 1 : 2}T10:${String(minute % 60).padStart(2, '0')}:00.000Z`,
});

it('walks past consecutive light sessions to keep 85 kg light and 100 kg usual', async () => {
  const rows = [set('usual', 1, 100, 10, 1), set('light1', 1, 85, 10, 62), set('light2', 1, 85, 10, 63)];
  const dates = ['2026-10-31', '2026-11-01', '2026-11-02'];
  const db = { set_logs: { filter: () => ({ toArray: async () => rows }) },
    workout_sessions: { toArray: async () => rows.map((row, i) => ({ id: row.session_id, training_date: dates[i] })) },
  } as unknown as Parameters<typeof lastSession>[0];
  const skip = (date: string) => isLightDay(true, ['2026-11-01'], date, 3, []);
  const baseline = await lastSession(db, 'exercise', 'today', undefined, skip);
  expect(performanceFor(baseline, 1)?.weight_kg).toBe(100);
  expect((performanceFor(baseline, 1)?.weight_kg ?? 0) * 0.85).toBe(85);
  rows.pop();
  expect((performanceFor(await lastSession(db, 'exercise', 'today', undefined, skip), 1)?.weight_kg ?? 0) * 0.85).toBe(85);
});

it('walks remote light history across pages and keeps the whole usual session', async () => {
  const light = Array.from({ length: 99 }, (_, index) => ({ ...set(`light-${index}`, 1, 85, 10, 65),
    workout_sessions: { training_date: '2026-11-02' } }));
  const usual = (index: number) => ({ ...set('usual', index, 100, 10, index), workout_sessions: { training_date: '2026-10-31' } });
  const range = vi.fn().mockResolvedValueOnce({ data: [...light, usual(2)], error: null })
    .mockResolvedValueOnce({ data: [usual(1)], error: null });
  const query = { select: () => query, eq: () => query, is: () => query, order: () => query, range };
  const last = await remoteLastSession({ from: () => query } as never, { playerId: 'p', exerciseId: 'ex', beforeSessionId: '',
    skipDate: date => isLightDay(true, ['2026-11-01'], date, 3, []) });
  expect(last?.sets.map(row => row.set_index)).toEqual([1, 2]);
  expect(range).toHaveBeenCalledWith(100, 199);
});

describe('muscle memory', () => {
  it('keeps every set of the newest earlier workout, in set order', () => {
    const last = latestSession([set('old', 1, 50, 10, 1), set('new', 2, 62.5, 8, 65), set('new', 1, 60, 10, 62)]);
    expect(last?.sets).toEqual([{ set_index: 1, weight_kg: 60, reps: 10 }, { set_index: 2, weight_kg: 62.5, reps: 8 }]);
    expect(latestSession([])).toBeNull();
  });
  it('matches the same set number and has nothing for extra sets', () => {
    const last = latestSession([set('s', 1, 60, 10, 1), set('s', 2, 62.5, 8, 2)]);
    expect(performanceFor(last, 2)).toEqual({ weight_kg: 62.5, reps: 8 });
    expect(performanceFor(last, 3)).toBeNull();
    expect(performanceFor(null, 1)).toBeNull();
  });
  it('reads the player’s synced sets when the phone has no history', async () => {
    const calls: unknown[][] = [];
    const query = {
      select: (...args: unknown[]) => { calls.push(['select', ...args]); return query; },
      eq: (...args: unknown[]) => { calls.push(['eq', ...args]); return query; },
      is: (...args: unknown[]) => { calls.push(['is', ...args]); return query; },
      neq: (...args: unknown[]) => { calls.push(['neq', ...args]); return query; },
      order: (...args: unknown[]) => { calls.push(['order', ...args]); return query; },
      limit: vi.fn(async () => ({ data: [set('s', 1, 40, 12, 1)], error: null })),
    };
    const client = { from: () => query } as never;
    expect(await remoteLastSession(client, { playerId: 'p1', exerciseId: 'ex', beforeSessionId: 'today' })).toMatchObject({ sets: [{ set_index: 1, weight_kg: 40, reps: 12 }] });
    expect(calls).toContainEqual(['eq', 'player_id', 'p1']);
    expect(calls).toContainEqual(['eq', 'exercise_id', 'ex']);
    expect(calls).toContainEqual(['neq', 'session_id', 'today']);
    expect(calls).toContainEqual(['is', 'deleted_at', null]);
    calls.length = 0;
    await remoteLastSession(client, { playerId: 'p1', exerciseId: 'ex', beforeSessionId: '' });
    expect(calls.some(([name]) => name === 'neq')).toBe(false);
  });
});
