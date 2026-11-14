import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';
import { themeBootScript } from './theme-boot-script';

vi.mock('server-only', () => ({}));

it('boots dark before paint and restores the player theme through history navigation', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.resetModules();
  const { themeBootScript: workspaceBoot } = await import('./theme-boot-script');
  vi.unstubAllEnvs();
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  const location = { pathname: '/ar/captain/players' };
  const history = {
    pushState: (_: unknown, __: string, path: string) => { location.pathname = path; },
    replaceState: (_: unknown, __: string, path: string) => { location.pathname = path; },
  };
  runInNewContext(workspaceBoot, {
    document: { documentElement: root }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { getItem: () => 'light' }, window: { location, history, addEventListener() {} },
  });
  expect(root.dataset.theme).toBe('dark');
  expect(root.dataset.themeMode).toBe('light');
  history.pushState(null, '', '/ar/player');
  expect(root.dataset.theme).toBe('light');
  history.replaceState(null, '', '/en/captain/settings');
  expect(root.dataset.theme).toBe('dark');
  expect(root.style.colorScheme).toBe('dark');
});

it('restores stored light after a locale refresh replaces document attributes, and on reload', () => {
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' }, lang: 'ar' };
  let refresh = () => {};
  const context = {
    document: { documentElement: root },
    matchMedia: () => ({ matches: true, addEventListener: () => {} }),
    localStorage: { getItem: () => 'light' },
    window: { addEventListener: () => {}, dispatchEvent: () => {} }, Event,
    MutationObserver: class {
      constructor(callback: () => void) { refresh = callback; }
      observe() {}
    },
  };
  runInNewContext(themeBootScript, context);
  for (const lang of ['en', 'ar']) {
    root.lang = lang;
    root.dataset = {};
    root.style.colorScheme = '';
    refresh();
    expect(root.dataset.theme).toBe('light');
    expect(root.dataset.themeMode).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  }
  root.dataset = {};
  runInNewContext(themeBootScript, context);
  expect(root.dataset.theme).toBe('light');
});


it.each(['light', 'dark'])('keeps stored %s through device changes', stored => {
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  let change = () => {};
  const media = { matches: false, addEventListener: (_: string, listener: () => void) => { change = listener; } };
  runInNewContext(themeBootScript, {
    document: { documentElement: root }, matchMedia: () => media,
    localStorage: { getItem: () => stored }, window: { addEventListener: () => {} },
  });
  expect(root.dataset.theme).toBe(stored);
  media.matches = true;
  change();
  expect(root.dataset.theme).toBe(stored);
  expect(root.style.colorScheme).toBe(stored);
});

it.each([false, true])('boots and follows device changes when storage blocked=%s', blocked => {
  const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
  const listeners: Record<string, () => void> = {};
  const media = { matches: false, addEventListener: (_: string, listener: () => void) => { listeners.media = listener; } };
  runInNewContext(themeBootScript, {
    document: { documentElement: root }, matchMedia: () => media,
    localStorage: { getItem: () => { if (blocked) throw new Error('blocked'); return 'system'; } },
    window: { addEventListener: (name: string, listener: () => void) => { listeners[name] = listener; } },
  });
  expect(root.dataset.theme).toBe('light');
  expect(root.style.colorScheme).toBe('light');
  media.matches = true;
  expect(listeners.media).toBeTypeOf('function');
  listeners.media?.();
  expect(root.dataset.theme).toBe('dark');
  expect(root.style.colorScheme).toBe('dark');
});
