import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from './workspace-messages';
import { loadWorkspaceReviews } from './data/workspace';
const state = vi.hoisted(() => ({ calls: [] as { table: string; method: string; args: unknown[] }[], fail: false }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(workspaceMessages, 'en'), getLocale: async () => 'en' }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/features/forms/server', () => ({ formsAccess: async () => ({ captain: 'captain', client: { from: query } }) }));
function query(table: string) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain = Object.fromEntries(['select', 'eq', 'not', 'gte', 'lte', 'lt', 'or', 'order', 'limit'].map(method => [method, (...args: unknown[]) => {
    state.calls.push({ table, method, args }); calls.push({ method, args }); return chain;
  }]));
  Object.assign(chain, { then(resolve: (value: unknown) => void) {
    const head = calls.some(c => c.method === 'select' && (c.args[1] as { head?: boolean } | undefined)?.head);
    const data = table === 'check_ins' && !head ? [{ id: '00000000-0000-0000-0000-000000000001', player_id: 'p',
      created_at: '2026-11-11T08:00:00Z', reviewed_at: '2026-11-11T13:00:00Z', captain_reply: 'Good', week_start: '2026-11-07',
      body_weight_kg: 82, waist_cm: 91, notes: null, profiles: { full_name: 'Ali', timezone: 'Africa/Cairo' } }] : [];
    resolve({ data, count: data.length, error: state.fail ? { message: 'failed' } : null });
  } });
  return chain;
}
beforeEach(() => { state.calls = []; state.fail = false; });
it('loads this week with captain ownership, a stable order and a hard row bound on every table', async () => {
  const result = await loadWorkspaceReviews({ at: '2026-11-12T10:00:00Z' });
  expect(result.items).toMatchObject([{ kind: 'checkin', player_name: 'Ali', reply: 'Good' }]);
  expect(result.total).toBe(1);
  for (const table of ['check_ins', 'form_checks', 'form_requests']) {
    const calls = state.calls.filter(call => call.table === table);
    expect(calls.some(call => call.method === 'eq' && call.args[0] === 'captain_id' && call.args[1] === 'captain')).toBe(true);
    expect(calls.some(call => call.method === 'gte' && call.args[0] === 'reviewed_at' && call.args[1] === '2026-11-06T22:00:00.000Z')).toBe(true);
    expect(calls.some(call => call.method === 'limit' && call.args[0] === 51)).toBe(true);
  }
});
it('validates cursors before querying and surfaces query errors instead of returning an empty history', async () => {
  await expect(loadWorkspaceReviews({ at: 'invalid' })).rejects.toThrow();
  expect(state.calls).toHaveLength(0);
  state.fail = true;
  await expect(loadWorkspaceReviews({ at: '2026-11-12T10:00:00Z' })).rejects.toThrow();
});
it('pages all reviewed kinds with a timestamp, id and kind tie-break instead of a growing or unbounded query', async () => {
  await loadWorkspaceReviews({ at: '2026-11-12T10:00:00Z', cursor: {
    at: '2026-11-11T13:00:00.123456Z', id: '00000000-0000-7000-8000-000000000001', kind: 'checkin',
  } });
  expect(state.calls.filter(call => call.method === 'or').map(call => [call.table, call.args[0]])).toEqual([
    ['check_ins', 'reviewed_at.lt.2026-11-11T13:00:00.123456Z,and(reviewed_at.eq.2026-11-11T13:00:00.123456Z,id.gt.00000000-0000-7000-8000-000000000001)'],
    ['form_checks', 'reviewed_at.lt.2026-11-11T13:00:00.123456Z,and(reviewed_at.eq.2026-11-11T13:00:00.123456Z,id.gte.00000000-0000-7000-8000-000000000001)'],
    ['form_requests', 'reviewed_at.lt.2026-11-11T13:00:00.123456Z,and(reviewed_at.eq.2026-11-11T13:00:00.123456Z,id.gt.00000000-0000-7000-8000-000000000001)'],
  ]);
  expect(state.calls.filter(call => call.method === 'limit').map(call => call.args[0])).toEqual([51, 51, 51]);
});
