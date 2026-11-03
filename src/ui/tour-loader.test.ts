import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { TourLoader } from './tour-loader';

const state = vi.hoisted(() => ({
  values: [false, false], cursor: 0, path: '/captain', renders: 0,
  effects: [] as (() => void | (() => void))[],
  options: {} as { ssr?: boolean },
  events: new Map<string, () => void>(),
  ready: true, notify: () => {},
}));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: () => {
    const index = state.cursor++;
    return [state.values[index], (value: boolean) => { state.values[index] = value; }];
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock('next/dynamic', () => ({ default: (_load: unknown, options: { ssr?: boolean }) => {
  state.options = options;
  return () => { state.renders++; return null; };
} }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));

let values: Map<string, string>;
beforeEach(() => {
  values = new Map(); state.values = [false, false]; state.path = '/captain'; state.renders = 0; state.events.clear();
  state.ready = true;
  vi.stubGlobal('document', { body: {}, querySelector: () => state.ready ? {} : null });
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { state.notify = callback; }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => { callback(); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } });
  vi.stubGlobal('window', { addEventListener: (name: string, callback: () => void) => state.events.set(name, callback), removeEventListener: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

function render(seenAt: string | null = null, demo = false) {
  state.cursor = 0; state.effects = [];
  const node = TourLoader({ userId: 'ali', role: 'captain', seenAt, demo, onSeen: async () => {} });
  const html = renderToStaticMarkup(createElement(() => node));
  for (const effect of state.effects) effect();
  return html;
}

it('renders no overlay until a due tour is mounted through next/dynamic with SSR disabled', () => {
  expect(render()).toBe('');
  expect(state.renders).toBe(0);
  expect(state.options.ssr).toBe(false);
  render();
  expect(state.renders).toBe(1);
});

it.each(['server', 'cache', 'demo', 'onboarding'])('does not mount tour code for %s suppression', reason => {
  if (reason === 'cache') values.set('kochivo:tour:ali', '2026-11-03T10:00:00Z');
  if (reason === 'onboarding') state.path = '/player/onboarding';
  const seen = reason === 'server' ? '2026-11-03T10:00:00Z' : null;
  render(seen, reason === 'demo'); render(seen, reason === 'demo');
  expect(state.renders).toBe(0);
  if (reason === 'server') expect(values.get('kochivo:tour:ali')).toBe(seen);
});

it('replays a completed demo tour only after an explicit Settings request and arrival home', () => {
  state.path = '/captain/settings';
  render('2026-11-03T10:00:00Z', true);
  state.events.get('kochivo:replay-tour')?.();
  render('2026-11-03T10:00:00Z', true);
  expect(state.renders).toBe(0);
  state.path = '/captain';
  render('2026-11-03T10:00:00Z', true); render('2026-11-03T10:00:00Z', true);
  expect(state.renders).toBe(1);
});

it('fails closed when localStorage is unavailable', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  render(); render();
  expect(state.renders).toBe(0);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

it('waits for async home data before mounting instead of skipping the workout', () => {
  state.ready = false;
  render(); render();
  expect(state.renders).toBe(0);
  state.ready = true;
  state.notify();
  render();
  expect(state.renders).toBe(1);
});
