import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { LocaleProvider } from '@/core/i18n/client';
import { FocusScreen } from './components/focus-screen';
import type { SnapshotDay } from '@/core/offline';

const state = vi.hoisted(() => ({ day: null as SnapshotDay | null, loading: false, error: '',
  programFinished: false, finished: false, queue: [] as unknown[] }));
vi.mock('./hooks/use-focus-session', () => ({ useFocusSession: () => ({ ...state,
  doneSets: [], rest: { remaining: 0, endsAt: null }, pending: 0, progress: 0, retry() {} }) }));
vi.mock('./hooks/use-wake-lock', () => ({ useWakeLock() {} }));
vi.mock('./components/media-status', () => ({ MediaStatus: () => null }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-05T12:00:00Z'), online: true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
beforeEach(() => Object.assign(state, { day: null, loading: false, error: '', programFinished: false, finished: false, queue: [] }));
const render = (locale: 'ar' | 'en') => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(FocusScreen, { dayId: 'day' })));
it.each(['ar', 'en'] as const)('links missing and empty workouts to a useful destination in %s', locale => {
  expect(render(locale)).toContain('href="/player"');
  state.day = { id: 'day', title: 'Day', position: 1, exercises: [] };
  expect(render(locale)).toContain('href="/player/captain"');
});
it.each(['ar', 'en'] as const)('shows a finished workout and return-home action in %s', locale => {
  state.day = { id: 'day', title: 'Day', position: 1, exercises: [] };
  state.queue = [{}]; state.finished = true;
  const html = render(locale);
  expect(html).toContain('href="/player"');
  expect(html).toContain(locale === 'en' ? 'Workout complete' : 'خلصت التمرين');
  expect(html).not.toContain('href="/player/captain"');
});
it.each(['ar', 'en'] as const)('shows loading and read errors in %s', locale => {
  state.loading = true;
  expect(render(locale)).toContain('aria-busy="true"');
  state.loading = false; state.error = 'Read failed';
  const html = render(locale);
  expect(html).toContain('role="alert"');
  expect(html).toContain('Read failed');
  expect(html).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
});

it('uses the surrounding landmark and offers the cached picker action offline', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(FocusScreen, { dayId: 'day', onBack: () => {} })));
  expect(html).not.toContain('<main');
  expect(html).not.toContain('href="/player"');
  expect(html).toContain('role="heading" aria-level="2" tabindex="-1"');
  expect(html).toContain('aria-label="Back"');
  expect(html).toContain('Saved workouts');
});
