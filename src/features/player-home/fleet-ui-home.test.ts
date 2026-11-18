import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ProgramSnapshot } from '@/core/offline';
import type * as Offline from '@/core/offline';
import type * as ButtonModule from '@/ui/button';
import { HomeScreen } from './components/home-screen';

const state = vi.hoisted(() => ({ snapshot: null as ProgramSnapshot | null, status: 'ready' }));
const retry = vi.hoisted(() => vi.fn());
let retryClick: (() => void) | undefined;
vi.mock('./hooks/use-program-snapshot', () => ({ useProgramSnapshot: () => ({ ...state, retry }) }));
vi.mock('@/ui/button', async original => {
  const ui = await original<typeof ButtonModule>();
  return { ...ui, Button: (props: Parameters<typeof ui.Button>[0]) => {
    if (props.children === 'Try again') retryClick = props.onClick ? () => props.onClick?.(
      // The program retry does not read the click event.
      {} as Parameters<NonNullable<typeof props.onClick>>[0]) : undefined;
    return createElement(ui.Button, props);
  } };
});
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

it('offers program retry alongside cached data when refresh fails', () => {
  state.snapshot = { id: 'active', player_id: 'player', program_id: 'program', title: 'Program',
    notes: null, settings: {}, training_days: [], days: [] };
  state.status = 'error';
  const html = render('en');
  expect(html).toContain('Try again');
  expect(html).toContain('href="/player/captain"');
  expect(html).not.toContain('role="alert"');
  expect(retryClick).toBeTypeOf('function');
  retryClick?.();
  expect(retry).toHaveBeenCalledOnce();
});
