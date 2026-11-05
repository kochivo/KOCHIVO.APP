import { afterEach, expect, it, vi } from 'vitest';
import { unsubscribeDevicePush } from './logout-push';

const state = vi.hoisted(() => ({ deleted: [] as string[], fail: false }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ from: () => ({
  delete: () => ({ eq: (_key: string, endpoint: string) => ({ abortSignal: async () => {
    if (state.fail) throw new Error('offline');
    state.deleted.push(endpoint);
  } }) }),
}) }) }));
afterEach(() => { state.deleted = []; state.fail = false; vi.unstubAllGlobals(); });

it.each([false, true])('releases the browser endpoint even if the server delete fails: %s', async fail => {
  state.fail = fail;
  let released = false;
  vi.stubGlobal('navigator', { serviceWorker: { getRegistration: async () => ({ pushManager: {
    getSubscription: async () => ({ endpoint: 'https://fcm.googleapis.com/device',
      unsubscribe: async () => { released = true; return true; } }),
  } }) } });
  await unsubscribeDevicePush(new AbortController().signal).catch(() => {});
  expect(released).toBe(true);
  expect(state.deleted).toEqual(fail ? [] : ['https://fcm.googleapis.com/device']);
});

it('does no late cleanup after logout timed out', async () => {
  const controller = new AbortController();
  let released = false;
  vi.stubGlobal('navigator', { serviceWorker: { getRegistration: async () => {
    controller.abort();
    return { pushManager: { getSubscription: async () => ({ endpoint: 'https://fcm.googleapis.com/new-user',
      unsubscribe: async () => { released = true; return true; } }) } };
  } } });
  await unsubscribeDevicePush(controller.signal);
  expect(released).toBe(false);
  expect(state.deleted).toEqual([]);
});
