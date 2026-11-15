import { expect, it, vi } from 'vitest';
import { buildHomeTasks } from '../../dashboard/home/tasks';
import { loadTasks, taskCounts } from '@/features/captain-workspace/server';
import type * as TasksServer from '@/features/captain-workspace/server';
import type { CaptainTask } from '@/features/captain-workspace';
import { createT } from '@/core/i18n/messages';
import { GET } from '@/app/[locale]/api/captain/task-count/route';

const state = vi.hoisted(() => ({ snapshot: null as { tasks: CaptainTask[] } | null }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => {} }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar',
  getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
vi.mock('@/features/roster/server', () => ({ fetchRoster: async () => ({ players: [{
  playerId: 'p', fullName: 'Player', accessUntil: '2026-11-21', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-09', programTitle: null, openTasks: 0,
}] }) }));
vi.mock('@/features/billing/server', () => ({ fetchPendingPaymentReceipts: async () => [
  { id: 'receipt', player_id: 'p', created_at: '2026-11-14' },
] }));
vi.mock('../../captain-workspace/queue/data/page', () => ({ loadQueuePage: async () => ({
  items: [{ id: 'video', kind: 'form', player_id: 'p', player_name: 'Player', exercise_name: 'Squat',
    created_at: '2026-11-14', reviewed_at: null, reply: null, note: null }],
  cursor: null, at: '2026-11-14T12:00:00Z',
}), loadQueueTriage: async () => ({ history: [], dailyChecks: [] }) }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } } }) },
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => query,
      in: async () => ({ data: [], error: null }),
      range: async () => ({ data: [], error: null }), limit: async () => ({ data: [], error: null }) };
    return query;
  },
}) }));
vi.mock('@/features/captain-workspace/server', async original => ({
  ...await original<typeof TasksServer>(), loadTasks: async (at?: string) =>
    state.snapshot ?? (await original<typeof TasksServer>()).loadTasks(at),
}));
it('uses one loaded fixture snapshot for home, Tasks total and the task-count endpoint', async () => {
  const snapshot = await loadTasks('2026-11-14T12:00:00Z');
  state.snapshot = snapshot;
  expect(taskCounts(snapshot.tasks).all).toBe(6);
  expect(buildHomeTasks(snapshot.tasks)).toHaveLength(6);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ count: 6 });
});
