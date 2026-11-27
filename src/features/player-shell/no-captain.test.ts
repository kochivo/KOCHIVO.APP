import { createContext, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { PlayerShell } from './components/player-shell';

const state = vi.hoisted(() => ({ path: '/player', status: 'ready' as 'ready' | 'loading' | 'error',
  data: null as { fullName: string; accessUntil: string; archivedAt: null; phone: null; subscriptionStartsOn?: string } | null }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('next/dynamic', async () => {
  const { NoCaptainScreen } = await import('./components/no-captain-screen');
  return { default: (loader: unknown) => String(loader).includes('NoCaptainScreen') ? NoCaptainScreen : () => null };
});
vi.mock('@/core/pwa/use-device-role', () => ({ useDeviceRole: () => {} }));
vi.mock('@/features/notifications', () => ({ NotificationBell: () => null }));
vi.mock('./hooks/use-online', () => ({ useOnline: () => true }));
vi.mock('./hooks/use-my-captain', () => ({ MyCaptainContext: createContext(null),
  useMyCaptain: () => ({ data: state.data, status: state.status, retry: vi.fn() }) }));
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  createElement(PlayerShell, { unassignedAction: createElement('button', null, 'Sign out') }, createElement('p', null, 'Private player content'))));
beforeEach(() => { state.path = '/player'; state.status = 'ready'; state.data = null; });

it.each(['/player', '/player/nutrition', '/player/workout/day', '/player/onboarding', '/player/progress'])(
  'does not treat a player with no coach as active at %s', path => {
    state.path = path;
    const html = render();
    expect(html).not.toContain('Private player content');
    expect(html).toContain('coach');
    expect(html).toContain('Sign out');
    expect(html).toContain('Try again');
    expect(html).not.toContain('href="/player/nutrition"');
  },
);
it.each(['loading', 'error'] as const)('does not expose player content before the coach lookup resolves: %s', status => {
  state.path = '/player/progress'; state.status = status;
  expect(render()).not.toContain('Private player content');
});
it.each(['loading', 'error', 'ready'] as const)('fits the launcher clearance inside the fallback frame: %s', status => {
  state.status = status;
  expect(render()).toMatch(/class="(?=[^"]*\bmin-h-dvh\b)[^"]*\bplayer-content\b[^"]*"/);
  state.path = '/player/workout/day';
  expect(render()).not.toContain('player-content');
});
it('keeps account settings accessible without a coach', () => {
  state.path = '/player/settings';
  expect(render()).toContain('Private player content');
});
it('keeps existing or cached coach content accessible', () => {
  state.data = { fullName: 'Coach', accessUntil: '2099-01-01', archivedAt: null, phone: null };
  expect(render()).toContain('Private player content');
});
// Like an ended subscription: a banner explains it, pages stay usable for reading and RLS rejects writes.
it('shows the scheduled start before it begins while leaving every page readable', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  try {
    state.data = { fullName: 'Coach', accessUntil: '2026-12-01', archivedAt: null, phone: null, subscriptionStartsOn: '2026-11-10' };
    expect(render()).toContain('Your subscription starts on');
    expect(render()).toContain('Private player content');
    expect(render()).not.toContain('<fieldset disabled=""');
    state.path = '/player/settings';
    expect(render()).toContain('Private player content');
  } finally { vi.useRealTimers(); }
});
