import { beforeEach, expect, it, vi } from 'vitest';
import { fetchPlayerIdentity } from './data/player-identity';

const mocks = vi.hoisted(() => ({ server: vi.fn(), user: vi.fn(), profile: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: mocks.server }));

beforeEach(() => {
  vi.resetAllMocks();
  const query = { select: () => query, eq: () => query, maybeSingle: mocks.profile };
  mocks.server.mockResolvedValue({ auth: { getClaims: mocks.user }, from: () => query });
  mocks.user.mockResolvedValue({ data: { claims: { sub: 'player' } } });
});

it('maps the first name and keeps the authenticated identity', async () => {
  mocks.profile.mockResolvedValue({ data: { full_name: '  علي   أحمد ' } });
  expect(await fetchPlayerIdentity()).toEqual({ firstName: 'علي', playerId: 'player' });
});

it('retains the player id when the optional profile lookup fails', async () => {
  mocks.profile.mockRejectedValue(new Error('offline'));
  expect(await fetchPlayerIdentity()).toEqual({ firstName: undefined, playerId: 'player' });
});

it('allows cached screens when authentication cannot be loaded', async () => {
  mocks.server.mockRejectedValue(new Error('offline'));
  expect(await fetchPlayerIdentity()).toEqual({ firstName: undefined, playerId: undefined });
});
