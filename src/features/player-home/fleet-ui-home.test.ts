import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ProgramSnapshot } from '@/core/offline';
import type * as Offline from '@/core/offline';
import { HomeScreen } from './components/home-screen';

const state = vi.hoisted(() => ({ snapshot: null as ProgramSnapshot | null, status: 'ready' }));
vi.mock('./hooks/use-program-snapshot', () => ({ useProgramSnapshot: () => ({ ...state, retry() {} }) }));
vi.mock('./hooks/use-week-sessions', () => ({ useWeekSessions: () => [] }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-05T12:00:00Z'), online: true }) }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => [] }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('./components/next-task-slot', () => ({ NextTaskSlot: () => null }));
vi.mock('./components/nutrition-slot', () => ({ NutritionSlot: () => null }));
const render = (locale: 'ar' | 'en') => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(HomeScreen)));
it.each(['ar', 'en'] as const)('shows missing and empty program contact actions in %s', locale => {
  state.status = 'ready'; state.snapshot = null;
  expect(render(locale)).toContain('href="/player/captain"');
  state.snapshot = { id: 'active', player_id: 'player', program_id: 'program', title: 'Program', notes: null,
    settings: {}, training_days: [], days: [] };
  expect(render(locale)).toContain('href="/player/captain"');
  expect(render(locale)).not.toContain('/player/workout/');
});
it.each(['ar', 'en'] as const)('shows loading and retryable program errors in %s', locale => {
  state.snapshot = null; state.status = 'loading';
  expect(render(locale)).toContain('aria-busy="true"');
  state.status = 'error';
  const html = render(locale);
  expect(html).toContain('role="alert"');
  expect(html).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
});
