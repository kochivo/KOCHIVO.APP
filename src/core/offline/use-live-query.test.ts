import type * as React from 'react';
import Dexie, * as dexie from 'dexie';
import type { Observer } from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLiveQuery } from './use-live-query';

vi.mock('dexie', { spy: true });

// Match the existing node-only hook tests without adding a DOM dependency.
const hooks = vi.hoisted(() => ({
  initialized: false,
  state: undefined as unknown,
  effect: undefined as undefined | (() => () => void),
}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    if (!hooks.initialized) { hooks.state = initial; hooks.initialized = true; }
    return [hooks.state, (value: unknown) => { hooks.state = value; }];
  },
  useEffect: (effect: () => () => void) => { hooks.effect = effect; },
}));

let db: Dexie;
let cleanup: (() => void) | undefined;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  hooks.initialized = false;
  hooks.state = undefined;
  db = new Dexie('live-query-reset');
  db.version(1).stores({ rows: 'id' });
  await db.table('rows').bulkPut([{ id: 'alice', value: 'Alice rows' }, { id: 'bob', value: 'Bob rows' }]);
});

afterEach(async () => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  await db.delete();
  vi.useRealTimers();
});

function subscribe() {
  cleanup?.();
  cleanup = hooks.effect?.();
}

function queryFor(id: string) {
  return async () => (await db.table<{ id: string; value: string }>('rows').get(id))?.value;
}

async function emit() {
  await vi.runAllTimersAsync();
}

it('returns undefined on the first render of a different query until it emits', async () => {
  const alice = queryFor('alice');
  const bob = queryFor('bob');
  expect(useLiveQuery(alice)).toBeUndefined();
  subscribe();
  await emit();
  expect(useLiveQuery(alice)).toBe('Alice rows');
  expect(useLiveQuery(bob)).toBeUndefined();
  subscribe();
  expect(useLiveQuery(bob)).toBeUndefined();
  await emit();
  expect(useLiveQuery(bob)).toBe('Bob rows');
});

it('never exposes a late emission from the previous subscription', async () => {
  const { liveQuery: original } = await vi.importActual<typeof dexie>('dexie');
  const observers: Observer<string | undefined>[] = [];
  vi.spyOn(dexie, 'liveQuery').mockImplementation(((query: () => Promise<string | undefined>) => {
    const observable = original(query);
    const subscribe = observable.subscribe.bind(observable);
    observable.subscribe = ((observer: Observer<string | undefined>) => {
      observers.push(observer);
      return subscribe(observer);
    }) as typeof observable.subscribe;
    return observable;
  }) as typeof dexie.liveQuery);
  const alice = queryFor('alice');
  const bob = queryFor('bob');
  useLiveQuery(alice);
  subscribe();
  await emit();
  expect(useLiveQuery(alice)).toBe('Alice rows');
  expect(useLiveQuery(bob)).toBeUndefined();
  subscribe();
  // Deliver directly to the old observer to cover even an already queued callback.
  observers[0]?.next?.('Late Alice rows');
  expect(useLiveQuery(bob)).toBeUndefined();
  await emit();
  expect(useLiveQuery(bob)).toBe('Bob rows');
  observers[0]?.next?.('Later Alice rows');
  expect(useLiveQuery(bob)).toBeUndefined();
});

it('keeps the last value while retryKey resubscribes the same query', async () => {
  const query = queryFor('alice');
  useLiveQuery(query, undefined, 0);
  subscribe();
  await emit();
  expect(useLiveQuery(query, undefined, 1)).toBe('Alice rows');
  subscribe();
  expect(useLiveQuery(query, undefined, 1)).toBe('Alice rows');
  await emit();
  expect(useLiveQuery(query, undefined, 1)).toBe('Alice rows');
});

it('unsubscribes on unmount so later database writes do not update state', async () => {
  const query = queryFor('alice');
  useLiveQuery(query);
  subscribe();
  await emit();
  expect(useLiveQuery(query)).toBe('Alice rows');
  cleanup?.();
  cleanup = undefined;
  await db.table('rows').put({ id: 'alice', value: 'Changed after unmount' });
  await emit();
  expect(useLiveQuery(query)).toBe('Alice rows');
});
