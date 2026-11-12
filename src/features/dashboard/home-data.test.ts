import { beforeEach, expect, it, vi } from 'vitest';
import type { WorkspaceItem } from '@/features/inbox/server';
import type * as InboxServer from '@/features/inbox/server';

const state = vi.hoisted(() => ({ items: [] as WorkspaceItem[], failed: false, calls: [] as unknown[][],
  packages: [] as { id: string; full_name: string; created_at: string; package_id: string | null; offer_id: string | null; package_days: number | null; package_sessions: number | null }[],
  packageFailure: 'none' as 'none' | 'error' | 'throw', rpcCalls: [] as string[] }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: async (name: string) => {
  state.rpcCalls.push(name);
  if (state.packageFailure === 'throw') throw new Error('Offline');
  return { data: state.packageFailure === 'error' ? null : state.packages,
    error: state.packageFailure === 'error' ? { message: 'Unavailable' } : null };
} }) }));
vi.mock('@/features/inbox/server', async original => ({ ...await original<typeof InboxServer>(),
  loadWorkspaceInbox: async (...args: unknown[]) => {
    state.calls.push(args);
    if (state.failed) throw new Error('Unavailable');
    return { items: state.items, counts: { checkin: 6, form: 1, assessment: 1, request: 1, all: 9 },
      triage: { history: [], dailyChecks: [10, 11, 12].map(day => ({ player_id: 'urgent', log_date: `2026-11-${day}`,
        sleep_hours: 5, soreness: 1, deleted_at: null })) } };
  },
}));
const { loadHomeFollowup } = await import('./data/home-followup');
beforeEach(() => { state.items = []; state.failed = false; state.calls = []; state.packages = []; state.packageFailure = 'none'; state.rpcCalls = []; });
const now = new Date('2026-11-12T15:00:00Z');
it('uses follow-up triage, excludes reviewed items and requests from replies, and keeps exact request timestamps', async () => {
  state.items = [
    { kind: 'form', id: 'old', player_id: 'routine', player_name: 'Routine', created_at: '2026-11-01T10:00:00Z',
      reviewed_at: null, reply: null, exercise_name: 'Squat', note: null },
    { kind: 'checkin', id: 'new', player_id: 'urgent', player_name: 'Urgent', created_at: '2026-11-12T10:00:00Z',
      reviewed_at: null, reply: null, week_start: '2026-11-07', body_weight_kg: null, waist_cm: null, notes: null },
    { kind: 'form', id: 'done', player_id: 'done', player_name: 'Done', created_at: '2026-11-01T10:00:00Z',
      reviewed_at: '2026-11-11T10:00:00Z', reply: 'Reviewed', exercise_name: 'Squat', note: null },
    { kind: 'request', id: 'request', player_name: 'New', created_at: '2026-11-12T12:00:00Z', reviewed_at: null },
  ];
  const result = await loadHomeFollowup(now);
  expect(result.rows.map(row => row.id)).toEqual(['new', 'old']);
  expect(result.rows[0]?.flags).toEqual(['low_sleep']);
  expect(result.count).toBe(8);
  expect(result.requests).toEqual([{ id: 'request', name: 'New', at: '2026-11-12T12:00:00Z' }]);
  expect(state.calls).toEqual([[50, '2026-11-12T15:00:00.000Z']]);
});
it('propagates a failed follow-up read instead of returning an all-clear result', async () => {
  state.failed = true;
  await expect(loadHomeFollowup(now)).rejects.toThrow('Unavailable');
});
it('matches package data by request id instead of response order', async () => {
  state.items = ['a', 'b'].map(id => ({ kind: 'request', id, player_name: id, created_at: '2026-11-12T12:00:00Z', reviewed_at: null }));
  state.packages = [{ id: 'b', full_name: 'b', created_at: '2026-11-12T12:00:00Z', package_id: 'package',
    offer_id: null, package_days: 90, package_sessions: null }];
  const result = await loadHomeFollowup(now);
  expect(result.requests).toEqual([
    { id: 'a', name: 'a', at: '2026-11-12T12:00:00Z' },
    { id: 'b', name: 'b', at: '2026-11-12T12:00:00Z', package: { days: 90, sessions: null } },
  ]);
  expect(state.rpcCalls).toEqual(['pending_coach_join_packages']);
});
it.each(['error', 'throw'] as const)('retains pending requests when the package RPC fails with %s', async failure => {
  state.packageFailure = failure;
  state.items = [{ kind: 'request', id: 'old', player_name: 'Old', created_at: '2026-11-12T12:00:00Z', reviewed_at: null }];
  expect((await loadHomeFollowup(now)).requests).toEqual([{ id: 'old', name: 'Old', at: '2026-11-12T12:00:00Z' }]);
});
