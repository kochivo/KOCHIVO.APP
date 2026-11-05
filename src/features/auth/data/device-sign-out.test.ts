import { afterEach, expect, it, vi } from 'vitest';
import { signOutDevice } from './device-sign-out';

afterEach(() => vi.useRealTimers());

it.each(['none', 'push', 'sync', 'cache', 'close'])('finishes sign-out in order despite %s failure', async failure => {
  const calls: string[] = [];
  const step = (name: string) => async () => { calls.push(name); if (failure === name) throw new Error(name); };
  await signOutDevice({ push: step('push'), sync: step('sync'), auth: step('auth'), cache: step('cache'), close: step('close') });
  expect(calls).toEqual(['push', 'sync', 'auth', 'cache', 'close']);
});

it('bounds a stuck push unsubscribe and continues logout', async () => {
  vi.useFakeTimers();
  const calls: string[] = [];
  const work = signOutDevice({ push: () => new Promise(() => {}), sync: async () => {},
    auth: async () => { calls.push('auth'); }, cache: async () => {}, close: async () => {} });
  await vi.advanceTimersByTimeAsync(2000);
  await work;
  expect(calls).toEqual(['auth']);
});
