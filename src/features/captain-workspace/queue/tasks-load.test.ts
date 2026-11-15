import { beforeEach, expect, it, vi } from 'vitest';
import type { QueuePage, loadQueuePage } from './data/page';
import { loadTasks } from './data/tasks';
import { taskCounts } from './tasks-model';
import { buildHomeTasks } from '../../dashboard/home/tasks';
import { GET } from '@/app/[locale]/api/captain/task-count/route';
const state = vi.hoisted(() => ({ pages: [] as QueuePage[], reads: 0, fail: false, authenticated: true,
  nutrition: [{ player_id: 'p' }] as { player_id: string }[], nutritionError: false,
  queries: [] as { table: string; column?: string; filters: [string, unknown][] }[],
  inputs: [] as Parameters<typeof loadQueuePage>[0][] }));
vi.mock('server-only', () => ({}));
vi.mock('@/features/captain-workspace/server', () => ({ loadTasks: async () => (await import('./data/tasks')).loadTasks() }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar' }));
vi.mock('@/features/roster/server', () => ({ fetchRoster: async () => ({ players: [{
  playerId: 'p', fullName: 'Player', accessUntil: '2026-12-01', startedOn: '2026-11-01',
  lastTrainingDate: '2026-11-14', programTitle: 'Plan', openTasks: 0,
}] }) }));
vi.mock('@/features/billing/server', () => ({ fetchPendingPaymentReceipts: async () => [] }));
vi.mock('./data/page', () => ({
  loadQueuePage: async (input: Parameters<typeof loadQueuePage>[0] = {}) => {
    state.inputs.push(input);
    const next = state.pages[state.reads++];
    if (!next) throw new Error('Unexpected queue page');
    return { ...next, items: next.items.filter(item => item.kind === 'request' ? !input.skipRequests : !input.skipInbox) };
  },
  loadQueueTriage: async () => ({ history: [], dailyChecks: [] }),
}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: state.authenticated ? 'captain' : undefined } } }) },
  from: (table: string) => {
    const read: typeof state.queries[number] = { table, filters: [] };
    state.queries.push(read);
    const query = { select: (column: string) => { read.column = column; return query; },
      eq: (column: string, value: unknown) => { read.filters.push([column, value]); return query; },
      in: (column: string, value: string[]) => { read.filters.push([column, value]); return query; }, order: () => query,
      then: (resolve: (result: { data: typeof state.nutrition; error: Error | null }) => unknown) =>
        Promise.resolve(resolve({ data: state.nutrition, error: state.nutritionError ? new Error('nutrition unavailable') : null })),
      range: async () => ({ data: [], error: state.fail ? new Error('offline') : null }) };
    return query;
  },
}) }));
beforeEach(() => { state.reads = 0; state.fail = false; state.authenticated = true; state.inputs = [];
  state.nutrition = [{ player_id: 'p' }]; state.nutritionError = false; state.queries = []; });
const item = (id: string, created_at: string) => ({ id, created_at, kind: 'form' as const,
  player_id: 'p', player_name: 'Player', exercise_name: 'Squat', note: null, reviewed_at: null, reply: null });
const page = (items: QueuePage['items'], cursor: QueuePage['cursor']): QueuePage => ({
  items, cursor, renewalCursor: null, previous: {}, at: '2026-11-14T12:00:00Z',
});
it.each([true, false])('reads active non-template roster nutrition once and shares counts (covered: %s)', async covered => {
  state.pages = [page([], null)];
  state.nutrition = covered ? [{ player_id: 'p' }] : [];
  const { tasks } = await loadTasks();
  expect(state.queries.filter(query => query.table === 'nutrition_plans')).toEqual([{
    table: 'nutrition_plans', column: 'player_id', filters: [
      ['captain_id', 'captain'], ['status', 'active'], ['is_template', false], ['player_id', ['p']],
    ],
  }]);
  const count = covered ? 0 : 1;
  expect(taskCounts(tasks).nutrition).toBe(count);
  expect(taskCounts(tasks).all).toBe(count);
  expect(buildHomeTasks(tasks)).toHaveLength(count);
  if (!covered) expect(buildHomeTasks(tasks)[0]).toMatchObject({ kind: 'nutrition', href: '/captain/players/p/nutrition' });
  state.reads = 0;
  expect(await (await GET()).json()).toEqual({ count });
});
it('rejects nutrition read errors instead of inventing missing-plan tasks', async () => {
  state.pages = [page([], null)]; state.nutritionError = true;
  await expect(loadTasks()).rejects.toThrow('nutrition unavailable');
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

it.each(['inbox', 'requests'] as const)('drains independent cursors when %s finishes first without duplicates', async finished => {
  const cursor = { id: 'r1', created_at: '2026-11-13T10:00:00Z' };
  const request = (id: string): QueuePage['items'][number] => ({ kind: 'request', id, player_id: 'p',
    player_name: 'Player', title: 'Assessment', created_at: cursor.created_at, reviewed_at: null, reply: null,
    alert: false, snapshot: { source: { kind: 'form', id, at: cursor.created_at }, facts: {} } });
  state.pages = [
    { ...page([item('v1', cursor.created_at), request('r1')], finished === 'inbox' ? null : cursor),
      requestCursor: finished === 'requests' ? null : cursor },
    // A finished stream would return its first page again unless explicitly skipped.
    { ...page([item(finished === 'inbox' ? 'v1' : 'v2', cursor.created_at), request(finished === 'requests' ? 'r1' : 'r2')], null), requestCursor: null },
  ];
  const { tasks } = await loadTasks();
  expect(tasks.map(task => task.id).sort()).toEqual(finished === 'inbox'
    ? ['request:r1', 'request:r2', 'video:v1'] : ['request:r1', 'video:v1', 'video:v2']);
  expect(state.reads).toBe(2);
  expect(state.inputs[1]).toEqual({ cursor: finished === 'inbox' ? undefined : cursor,
    requestCursor: finished === 'requests' ? undefined : cursor, skipRenewals: true,
    skipInbox: finished === 'inbox', skipRequests: finished === 'requests' });
  expect(taskCounts(tasks).all).toBe(3);
  expect(buildHomeTasks(tasks)).toHaveLength(3);
  expect(buildHomeTasks(tasks).find(task => task.id === 'request:r1')).toMatchObject({
    kind: 'assessment', href: '/captain/players/p/assessments?requestId=r1#assessment-details',
  });
  state.reads = 0;
  expect(await (await GET()).json()).toEqual({ count: 3 });
});

it('rejects missing sessions before queue reads can hide the authentication error', async () => {
  state.authenticated = false;
  state.pages = [];
  await expect(loadTasks()).rejects.toThrow('Unauthenticated');
  expect(state.reads).toBe(0);
});
