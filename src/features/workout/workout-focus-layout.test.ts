import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type * as Offline from '@/core/offline';
import type { SetLogRow, SnapshotExercise } from '@/core/offline';
import { MediaStatus } from './components/media-status';
import { WorkoutSet } from './components/workout-set';
import type { useFocusSession } from './hooks/use-focus-session';

vi.mock('server-only', () => ({}));
const query = vi.hoisted(() => ({ result: [] as unknown }));
vi.mock('@/core/offline', async original => ({
  ...await original<typeof Offline>(), useLiveQuery: () => query.result,
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const exercise: SnapshotExercise = {
  id: 'lunge', exercise_id: 'lunge', name_en: 'Dumbbell lunge', name_ar: 'اندفاع بالدمبل',
  position: 1, sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 0,
  superset_group: null, rpe: null, tempo: null, notes: null, media_path: null,
};
const completed = {
  program_exercise_id: exercise.id, exercise_id: exercise.exercise_id, set_index: 1,
  weight_kg: 5, reps: 8, drop_index: 0, completed_at: '2026-11-27T16:00:00Z',
} as SetLogRow;

function render(doneSets: SetLogRow[] = [], nextExercise = exercise) {
  const setIndex = doneSets.length + 1;
  const state = {
    current: { exercise, setIndex, restAfter: 0 },
    next: { exercise: nextExercise, setIndex: setIndex + 1, restAfter: 0 },
    day: { id: 'day', title: 'Day', position: 1, exercises: [exercise] },
    doneSets, weight: 5, reps: 8, rest: { remaining: 0 }, performance: null,
  } as ReturnType<typeof useFocusSession>;
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(WorkoutSet, { state, v4: true })));
}

it('shows one set picker and one pair of inputs, with no completion marks before logging', () => {
  const html = render();
  expect(html).not.toContain('<table');
  expect(html).not.toContain('lucide-check');
  expect(html).toMatch(/<button\b[^>]*disabled=""[^>]*aria-current="step"[^>]*aria-label="Set 1"/);
  expect(html.match(/<input\b/g)).toHaveLength(2);
});

it('lets only logged sets be edited and flags the next set as current', () => {
  const html = render([completed]);
  expect(html.match(/lucide-check/g)).toHaveLength(1);
  expect(html).toContain('aria-label="Edit set 1"');
  expect(html).toMatch(/aria-current="step"[^>]*aria-label="Set 2"/);
  expect(html).not.toContain('aria-label="Edit set 3"');
});

it('shows the upcoming exercise only when it differs from the current one', () => {
  expect(render()).not.toContain('Up next');
  expect(render([], { ...exercise, id: 'bridge', name_en: 'Glute bridge' })).toContain('Glute bridge');
});

it('keeps the set action ahead of optional details and omits an empty media frame', () => {
  const html = render();
  expect(html.indexOf('Done with set 1')).toBeGreaterThan(0);
  expect(html.indexOf('Done with set 1')).toBeLessThan(html.indexOf('Workout details'));
  expect(html).not.toContain('aspect-video');
});

it('hides the idle video queue and retains the pending upload count', () => {
  const status = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MediaStatus)));
  try {
    query.result = 0;
    expect(status()).toBe('');
    query.result = 2;
    expect(status()).toContain('Videos waiting · 2');
  } finally { query.result = []; }
});
