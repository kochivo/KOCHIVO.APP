import { beforeEach, expect, it, vi } from 'vitest';
import { fetchPlayerIdentity } from './player-identity';
const mocks = vi.hoisted(() => ({ claims: vi.fn(), getUser: vi.fn(), profile: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: mocks.claims, getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
}) }));
beforeEach(() => {
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'player' } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.profile.mockResolvedValue({ data: { full_name: 'Ahmed Ali' }, error: null });
});
it('loads the greeting using a verified id without an auth server round trip', async () => {
  expect(await fetchPlayerIdentity()).toEqual({ playerId: 'player', firstName: 'Ahmed' });
  expect(mocks.getUser).not.toHaveBeenCalled();
});
it('does not use claims returned with an auth error', async () => {
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'player' } }, error: new Error('invalid') });
  expect(await fetchPlayerIdentity()).toEqual({ playerId: undefined, firstName: undefined });
});
