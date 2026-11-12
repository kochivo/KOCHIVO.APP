import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), single: vi.fn(), auth: vi.fn() }));
vi.mock('@/core/i18n/server', async () => {
  const { createT } = await import('@/core/i18n/messages');
  return { getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') };
});
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({ auth: { getUser: state.auth }, from: () => ({ update: state.update }) }) }));
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.auth.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  const query = { eq: state.eq, select: () => query, single: state.single };
  state.update.mockReturnValue(query); state.eq.mockReturnValue(query);
  state.single.mockResolvedValue({ data: { id: 'owner', units: 'imperial' }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it('updates only the authenticated captain and only the changed preferences', async () => {
  const { saveCaptainPreferences } = await import('./data/preferences');
  const result = await saveCaptainPreferences({ units: 'imperial' });
  expect(state.update).toHaveBeenCalledWith({ units: 'imperial' });
  expect(state.eq.mock.calls).toEqual([['id', 'owner'], ['role', 'captain']]);
  expect(result.data?.units).toBe('imperial');
});
it.each([{ timezone: 'bad-zone' }, { role: 'admin' }, { units: 'bad-units' }])('rejects invalid or unrelated fields %s', async input => {
  const { saveCaptainPreferences } = await import('./data/preferences');
  expect((await saveCaptainPreferences(input)).error).toBeDefined();
  expect(state.update).not.toHaveBeenCalled();
});
it('refuses writes with the workspace flag off', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const { saveCaptainPreferences } = await import('./data/preferences');
  expect((await saveCaptainPreferences({ units: 'imperial' })).error).toBeDefined();
  expect(state.update).not.toHaveBeenCalled();
});
it('returns a real failure for rollback without pretending the mutation saved', async () => {
  state.single.mockResolvedValue({ data: null, error: { message: 'denied' } });
  const { saveCaptainPreferences } = await import('./data/preferences');
  expect(await saveCaptainPreferences({ units: 'imperial' })).toEqual({ error: "Couldn't save changes. Try again" });
});
