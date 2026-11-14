import { beforeEach, expect, it, vi } from 'vitest';
import type { QueuePage } from './data/page';
import { loadTasks } from './data/tasks';
const state = vi.hoisted(() => ({ pages: [] as QueuePage[], reads: 0, fail: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar' }));
vi.mock('@/features/roster/server', () => ({ fetchRoster: async () => ({ players: [{
  playerId: 'p', fullName: 'Player', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-14', programTitle: 'Plan', openTasks: 0,
}] }) }));
vi.mock('@/features/billing/server', () => ({ fetchPendingPaymentReceipts: async () => [] }));
vi.mock('./data/page', () => ({
  loadQueuePage: async () => state.pages[state.reads++],
  loadQueueTriage: async () => ({ history: [], dailyChecks: [] }),
}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } } }) },
  from: () => {
    const query = { select: () => query, eq: () => query, order: () => query,
      range: async () => ({ data: [], error: state.fail ? new Error('offline') : null }) };
    return query;
  },
}) }));
beforeEach(() => { state.reads = 0; state.fail = false; });
const item = (id: string, created_at: string) => ({ id, created_at, kind: 'form' as const,
  player_id: 'p', player_name: 'Player', exercise_name: 'Squat', note: null, reviewed_at: null, reply: null });
const page = (items: QueuePage['items'], cursor: QueuePage['cursor']): QueuePage => ({
  items, cursor, renewalCursor: null, previous: {}, at: '2026-11-14T12:00:00Z',
});
it('includes oldest items from subsequent queue pages before exposing counts', async () => {
  state.pages = [page([item('new', '2026-11-13T10:00:00Z')], { id: 'new', created_at: '2026-11-13T10:00:00Z' }),
    page([item('old', '2026-11-01T10:00:00Z')], null)];
  const data = await loadTasks();
  expect(data.tasks.map(task => task.id)).toEqual(['video:old', 'video:new']);
  expect(data.captainId).toBe('captain');
});
it('rejects incomplete reads instead of rendering a false empty state', async () => {
  state.pages = [page([], null)]; state.fail = true;
  await expect(loadTasks()).rejects.toThrow('offline');
});
