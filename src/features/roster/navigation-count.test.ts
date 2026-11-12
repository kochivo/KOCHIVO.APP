import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  counts: { check_ins: 2, form_checks: 3, form_requests: 4 } as Record<string, number>,
  joins: 1, failed: '', signedIn: true, calls: [] as unknown[][],
}));
vi.mock('./data/client', () => ({ rosterClient: async () => ({
  auth: { getClaims: async () => ({ data: { claims: { sub: state.signedIn ? 'captain' : '' } }, error: null }) },
  from: (table: string) => {
    state.calls.push(['from', table]);
    const result = () => ({ count: state.counts[table], error: state.failed === table ? { message: 'Failed' } : null });
    const query = {
      select: (...args: unknown[]) => { state.calls.push(['select', table, ...args]); return query; },
      eq: (...args: unknown[]) => { state.calls.push(['eq', table, ...args]); return query; },
      is: (...args: unknown[]) => { state.calls.push(['is', table, ...args]); return query; },
      not: (...args: unknown[]) => { state.calls.push(['not', table, ...args]); return query; },
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  },
  rpc: async (name: string) => {
    state.calls.push(['rpc', name]);
    return { data: Array.from({ length: state.joins }, (_, index) => ({ id: String(index) })),
      error: state.failed === name ? { message: 'Failed' } : null };
  },
}) }));
import { fetchWaitingCount } from './data/navigation-count';

beforeEach(() => { state.counts = { check_ins: 2, form_checks: 3, form_requests: 4 }; state.joins = 1;
  state.failed = ''; state.signedIn = true; state.calls = []; });

it('matches all pending inbox types including assessments, joins and archived-player work', async () => {
  expect(await fetchWaitingCount()).toBe(10);
  for (const table of ['check_ins', 'form_checks', 'form_requests']) {
    expect(state.calls).toContainEqual(['select', table, 'id', { count: 'exact', head: true }]);
    expect(state.calls).toContainEqual(['eq', table, 'captain_id', 'captain']);
    expect(state.calls).toContainEqual(['is', table, 'reviewed_at', null]);
  }
  expect(state.calls).toContainEqual(['not', 'form_requests', 'answered_at', 'is', null]);
  expect(state.calls).toContainEqual(['rpc', 'pending_coach_join_requests']);
});
it.each(['check_ins', 'form_checks', 'form_requests', 'pending_coach_join_requests'])('does not report zero or a partial count when %s fails', async source => {
  state.failed = source;
  expect(await fetchWaitingCount()).toBeNull();
});
it('returns zero for an empty inbox and does no reads when signed out', async () => {
  state.counts = { check_ins: 0, form_checks: 0, form_requests: 0 }; state.joins = 0;
  expect(await fetchWaitingCount()).toBe(0);
  state.signedIn = false; state.calls = [];
  expect(await fetchWaitingCount()).toBeNull();
  expect(state.calls).toEqual([]);
});
