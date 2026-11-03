import { beforeEach, expect, it, vi } from 'vitest';
import { fetchCaptains, fetchPlanTiers } from './captains';
import { fetchAudit } from './audit';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), result: { data: [] as unknown[], error: null } }));
const captain = {
  id: 'captain', full_name: 'كابتن', email: null, email_confirmed: true,
  created_at: '2026-11-01T10:00:00Z', tier: 'entry', tier_ends_at: null,
  last_paid_tier: null, last_paid_ends_at: null, over_limit: false,
  active_players: 0, player_limit: 5, suspended: false,
};
const audit = { id: 'audit', admin_id: 'admin', target_id: 'captain', created_at: '2026-11-01T10:00:00Z' };
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mocks.rpc, from: mocks.from }) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.result.data = [];
  const query = {
    select: () => query, order: () => query, limit: () => query,
    then: (resolve: (value: typeof mocks.result) => unknown) => Promise.resolve(mocks.result).then(resolve),
  };
  mocks.from.mockReturnValue(query);
});

it.each([
  { tier: 'unexpected', last_paid_tier: null },
  { tier: 'entry', last_paid_tier: 'unexpected' },
])('rejects unsupported captain tiers: %j', async patch => {
  const row = { ...captain, ...patch };
  mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [row], error: null });
  expect(await fetchCaptains()).toMatchObject({ rows: [], error: expect.any(String) });
});

it('preserves nullable captain history', async () => {
  const row = { ...captain };
  mocks.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [row], error: null });
  expect(await fetchCaptains()).toEqual({ rows: [row], error: null });
});

it('rejects an unsupported plan tier', async () => {
  mocks.result.data = [{ tier: 'unexpected', price_egp: 100, player_limit: 5, position: 1 }];
  expect(await fetchPlanTiers()).toMatchObject({ rows: [], error: expect.any(String) });
});

it.each([
  { action: 'unexpected', details: {} },
  { action: 'suspend', details: null },
  { action: 'suspend', details: [] },
])('rejects an audit row outside the domain: %j', async patch => {
  mocks.result.data = [{ ...audit, ...patch }];
  expect(await fetchAudit()).toMatchObject({ rows: [], error: expect.any(String) });
});

it.each(['activate_plan', 'suspend', 'unsuspend'])('preserves the %s audit action and JSON details', async action => {
  const row = { ...audit, action, details: { months: 1, reference: null, nested: { paid: true } } };
  mocks.result.data = [row];
  expect(await fetchAudit()).toEqual({ rows: [row], error: null });
});
