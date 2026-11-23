import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { ProgramSnapshot } from '@/core/offline';
import type * as Offline from '@/core/offline';
import type * as Readiness from './index';
import { HomeScreen } from '@/features/player-home';
import { DailyPanel } from './components/daily-panel';

const state = vi.hoisted(() => ({ rest: true, decision: null as string | null }));
const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'p', title: 'Plan', notes: null,
  settings: {}, training_days: [1, 3], days: [{ id: 'day', title: 'Workout', position: 1, exercises: [] }] };

vi.mock('next/dynamic', async () => {
  const [{ RestHero }, { MorningQuestions }, { WaterGlass }] = await Promise.all([
    import('./components/rest-hero'), import('./components/morning-questions'), import('./components/water-glass'),
  ]);
  return { default: (loader: () => unknown) => {
    const source = loader.toString();
    if (source.includes('PlayerReadiness')) return function Readiness(props: Parameters<typeof DailyPanel>[0]) {
      return createElement(DailyPanel, props);
    };
    return source.includes('rest-hero') ? RestHero : source.includes('morning-questions') ? MorningQuestions :
      source.includes('water-glass') ? WaterGlass : () => null;
  } };
});
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => [initial === null ? state.decision : typeof initial === 'function' ? initial() : initial, () => {}],
}));
vi.mock('@/features/readiness', async original => ({
  ...await original<typeof Readiness>(),
  PlayerReadiness: (await import('./components/daily-panel')).DailyPanel,
  useTodayDecision: () => state.decision,
}));
vi.mock('@/core/offline/use-today-decision', () => ({ useTodayDecision: (playerId?: string) => playerId ? state.decision : null }));
vi.mock('./hooks/use-daily-check', () => ({ useDailyCheck: () => ({ row: null, saved: false, error: false, save() {}, retry() {} }) }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-04T10:00:00Z'), online: true }) }));
vi.mock('../player-home/hooks/use-program-snapshot', () => ({ useProgramSnapshot: () => ({
  snapshot: { ...snapshot, training_days: state.rest ? [1, 2] : [3] }, status: 'ready', retry() {},
}) }));
vi.mock('../player-home/data/player-identity', () => ({ fetchPlayerIdentity: async () => ({}) }));
vi.mock('../player-home/hooks/use-week-sessions', () => ({ useWeekSessions: () => [] }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => [] }));
vi.mock('../player-home/components/next-task-slot', () => ({ NextTaskSlot: () => createElement('article', { 'data-testid': 'workout-hero' }) }));
vi.mock('../player-home/components/nutrition-slot', () => ({ NutritionSlot: () => null }));

function home() {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(HomeScreen, { playerId: 'player' })));
}

it('renders the rest mood, both questions, a breathing circle and the water glass', () => {
  state.rest = true;
  state.decision = null;
  const html = home();
  expect(html).toContain('data-mood="rest"');
  for (const text of ['Today is a rest day', 'How many hours did you sleep?', 'How does your body feel?', 'data-testid="water-glass"', 'motion-reduce:animate-none']) expect(html).toContain(text);
  expect(html).not.toContain('data-testid="water-strip"');
  expect(html).toContain('Tomorrow is a rest day too');
  expect(html).not.toContain('Tomorrow&#x27;s workout');
});

it('renders water and readiness immediately below the training hero', () => {
  state.rest = false;
  state.decision = null;
  // Wednesday is Sunday-based weekday 3.
  const html = home();
  expect(html).not.toContain('data-mood="rest"');
  expect(html.indexOf('workout-hero')).toBeLessThan(html.indexOf('water-strip'));
  expect(html).toContain('Answer the two morning questions');
  expect(html).toContain('Add 250 ml water');
});

it('links home to the weekly check-in with a visible label', () => {
  state.rest = false;
  state.decision = null;
  const html = home();
  expect(html).toContain('Weekly check-in');
  expect(html).toContain('href="/player/progress?checkin=1"');
});

it('renders the morning questions without a second water control when the strip is hidden', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(DailyPanel, { playerId: 'player', today: '2026-11-04', rest: false, hideWaterStrip: true })));
  expect(html).not.toContain('data-testid="water-strip"');
  expect(html).toContain('Answer the two morning questions');
});

it('keeps the water strip in the morning details by default', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(DailyPanel, { playerId: 'player', today: '2026-11-04', rest: false })));
  expect(html).toContain('data-testid="water-strip"');
});

it('applies coach rest on a scheduled training day', () => {
  state.rest = false;
  state.decision = 'rest';
  expect(home()).toContain('Your coach says today is active rest');
});

