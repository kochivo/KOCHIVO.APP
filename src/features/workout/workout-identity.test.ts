import { expect, it, vi } from 'vitest';
import { fetchWorkoutIdentity } from './data/workout-identity';

const server = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: server }));

it('returns the session identity or allows a cached offline fallback', async () => {
  server.mockResolvedValue({ auth: { getClaims: async () => ({ data: { claims: { sub: 'player' } } }) } });
  expect(await fetchWorkoutIdentity()).toBe('player');
  server.mockRejectedValue(new Error('offline'));
  expect(await fetchWorkoutIdentity()).toBeUndefined();
});
