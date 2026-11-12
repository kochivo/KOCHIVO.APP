import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { SnapshotDay } from '@/core/offline';
import { TodayCard } from './components/today-card';
import { NextTaskCard } from './components/next-task-card';

const day: SnapshotDay = { id: 'd', title: 'Push', position: 1,
  exercises: [{ id: 'e', exercise_id: 'e', position: 1, sets: 3, reps_min: 8, reps_max: 12,
    rest_seconds: 90, superset_group: null, rpe: null, tempo: null, notes: null,
    name_ar: null, name_en: 'Bench', media_path: null }],
  warmup: { items: [{ id: 'w', name: 'Walk', amount: 5, unit: 'min' }, { id: 's', name: 'Shoulders', amount: 30, unit: 'sec' }], ramp: true } };
const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
afterEach(() => vi.unstubAllEnvs());
it('adds timed warm-up minutes to today’s duration and shows the warm-up time', () => {
  const html = render(createElement(TodayCard, { day, rest: false }));
  expect(html).toContain('About 11 minutes');
  expect(html).toContain('Warm-up: 6 min');
  expect(render(createElement(TodayCard, { day: { ...day, warmup: undefined }, rest: false }))).not.toContain('Warm-up:');
});
it('includes warm-up time in the v6 workout task summary', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = render(createElement(NextTaskCard, { day, task: { kind: 'start', name: 'Push', href: '/player/workout/d' } }));
  expect(html).toContain('11 minutes');
  expect(html).toContain('Warm-up: 6 min');
});
