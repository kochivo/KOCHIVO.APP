import { describe, expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@/features/roster';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));
const { buildAlerts, dashboardStats, recentActivity } = await import('./alerts');
const { matchesPlayer } = await import('./search');

const today = '2026-11-03';
const player = (id: string, overrides: Partial<RosterPlayer> = {}): RosterPlayer => ({
  playerId: id, fullName: `لاعب ${id}`, accessUntil: '2026-12-30', startedOn: '2026-10-01',
  lastTrainingDate: '2026-11-02', programTitle: 'برنامج', openTasks: 0, ...overrides,
});

describe('smart alerts', () => {
  it('ranks lost access, then money, then reviews, then soon-ending and missing programs', () => {
    const alerts = buildAlerts([
      player('a', { accessUntil: '2026-11-08' }),
      player('b', { openTasks: 2 }),
      player('c', { programTitle: null }),
      player('d', { accessUntil: '2026-10-20' }),
      player('e', { accessUntil: '2026-11-01' }),
    ], new Map([['b', 500]]), today);
    expect(alerts.map((alert) => [alert.kind, alert.playerId, alert.value])).toEqual([
      ['expired', 'd', 14], ['grace', 'e', 2], ['dues', 'b', 500], ['review', 'b', 2], ['ending', 'a', 5], ['noProgram', 'c', 0],
    ]);
    expect(alerts.find((alert) => alert.kind === 'noProgram')?.href).toBe('/captain/players/c/programs');
    expect(alerts.find((alert) => alert.kind === 'review')?.href).toBe('/captain/inbox');
  });
  it('has nothing to say about a healthy roster', () => {
    expect(buildAlerts([player('a')], new Map(), today)).toEqual([]);
  });
});

describe('dashboard summary', () => {
  it('counts statuses and open tasks', () => {
    expect(dashboardStats([
      player('a'), player('b', { lastTrainingDate: '2026-10-20', openTasks: 3 }), player('c', { accessUntil: '2026-11-05', openTasks: 1 }),
    ], today)).toEqual({ active: 1, late: 1, ending: 1, tasks: 4 });
  });
  it('lists the latest trainers first and never-trained players last', () => {
    const rows = recentActivity([
      player('old', { lastTrainingDate: '2026-10-01' }), player('new', { lastTrainingDate: '2026-11-03' }),
      player('none', { lastTrainingDate: null }),
    ], 2);
    expect(rows.map((row) => row.playerId)).toEqual(['new', 'old']);
  });
  it('finds players by name or program regardless of Arabic letter forms', () => {
    const row = { fullName: 'أحمد علي', programTitle: 'تضخيم' };
    expect(matchesPlayer(row, 'احمد')).toBe(true);
    expect(matchesPlayer(row, '  تضخيم ')).toBe(true);
    expect(matchesPlayer(row, 'محمد')).toBe(false);
    expect(matchesPlayer({ fullName: 'Sara', programTitle: null }, 'sar')).toBe(true);
  });
});
