import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNotifications } from './hooks/use-notifications';

const lifecycle = vi.hoisted(() => ({
  refs: [] as { current: unknown }[], index: 0,
  effects: [] as (() => (() => void) | undefined)[],
  updates: [] as unknown[],
  count: vi.fn(), latest: vi.fn(), mark: vi.fn(),
}));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useRef: (value: unknown) => {
    const index = lifecycle.index++;
    lifecycle.refs[index] ??= { current: value };
    return lifecycle.refs[index];
  },
  useCallback: (fn: unknown) => fn,
  useEffect: (effect: () => (() => void) | undefined) => { lifecycle.effects.push(effect); },
  useState: (value: unknown) => [value, (next: unknown) => lifecycle.updates.push(next)],
}));
vi.mock('./data/notifications', () => ({
  unreadCount: lifecycle.count, latestNotifications: lifecycle.latest, markRead: lifecycle.mark,
}));

const listeners = new Map<string, () => void>();
let tick: (() => void) | undefined;
let visibility: string;
const clear = vi.fn();
beforeEach(() => {
  lifecycle.refs = []; lifecycle.index = 0; lifecycle.effects = []; lifecycle.updates = [];
  vi.clearAllMocks();
  listeners.clear(); visibility = 'visible'; tick = undefined;
  lifecycle.count.mockResolvedValue(1);
  lifecycle.latest.mockResolvedValue([]);
  const events = {
    addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  vi.stubGlobal('document', { ...events, get visibilityState() { return visibility; } });
  vi.stubGlobal('window', { ...events, setInterval: (fn: () => void, ms: number) => {
    expect(ms).toBe(120_000); tick = fn; return 7;
  }, clearInterval: clear });
});
afterEach(() => vi.unstubAllGlobals());

const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

it('polls only while visible, refreshes on focus and cleans up', async () => {
  useNotifications(false);
  const cleanup = lifecycle.effects[0]?.();
  await settle();
  expect(lifecycle.count).toHaveBeenCalledTimes(1);
  expect(lifecycle.latest).not.toHaveBeenCalled();
  visibility = 'hidden'; tick?.(); listeners.get('focus')?.();
  expect(lifecycle.count).toHaveBeenCalledTimes(1);
  visibility = 'visible'; listeners.get('focus')?.(); tick?.();
  await settle();
  expect(lifecycle.count).toHaveBeenCalledTimes(3);
  cleanup?.();
  expect(clear).toHaveBeenCalledWith(7);
  expect(listeners.size).toBe(0);
});

it('a delayed daily refresh uses the current open state and still loads rows', async () => {
  const closed = useNotifications(false);
  const cleanup = lifecycle.effects[0]?.();
  await settle();
  cleanup?.();
  let resolveRows: ((rows: []) => void) | undefined;
  lifecycle.latest.mockReturnValue(new Promise<[]>(resolve => { resolveRows = resolve; }));
  lifecycle.index = 0; lifecycle.effects = [];
  useNotifications(true);
  lifecycle.effects[0]?.();
  const delayed = closed.refresh();
  expect(lifecycle.latest).toHaveBeenCalledTimes(2);
  resolveRows?.([]);
  await delayed;
  expect(lifecycle.updates).toContain('ready');
  expect(lifecycle.updates).toContain(true);
});
