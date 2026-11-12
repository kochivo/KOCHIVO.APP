import { afterEach, expect, it, vi } from 'vitest';
import { savePlayerUnits } from './data/player-units';

const state = vi.hoisted(() => ({ getUser: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getUser: state.getUser }, from: () => ({ update: state.update }),
}) }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
it('writes validated units only to the authenticated player profile', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.getUser.mockResolvedValue({ data: { user: { id: 'self' } }, error: null });
  state.update.mockReturnValue({ eq: state.eq });
  state.eq.mockReturnValue({ eq: state.eq, select: () => ({ single: state.single }) });
  state.single.mockResolvedValue({ data: { units: 'imperial' }, error: null });
  await expect(savePlayerUnits('imperial')).resolves.toBeUndefined();
  expect(state.update).toHaveBeenCalledWith({ units: 'imperial' });
  expect(state.eq.mock.calls).toEqual([['id', 'self'], ['role', 'player']]);
});
it('rejects invalid units and flag-off requests before touching Supabase', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  await expect(savePlayerUnits('other')).rejects.toThrow();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(savePlayerUnits('metric')).rejects.toThrow();
  expect(state.getUser).not.toHaveBeenCalled();
});
