import { afterEach, expect, it, vi } from 'vitest';
import { currentPushState, subscribePush, unsubscribePush } from './push-subscriptions';

const state = vi.hoisted(() => ({ rows: [] as { id: string; endpoint: string }[], fail: false,
  foreign: [] as string[], count: 0,
  subscription: null as null | { endpoint: string; toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } }; unsubscribe: () => Promise<boolean> } }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ from: () => ({
  select: () => ({ eq: (_key: string, endpoint: string) => ({ maybeSingle: async () => ({
    data: state.rows.find(row => row.endpoint === endpoint) ?? null, error: null,
  }) }) }),
  insert: async (row: { id: string; endpoint: string }) => {
    if (state.fail) return { error: new Error('offline') };
    if (state.foreign.includes(row.endpoint)) return { error: { code: '23505' } };
    state.rows.push(row); return { error: null };
  },
  delete: () => ({ eq: async (_key: string, endpoint: string) => {
    if (state.fail) return { error: new Error('offline') };
    state.rows = state.rows.filter(row => row.endpoint !== endpoint); return { error: null };
  } }),
}) }) }));

function browser(permission: NotificationPermission = 'granted') {
  vi.stubGlobal('Notification', { permission, requestPermission: async () => permission });
  vi.stubGlobal('navigator', { userAgent: 'test', serviceWorker: { getRegistration: async () => ({ active: {} }), ready: Promise.resolve({ pushManager: {
    getSubscription: async () => state.subscription,
    subscribe: async () => {
      const endpoint = `https://push.example/device-${++state.count}`;
      state.subscription = { endpoint,
        toJSON: () => ({ endpoint: 'https://push.example/device', keys: { p256dh: 'key', auth: 'auth' } }),
        unsubscribe: async () => { state.subscription = null; return true; } };
      return state.subscription;
    },
  } }) } });
}
afterEach(() => { state.rows = []; state.foreign = []; state.count = 0; state.fail = false; state.subscription = null; vi.unstubAllGlobals(); });

it('subscribes once, reads the persisted state and deletes on disable', async () => {
  browser();
  expect(await currentPushState()).toBe(false);
  expect(await subscribePush('AAEC')).toBe('on');
  expect(await subscribePush('AAEC')).toBe('on');
  expect(state.rows).toHaveLength(1);
  expect(state.rows[0]?.id).toMatch(/^[0-9a-f-]{14}7/);
  expect(await currentPushState()).toBe(true);
  await unsubscribePush();
  expect(state.rows).toEqual([]);
  expect(state.subscription).toBeNull();
});
it('reports a missing active service worker instead of waiting indefinitely', async () => {
  vi.stubGlobal('navigator', { serviceWorker: {
    getRegistration: async () => undefined,
    ready: Promise.resolve({ pushManager: { getSubscription: async () => null } }),
  } });
  await expect(currentPushState()).rejects.toThrow('Service worker unavailable');
});
it('returns denied without creating subscriptions', async () => {
  browser('denied');
  expect(await subscribePush('AAEC')).toBe('denied');
  expect(state.rows).toEqual([]);
  expect(state.subscription).toBeNull();
});
it('rolls back a new browser subscription if persistence fails', async () => {
  browser(); state.fail = true;
  await expect(subscribePush('AAEC')).rejects.toThrow('offline');
  expect(state.subscription).toBeNull();
});
it('keeps delivery and state on if disabling cannot delete the row', async () => {
  browser(); await subscribePush('AAEC'); state.fail = true;
  await expect(unsubscribePush()).rejects.toThrow('offline');
  expect(await currentPushState()).toBe(true);
});
it('replaces an endpoint owned by a previous account instead of trapping the new account off', async () => {
  browser(); await subscribePush('AAEC');
  state.foreign = state.rows.map(row => row.endpoint);
  state.rows = [];
  expect(await currentPushState()).toBe(false);
  expect(await subscribePush('AAEC')).toBe('on');
  expect(state.rows).toHaveLength(1);
  expect(state.rows[0]?.endpoint).toBe('https://push.example/device-2');
  expect(await currentPushState()).toBe(true);
});
