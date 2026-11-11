import { beforeEach, expect, it, vi } from 'vitest';
import { supabaseServer } from '@/core/supabase/server';
import { loadQueueCounts } from './data/counts';
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => (key: string) => key }));
type Call = [string, ...unknown[]];
const queries: { table: string; calls: Call[] }[] = [];
let fail = false;
beforeEach(() => {
  queries.length = 0; fail = false;
  const client = { auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: null }) },
    from: (table: string) => {
      const calls: Call[] = [];
      queries.push({ table, calls });
      const query = {
        select: (...args: unknown[]) => { calls.push(['select', ...args]); return query; },
        eq: (...args: unknown[]) => { calls.push(['eq', ...args]); return query; },
        is: (...args: unknown[]) => { calls.push(['is', ...args]); return query; },
        not: (...args: unknown[]) => { calls.push(['not', ...args]); return query; },
        lt: (...args: unknown[]) => { calls.push(['lt', ...args]); return query; },
        lte: (...args: unknown[]) => { calls.push(['lte', ...args]); return query; },
        gte: (...args: unknown[]) => { calls.push(['gte', ...args]); return query; },
        limit: (...args: unknown[]) => { calls.push(['limit', ...args]); return query; },
        then: (resolve: (value: { count: number; error: string | null }) => unknown) => {
          const count = table === 'coach_clients' ? (calls.filter(call => call[0] === 'lte').length > 1 ? 2 : 5)
            : calls.some(call => call[0] === 'not') ? 20 : calls.some(call => call[0] === 'gte') ? 2
              : calls.some(call => call[0] === 'lt') ? 3 : 10;
          return Promise.resolve(resolve({ count, error: fail ? 'offline' : null }));
        },
      };
      return query;
    } };
  vi.mocked(supabaseServer).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof supabaseServer>>);
});
it('counts all requests with captain-scoped bounded head queries and a Cairo week boundary', async () => {
  expect(await loadQueueCounts('2026-11-11T12:00:00.000Z')).toEqual({
    needsReply: 25, late: 8, reviewed: 40, reviewedWeek: 4, all: 65,
  });
  expect(queries).toHaveLength(10);
  for (const { calls } of queries) {
    expect(calls).toContainEqual(['select', 'id', { count: 'exact', head: true }]);
    expect(calls).toContainEqual(['eq', 'captain_id', 'captain']);
    expect(calls).toContainEqual(['limit', 1]);
  }
  expect(queries.flatMap(query => query.calls)).toContainEqual(['gte', 'reviewed_at', '2026-11-06T22:00:00.000Z']);
  expect(queries.flatMap(query => query.calls)).toContainEqual(['lt', 'created_at', '2026-11-10T12:00:00.000Z']);
});
it('surfaces a failed count rather than displaying a misleading zero', async () => {
  fail = true;
  await expect(loadQueueCounts('2026-11-11T12:00:00.000Z')).rejects.toThrow('error');
});
