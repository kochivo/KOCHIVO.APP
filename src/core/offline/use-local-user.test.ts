import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { localDb, setLocalUser } from './db';
import { useLocalUser } from './use-local-user';
import { LOCAL_USER_KEY } from './remembered-user';

const state = vi.hoisted(() => ({ value: 'loading', effect: undefined as undefined | (() => () => void),
  onBound: undefined as undefined | (() => void),
  calls: 0,
  error: null as Error | null,
  user: 'alice' as string | null, listener: undefined as undefined | ((event: string, session: { user: { id: string } } | null) => void) }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [state.value, (value: string) => { state.value = value; if (value === 'ready') state.onBound?.(); }],
  useEffect: (effect: () => () => void) => { state.effect = effect; },
}));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ auth: {
  getSession: async () => {
    state.calls++;
    return { data: { session: state.user ? { user: { id: state.user } } : null }, error: state.error };
  },
  onAuthStateChange: (listener: typeof state.listener) => {
    state.listener = listener;
    return { data: { subscription: { unsubscribe() { state.listener = undefined; } } } };
  },
} }) }));
vi.mock('@/core/supabase/offline-user', () => ({ readOfflineUser: async () => state.user }));

beforeEach(() => {
  vi.stubGlobal('window', { location: { reload() {} } });
});

afterEach(async () => {
  await setLocalUser(null); await Dexie.delete('kochivo-alice');
  state.value = 'loading'; state.user = 'alice'; state.listener = undefined;
  state.onBound = undefined; state.calls = 0; state.error = null; vi.unstubAllGlobals();
});

async function settle() { for (let i = 0; i < 40; i++) await Promise.resolve(); }

it('binds offline reads to the restored session and revokes them on an account change', async () => {
  const reload = vi.fn();
  vi.stubGlobal('window', { location: { reload } });
  expect(useLocalUser()).toBe('loading');
  let cleanup: (() => void) | undefined;
  await new Promise<void>(resolve => { state.onBound = resolve; cleanup = state.effect?.(); });
  expect(state.value).toBe('ready');
  expect(localDb().name).toBe('kochivo-alice');
  state.listener?.('SIGNED_IN', { user: { id: 'bob' } });
  expect(() => localDb()).toThrow();
  expect(state.value).toBe('loading');
  expect(reload).toHaveBeenCalledOnce();
  cleanup?.();
});

it('never exposes a database when the cached session is logged out', async () => {
  state.user = null;
  useLocalUser();
  const cleanup = state.effect?.();
  await settle();
  expect(state.value).toBe('error');
  expect(() => localDb()).toThrow();
  cleanup?.();
});

it('opens the last authenticated user offline without refreshing an expired access token', async () => {
  await setLocalUser('alice');
  vi.stubGlobal('navigator', { onLine: false });
  let storageListener: ((event: StorageEvent) => void) | undefined;
  const reload = vi.fn();
  vi.stubGlobal('window', { location: { reload }, localStorage: { getItem: () => 'alice' },
    addEventListener: (event: string, callback: (event: StorageEvent) => void) => {
      if (event === 'storage') storageListener = callback;
    }, removeEventListener() {},
  });
  useLocalUser();
  const cleanup = state.effect?.();
  await settle();
  expect(state.value).toBe('ready');
  expect(localDb().name).toBe('kochivo-alice');
  expect(state.calls).toBe(0);
  storageListener?.({ key: LOCAL_USER_KEY, newValue: null } as StorageEvent);
  expect(() => localDb()).toThrow();
  expect(reload).toHaveBeenCalledOnce();
  cleanup?.();
});

it('rejects a stale remembered owner after another account signed in through server cookies', async () => {
  state.user = 'bob';
  vi.stubGlobal('navigator', { onLine: false });
  vi.stubGlobal('window', { localStorage: { getItem: () => 'alice' }, location: { reload() {} } });
  useLocalUser();
  const cleanup = state.effect?.();
  await settle();
  expect(state.value).toBe('error');
  expect(() => localDb()).toThrow();
  cleanup?.();
});

it('watches revocation even when reconnect validation fails', async () => {
  await setLocalUser('alice');
  vi.stubGlobal('navigator', { onLine: false });
  let reconnect: (() => void) | undefined;
  const reload = vi.fn();
  vi.stubGlobal('window', { location: { reload }, localStorage: { getItem: () => 'alice', removeItem() {} },
    addEventListener: (event: string, callback: () => void) => { if (event === 'online') reconnect = callback; },
    removeEventListener() {},
  });
  useLocalUser();
  const cleanup = state.effect?.();
  await settle();
  expect(state.value).toBe('ready');
  state.error = new Error('network');
  reconnect?.();
  await settle();
  expect(state.value).toBe('ready');
  state.listener?.('SIGNED_OUT', null);
  expect(() => localDb()).toThrow();
  expect(reload).toHaveBeenCalledOnce();
  cleanup?.();
});
