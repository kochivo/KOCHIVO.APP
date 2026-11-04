import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { refreshInactiveAlerts } from './data/refresh-inactive';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), getUser: vi.fn(), single: vi.fn(), stored: new Map<string, string>(),
}));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  auth: { getUser: mocks.getUser }, rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
}) }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.stored.clear();
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'captain' } }, error: null });
  mocks.single.mockResolvedValue({ data: { timezone: 'Africa/Cairo' }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => mocks.stored.get(key) ?? null,
    setItem: (key: string, value: string) => mocks.stored.set(key, value),
  } });
});
afterEach(() => vi.unstubAllGlobals());

it('refreshes once per captain local day, including after a page reload', async () => {
  mocks.stored.set('kochivo-inactive:captain', '2026-11-03');
  await refreshInactiveAlerts(new Date('2026-11-03T10:00:00Z'));
  expect(mocks.rpc).not.toHaveBeenCalled();
  await refreshInactiveAlerts(new Date('2026-11-03T23:00:00Z'));
  await refreshInactiveAlerts(new Date('2026-11-04T10:00:00Z'));
  expect(mocks.rpc).toHaveBeenCalledTimes(1);
  expect(mocks.rpc).toHaveBeenCalledWith('refresh_inactive_alerts');
  expect(mocks.stored.get('kochivo-inactive:captain')).toBe('2026-11-04');
});
it('fails silently and retries on the next open instead of caching failure', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'retry-captain' } }, error: null });
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  mocks.rpc.mockResolvedValueOnce({ error: { message: 'offline' } });
  await refreshInactiveAlerts(new Date('2026-11-03T10:00:00Z'));
  expect(mocks.stored.has('kochivo-inactive:retry-captain')).toBe(false);
  await refreshInactiveAlerts(new Date('2026-11-03T10:00:00Z'));
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});
