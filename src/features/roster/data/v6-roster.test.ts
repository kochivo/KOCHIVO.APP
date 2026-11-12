import { beforeEach, expect, it, vi } from 'vitest';
import { loadRosterExtras } from './v6-roster';

const fake = vi.hoisted(() => ({ from: vi.fn(), roster: vi.fn(), plan: vi.fn(), requests: vi.fn(), failed: false }));
vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ rosterClient: async () => ({ from: fake.from }) }));
vi.mock('./roster', () => ({ fetchRoster: fake.roster }));
vi.mock('@/features/billing/server', () => ({ fetchPlanSummary: fake.plan }));
vi.mock('@/features/coach-page', () => ({ loadJoinRequests: fake.requests }));
beforeEach(() => {
  vi.clearAllMocks(); fake.failed = false;
  fake.roster.mockResolvedValue({ players: Array.from({ length: 100 }, (_, i) => ({ playerId: `p${i}` })) });
  fake.plan.mockResolvedValue({ plan: { player_limit: 120 }, used: 100 });
  fake.requests.mockResolvedValue({ data: [{ id: 'r', full_name: 'Mona' }] });
  fake.from.mockImplementation((table: string) => {
    const result = { data: table === 'player_intake' ? [{ player_id: 'p0', weight_kg: 80, target_weight_kg: 75, experience: 'new' }]
      : [{ player_id: 'p0' }], error: fake.failed ? new Error('Read failed') : null };
    const query = { select: () => query, in: () => query, eq: () => Promise.resolve(result), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  });
});
it('enriches 100 rows with two bulk reads and uses actual plan capacity', async () => {
  const data = await loadRosterExtras();
  expect(data.free).toBe(20);
  expect(data.meta?.p0).toEqual({ food: true, weight: 80, target: 75, experience: 'new' });
  expect(data.requests?.[0]?.full_name).toBe('Mona');
  expect(fake.from).toHaveBeenCalledTimes(2);
});
it('does not label missing nutrition from a failed or partial metadata read', async () => {
  fake.failed = true;
  expect(await loadRosterExtras()).toEqual({ error: true });
});
it('reports unavailable plan limits instead of inventing free places', async () => {
  fake.plan.mockResolvedValue(null);
  expect(await loadRosterExtras()).toEqual({ error: true });
  expect(fake.from).not.toHaveBeenCalled();
});
