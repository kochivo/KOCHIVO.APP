import { expect, it, vi } from 'vitest';
import type { RosterPlayer } from '@/features/roster';
import { buildTasks, contactedTasks, taskCounts } from '@/features/captain-workspace/server';
import { buildHomeTasks } from './home/tasks';
import { endingPlayers } from './home/model';
import { expiringSoon, subscriptionTiles } from '@/features/billing/server';
import { frameCounts } from '@/features/roster/server';
import { readProgress } from '@/features/ko-account/server';
import type { KoActor } from '@/features/ko-account/server';
import { buildDigest } from '@/features/ko-feed';

vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));

it('feeds the same roster through home, tasks, badges, billing and KO with an injected day', async () => {
  const today = '2026-11-14', now = new Date(`${today}T12:00:00Z`);
  const player = (playerId: string, patch: Partial<RosterPlayer> = {}): RosterPlayer => ({
    playerId, fullName: playerId, accessUntil: '2026-12-01', startedOn: '2026-11-01',
    lastTrainingDate: today, programTitle: 'Plan', openTasks: 0, ...patch,
  });
  const roster = [player('today', { accessUntil: today }), player('seven', { accessUntil: '2026-11-21' }),
    player('eight', { accessUntil: '2026-11-22' }), player('expired', { accessUntil: '2026-11-13' }),
    player('pending', { accessUntil: today, pending: true }), player('frozen', { accessUntil: today, frozenAt: today }),
    player('sessions', { accessUntil: today, sessionsLeft: 3 }), player('absent', { lastTrainingDate: '2026-11-09' }),
    player('three', { lastTrainingDate: '2026-11-11' }), player('program', { programTitle: null })];
  const tasks = buildTasks([], roster, [{ id: 'swap', player_id: 'eight', created_at: today, from: 'A', to: 'B' }],
    now, 'Africa/Cairo', [{ id: 'receipt', player_id: 'expired', created_at: today }]);
  expect(taskCounts(tasks)).toEqual({ all: 7, renew: 3, absent: 1, program: 1, swap: 1, receipt: 1, video: 0, checkin: 0 });
  expect(buildHomeTasks(tasks)).toHaveLength(7);
  expect(frameCounts({ tasks: tasks.length, chats: { today: 2 }, joins: 1 })).toEqual({ tasks: 7, inbox: 2, join: 1, billing: null });
  expect(endingPlayers(roster, now, 'Africa/Cairo').map(row => row.playerId)).toEqual(['sessions', 'today', 'seven']);
  expect(expiringSoon(roster, today).map(row => row.playerId)).toEqual(['today', 'sessions', 'seven']);
  expect(subscriptionTiles(roster, today, 0, 0).ending).toBe(3);
  const actor = { id: 'captain', role: 'captain', db: {
    rpc: async (name: string) => ({ error: null, data: name === 'captain_roster' ? roster.map(row => ({
      player_id: row.playerId, full_name: row.fullName, access_until: row.accessUntil,
      started_on: row.startedOn, last_training_date: row.lastTrainingDate,
    })) : [] }),
    from: () => {
      const query = { select: () => query, eq: () => query, is: async () => ({ error: null,
        data: roster.map(row => ({ player_id: row.playerId, pending: row.pending, frozen_at: row.frozenAt })) }) };
      return query;
    },
  } } as unknown as KoActor;
  expect((await readProgress(actor, { kind: 'team_summary', args: {} }, 'en', now.getTime())).split('\n')[1])
    .toBe('Subscriptions ending within 7 days: today، seven، sessions.');
  expect(buildDigest(['today', 'seven', 'sessions', 'expired'].map(player_id => ({
    key: player_id, player_id, player_name: player_id, data: {}, severity: 'urgent',
    kind: player_id === 'expired' ? 'expired' : 'expiring',
  })), null, 'en')).toEqual(['4 subscriptions ending or ended']);
  const remaining = contactedTasks(tasks, { today: `${today}T10:00:00Z`, absent: `${today}T10:00:00Z` }, 'Africa/Cairo');
  expect(taskCounts(remaining).all).toBe(5);
  expect(buildHomeTasks(remaining)).toHaveLength(5);
  expect(frameCounts({ tasks: remaining.length, chats: {}, joins: 0 }).tasks).toBe(5);
  expect(subscriptionTiles(roster, today, 0, 0).ending).toBe(3);
});

it('uses the captain day for expiry even when players are on the previous or next day', () => {
  const now = new Date('2026-11-14T22:30:00Z');
  const roster: RosterPlayer[] = ['America/Los_Angeles', 'Asia/Tokyo'].map(timezone => ({
    playerId: timezone, fullName: timezone, timezone, accessUntil: '2026-11-22',
    startedOn: '2026-11-01', lastTrainingDate: '2026-11-15', programTitle: 'Plan', openTasks: 0,
  }));
  expect(taskCounts(buildTasks([], roster, [], now, 'Africa/Cairo')).renew).toBe(2);
  expect(endingPlayers(roster, now, 'Africa/Cairo')).toHaveLength(2);
  expect(subscriptionTiles(roster, '2026-11-15', 0, 0).ending).toBe(2);
});
