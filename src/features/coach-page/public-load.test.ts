import { beforeEach, expect, it, vi } from 'vitest';
import { loadPublicCoach } from './data/public-profile';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ rpc: mocks.rpc }) }));
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); mocks.rpc.mockReset(); });
const profile = { id: 'coach', full_name: 'Ali', avatar_path: null };
it('starts the profile, page and stats calls together and tolerates rejected optional RPCs', async () => {
  let finish: (value: unknown) => void = () => {};
  mocks.rpc.mockImplementation((name: string) => name === 'coach_public_profile'
    ? new Promise(resolve => { finish = resolve; }) : Promise.reject(new Error('offline')));
  const loading = loadPublicCoach('ali');
  await Promise.resolve();
  expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(['coach_public_profile', 'coach_public_page', 'coach_public_stats']);
  finish({ data: [profile], error: null });
  expect(await loading).toMatchObject({ page: null, stats: null });
});
it('keeps page facts when stats fail, and hides all slots when the page fails', async () => {
  const page = { specialties: ['Strength'], show_public_stats: true };
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'coach_public_profile' ? [profile] : name === 'coach_public_page' ? [page] : null, error: null }));
  expect(await loadPublicCoach('ali')).toMatchObject({ page, stats: null });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'coach_public_profile' ? [profile] : { players: 8 }, error: name === 'coach_public_page' ? {} : null }));
  expect(await loadPublicCoach('ali')).toMatchObject({ page: null, stats: null });
});
it('does not call either new RPC with the flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  mocks.rpc.mockResolvedValue({ data: [profile], error: null });
  await loadPublicCoach('ali');
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
});
