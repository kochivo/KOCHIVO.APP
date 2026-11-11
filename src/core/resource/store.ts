export type ResourceState<T> = { data: T | undefined; error: unknown; status: 'idle' | 'loading' | 'ready' | 'error' };
export type ResourceOptions = { pollMs?: number; staleMs?: number };
type Load = (signal: AbortSignal) => Promise<unknown>;
type Source = Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> & { defaultView?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null };
type Environment = { now?: () => number; doc?: Source; setTimeout?: (callback: () => void, ms: number) => () => void };
const initial: ResourceState<never> = { data: undefined, error: undefined, status: 'idle' };
type Entry = { state: ResourceState<unknown>; at: number; version: number; listeners: Set<() => void>;
  controller?: AbortController; request?: Promise<void>; stop?: () => void };

export function createResourceStore({ now = Date.now, doc, setTimeout: schedule = (fn, ms) => {
  const timer = globalThis.setTimeout(fn, ms); return () => globalThis.clearTimeout(timer);
} }: Environment = {}) {
  const entries = new Map<string, Entry>();
  const entry = (key: string) => {
    let value = entries.get(key);
    if (!value) { value = { state: initial, at: -Infinity, version: 0, listeners: new Set() }; entries.set(key, value); }
    return value;
  };
  const source = () => doc ?? (typeof document === 'undefined' ? undefined : document);
  const publish = (e: Entry, state: ResourceState<unknown>) => { e.state = state; e.listeners.forEach(fn => fn()); };
  const cancel = (e: Entry) => { e.version++; e.controller?.abort(); e.request = undefined; };
  const retry = (key: string, load: Load, { force = false }: { force?: boolean } = {}) => {
    const e = entry(key);
    if (force) cancel(e);
    else if (source()?.hidden) return Promise.resolve();
    if (e.request) return e.request;
    const controller = new AbortController(), version = ++e.version;
    e.controller = controller;
    publish(e, { ...e.state, error: undefined, status: e.state.data === undefined ? 'loading' : 'ready' });
    e.request = (async () => {
      try {
        const data = await load(controller.signal);
        if (version === e.version) { e.at = now(); publish(e, { data, error: undefined, status: 'ready' }); }
      } catch (error) {
        if (version === e.version) publish(e, { ...e.state, error, status: 'error' });
      }
    })().finally(() => { if (version === e.version) e.request = undefined; });
    return e.request;
  };
  const subscribe = (key: string, load: Load, { staleMs = 15_000, pollMs }: ResourceOptions, listener: () => void) => {
    const e = entry(key);
    e.listeners.add(listener);
    if (e.listeners.size === 1) {
      const target = source();
      let poll: (() => void) | undefined, returning: (() => void) | undefined;
      const tick = () => {
        poll?.(); poll = undefined;
        if (pollMs && !target?.hidden) poll = schedule(() => { void retry(key, load); tick(); }, pollMs);
      };
      const update = () => {
        if (target?.hidden) { poll?.(); poll = undefined; returning?.(); returning = undefined; return; }
        if (!returning) returning = schedule(() => { returning = undefined; void retry(key, load); tick(); }, 0);
      };
      target?.addEventListener('visibilitychange', update);
      target?.defaultView?.addEventListener('focus', update);
      e.stop = () => {
        poll?.(); returning?.();
        target?.removeEventListener('visibilitychange', update);
        target?.defaultView?.removeEventListener('focus', update);
      };
      tick();
    }
    if (now() - e.at >= staleMs) void retry(key, load);
    return () => {
      e.listeners.delete(listener);
      if (!e.listeners.size) { e.stop?.(); cancel(e); }
    };
  };
  return {
    read: <T>(key: string | null): ResourceState<T> => (key === null ? initial : entry(key).state) as ResourceState<T>,
    subscribe, retry,
    async mutate<T>(key: string, next: (current: T | undefined) => T, commit: () => Promise<unknown>) {
      const e = entry(key), previous = e.state;
      const data = next(previous.data as T | undefined);
      cancel(e);
      const version = e.version;
      publish(e, { data, error: undefined, status: 'ready' });
      try { await commit(); return true; }
      catch (error) {
        if (version === e.version) publish(e, { ...previous, error, status: 'error' });
        return false;
      }
    },
    clear() {
      const previous = [...entries.values()];
      previous.forEach(e => { e.stop?.(); cancel(e); });
      entries.clear();
      previous.forEach(e => publish(e, initial));
    },
  };
}
export const resourceStore = createResourceStore();
export const clearResources = () => resourceStore.clear();
