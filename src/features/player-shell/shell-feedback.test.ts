import { createContext, createElement } from 'react';
import type * as ReactModule from 'react';
import type nextDynamic from 'next/dynamic';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlayerShell } from '@/features/player-shell';

const state = vi.hoisted(() => ({ path: '/player', rest: false, moodMounts: 0,
  report: undefined as ((rest: boolean) => void) | undefined, effects: [] as (() => void)[], loaded: [] as string[] }));
vi.mock('@/features/player-home', () => { state.loaded.push('mood'); return { RestMoodSync: () => null }; });
vi.mock('next/dynamic', async original => {
  const { default: dynamic } = await original<{ default: typeof nextDynamic }>();
  return { default: (loader: Parameters<typeof dynamic>[0], options: Parameters<typeof dynamic>[1]) => {
    if (String(loader).includes('RestMoodSync')) return ({ onChange }: { onChange: (rest: boolean) => void }) => {
      state.moodMounts++; state.report = onChange; return null;
    };
    return dynamic(loader, options);
  } };
});
vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof ReactModule>(),
  useEffect: (effect: () => void) => { state.effects.push(effect); },
  useState: () => [state.rest, (rest: boolean) => { state.rest = rest; }],
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/features/notifications', () => ({ NotificationBell: () => null }));
vi.mock('@/features/install', () => { state.loaded.push('install'); return { InstallSheet: () => null }; });
vi.mock('@/features/feedback', () => { state.loaded.push('feedback'); return { FeedbackButton: () => null }; });
vi.mock('./hooks/use-my-captain', () => ({
  MyCaptainContext: createContext(null), useMyCaptain: () => ({ data: null }),
}));
vi.mock('./hooks/use-online', () => ({ useOnline: () => true }));

beforeEach(() => { state.effects = []; state.path = '/player'; state.rest = false; state.moodMounts = 0; state.report = undefined; });
afterEach(() => vi.unstubAllGlobals());
it('remembers player on mount without loading add-ons for the server render', () => {
  const setItem = vi.fn();
  vi.stubGlobal('window', { localStorage: { setItem } });
  const html = renderToStaticMarkup(createElement(PlayerShell, null, null));
  expect(setItem).not.toHaveBeenCalled();
  state.effects.forEach(effect => effect());
  expect(setItem).toHaveBeenCalledWith('kochivo.role', 'player');
  expect(html).not.toContain('aria-label="بلّغ عن مشكلة"');
  expect(state.loaded).toEqual([]);
});
it.each(['/player/workout/day', '/player/onboarding'])('hides feedback and installation on %s', path => {
  state.path = path;
  const html = renderToStaticMarkup(createElement(PlayerShell, null, null));
  expect(html).not.toContain('aria-label="بلّغ عن مشكلة"');
  expect(state.loaded).toEqual([]);
});

it('themes the whole shell on rest days and excludes workout focus', () => {
  expect(renderToStaticMarkup(createElement(PlayerShell, null, null))).not.toContain('data-mood="rest"');
  expect(state.report).toBeTypeOf('function');
  state.report?.(true);
  const rest = renderToStaticMarkup(createElement(PlayerShell, null, null));
  expect(rest).toContain('data-mood="rest"');
  expect(rest).toContain('min-h-dvh bg-bg');
  const mounts = state.moodMounts;
  state.path = '/player/workout/day';
  expect(renderToStaticMarkup(createElement(PlayerShell, null, null))).not.toContain('data-mood="rest"');
  expect(state.moodMounts).toBe(mounts);
});
