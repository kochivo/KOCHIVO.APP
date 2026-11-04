import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type * as Offline from '@/core/offline';
import type * as Readiness from '@/features/readiness';
import { useFocusSession } from './hooks/use-focus-session';

const fixture = vi.hoisted(() => ({
  day: { id: 'day', title: 'Workout', position: 1, exercises: [{
    id: 'pe', exercise_id: 'exercise', position: 1, sets: 5, reps_min: 8, reps_max: 12,
    rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: null,
    name_ar: null, name_en: 'Exercise', media_path: null,
  }] },
  index: 0,
}));
vi.mock('@/features/readiness', async original => ({
  ...await original<typeof Readiness>(), useTodayDecision: () => 'reduce',
}));
vi.mock('@/features/player-home', () => ({ useProgramSnapshot: () => ({
  snapshot: { days: [fixture.day] }, status: 'ready', retry() {},
}) }));
vi.mock('@/core/offline', async original => ({
  ...await original<typeof Offline>(),
  useLiveQuery: () => [null, 0, null, []][fixture.index++],
}));
vi.mock('./hooks/use-last-session', () => ({ useLastSession: () => ({ last: null, ready: true }) }));
vi.mock('./hooks/use-bodyweight', () => ({ useBodyweight: () => ({ bodyweight: true, setBodyweight() {} }) }));
vi.mock('./hooks/use-rest-timer', () => ({ useRestTimer: () => ({ remaining: 0, endsAt: null }) }));

it('builds four target sets from five without mutating the saved program or logs', () => {
  fixture.index = 0;
  function Probe() {
    const state = useFocusSession('day', '2026-11-04', 'player');
    return createElement('output', null, JSON.stringify({ target: state.current?.exercise.sets, total: state.queue.length, logged: state.doneSets }));
  }
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(Probe)));
  expect(html).toContain('&quot;target&quot;:4');
  expect(html).toContain('&quot;total&quot;:4');
  expect(html).toContain('&quot;logged&quot;:[]');
  expect(fixture.day.exercises[0]?.sets).toBe(5);
});
