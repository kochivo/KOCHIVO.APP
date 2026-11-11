import { describe, expect, it, vi } from 'vitest';
import { createResourceStore, clearResources, resourceStore } from './store';

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function setup() {
  let time = 0;
  const events = new EventTarget();
  const doc = Object.assign(events, { hidden: false, defaultView: events });
  const timers = new Map<() => void, number>();
  const store = createResourceStore({ now: () => time, doc,
    setTimeout: (callback, ms) => { timers.set(callback, time + ms); return () => { timers.delete(callback); }; } });
  const advance = async (ms: number) => {
    time += ms;
    for (const [callback, due] of [...timers]) if (due <= time) { timers.delete(callback); callback(); }
    await flush();
  };
  const watch = (load: (signal: AbortSignal) => Promise<number>, key = 'a', pollMs?: number) =>
    store.subscribe(key, load, { staleMs: 15_000, pollMs }, () => {});
  return { store, doc, watch, advance, timers };
}

describe('resource store', () => {
  it.each([false, true])('forces a fresh request and drops the old response while hidden=%s', async hidden => {
    const { store, doc, watch } = setup();
    const first = deferred<number>(), second = deferred<number>();
    let signal: AbortSignal | undefined;
    watch(value => { signal = value; return first.promise; });
    doc.hidden = hidden;
    const load = vi.fn(() => second.promise);
    const fresh = store.retry('a', load, { force: true });
    expect(signal?.aborted).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
    second.resolve(2); await fresh;
    first.resolve(1); await flush();
    expect(store.read<number>('a')).toMatchObject({ data: 2, status: 'ready' });
  });
  it('returns the identical in-flight promise for non-forced retries', async () => {
    const { store } = setup();
    const pending = deferred<number>();
    const load = vi.fn(() => pending.promise);
    const first = store.retry('a', load);
    expect(store.retry('a', load)).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
    pending.resolve(1); await first;
  });
  it('retries a loader that throws before returning a promise', async () => {
    const { watch, store } = setup();
    watch(() => { throw new Error('unavailable'); }); await flush();
    expect(store.read('a').status).toBe('error');
    await store.retry('a', async () => 4);
    expect(store.read<number>('a').data).toBe(4);
  });
  it('shares one flight and aborts only on the last unsubscribe', () => {
    const { watch } = setup();
    const pending = deferred<number>();
    let signal: AbortSignal | undefined;
    const load = vi.fn((value: AbortSignal) => { signal = value; return pending.promise; });
    const first = watch(load), second = watch(load);
    expect(load).toHaveBeenCalledTimes(1);
    first(); expect(signal?.aborted).toBe(false);
    second(); expect(signal?.aborted).toBe(true);
  });
  it('drops an aborted late response after a newer request wins', async () => {
    const { watch, store } = setup();
    const old = deferred<number>();
    watch(() => old.promise)();
    watch(async () => 2);
    await flush(); old.resolve(1); await flush();
    expect(store.read<number>('a').data).toBe(2);
  });
  it('does not fetch or poll hidden, and coalesces focus plus visibility even for fast loads', async () => {
    const { doc, watch, advance } = setup();
    doc.hidden = true;
    const load = vi.fn(async () => 1);
    watch(load, 'a', 100);
    await advance(1000); expect(load).not.toHaveBeenCalled();
    doc.hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    doc.dispatchEvent(new Event('focus'));
    await advance(0); expect(load).toHaveBeenCalledTimes(1);
    await advance(100); expect(load).toHaveBeenCalledTimes(2);
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    await advance(1000); expect(load).toHaveBeenCalledTimes(2);
  });
  it('returns cached data immediately and revalidates a stale resubscription', async () => {
    const { watch, store, advance } = setup();
    const load = vi.fn(async () => 1);
    const stop = watch(load); await flush(); stop();
    const fresh = watch(load); expect(load).toHaveBeenCalledTimes(1); fresh();
    await advance(15_001);
    const next = deferred<number>(); watch(() => next.promise);
    expect(store.read<number>('a')).toMatchObject({ data: 1, status: 'ready' });
    next.resolve(2); await flush(); expect(store.read<number>('a').data).toBe(2);
  });
  it('rolls back failed optimistic commits and ignores superseded loads', async () => {
    const { watch, store } = setup();
    watch(async () => 1); await flush();
    const load = deferred<number>();
    void store.retry('a', () => load.promise);
    const commit = deferred<void>();
    const result = store.mutate<number>('a', value => (value ?? 0) + 1, () => commit.promise);
    expect(store.read<number>('a').data).toBe(2);
    load.resolve(9); await flush(); expect(store.read<number>('a').data).toBe(2);
    const error = new Error('failed'); commit.reject(error);
    expect(await result).toBe(false);
    expect(store.read<number>('a')).toMatchObject({ data: 1, error, status: 'error' });
    expect(await store.mutate('a', () => 3, async () => {})).toBe(true);
  });
  it('clears every key and drops pending requests and commits', async () => {
    const { watch, store, timers } = setup();
    const pending = deferred<number>();
    watch(() => pending.promise, 'a', 100); watch(async () => 2, 'b'); await flush();
    const commit = deferred<void>();
    const result = store.mutate('b', () => 3, () => commit.promise);
    store.clear(); pending.resolve(1); commit.reject(new Error('late')); await result; await flush();
    expect(store.read('a').status).toBe('idle'); expect(store.read('b').data).toBeUndefined();
    expect(timers.size).toBe(0);
    await resourceStore.mutate('one', () => 1, async () => {});
    await resourceStore.mutate('two', () => 2, async () => {});
    clearResources();
    expect(resourceStore.read('one').data).toBeUndefined();
    expect(resourceStore.read('two').data).toBeUndefined();
    expect(resourceStore.read(null).status).toBe('idle');
  });
});
