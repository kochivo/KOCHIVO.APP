import type { ComponentProps, ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { WorkoutSet } from './components/workout-set';
import { applyAlternative } from './data/exercise-choices';

const hooks = vi.hoisted(() => ({ values: [] as unknown[], index: 0, rendering: false }));
// The workout screen lazy-loads the video player; render it synchronously here.
vi.mock('next/dynamic', async () => { const video = await import('./components/exercise-video');
  return { default: (loader: () => unknown) => String(loader).includes('exercise-video') ? video.ExerciseVideo : () => null }; });
vi.mock('server-only', () => ({}));
vi.mock('react', async original => { const react = await original<typeof React>(); return { ...react,
  useCallback: <T,>(callback: T) => callback,
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => boolean) => snapshot(),
  useState: (initial: unknown) => {
    if (hooks.rendering) return react.useState(initial);
    const index = hooks.index++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => { hooks.values[index] = value; }];
  },
}; });
vi.mock('@/core/offline', () => ({ localDb: () => ({}), useLiveQuery: () => [] }));
vi.mock('@/core/storage', () => ({ exerciseMediaUrl: () => 'https://media.example/row.gif' }));
type Props = { children?: unknown; onClick?: () => void; 'aria-pressed'?: boolean };
function elements(node: unknown): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Props>;
  return [element, ...elements(element.props.children)];
}
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
const exercise = { id: 'prescription', exercise_id: 'row', position: 1, sets: 3, reps_min: 8, reps_max: 12,
  rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: null, media_path: 'row.gif', name_ar: null, name_en: 'Row',
  video_url: 'https://youtube.com/shorts/dQw4w9WgXcQ', alternatives: ['press'],
  alternative_exercises: [{ id: 'press', name_ar: null, name_en: 'Press', media_path: null, video_url: 'https://drive.google.com/open?id=abc123' }] };
const state: ComponentProps<typeof WorkoutSet>['state'] = {
  day: { id: 'day', title: 'Day', position: 1, exercises: [exercise] }, current: { exercise, setIndex: 1, restAfter: 60 },
  session: null, decision: null, programFinished: false, queue: [], doneSets: [], performance: null, lastSession: null,
  weight: 50, reps: 10, rest: { endsAt: null, remaining: 0, total: 0, sound: false, flashing: false,
    toggleSound() {}, start() {}, extend() {}, skip() {} }, pending: 0, parked: 0, retrySync() {}, pr: null, dismissPr() {},
  bodyweight: false, setBodyweight() {}, invalid: null, progress: 1, next: undefined, finished: false, loading: false,
  error: null, disabled: false, setWeight() {}, setReps() {}, edit() {}, complete: async () => {}, switchExercise() {}, retry() {},
};
const render = (current = state.current) => {
  hooks.index = 0;
  const tree = WorkoutSet({ state: { ...state, current } });
  hooks.rendering = true;
  try { return { tree, html: renderToStaticMarkup(tree) }; }
  finally { hooks.rendering = false; }
};
beforeEach(() => { hooks.values = []; hooks.index = 0; });
afterEach(() => vi.unstubAllGlobals());
it('swaps the large video for the GIF and back without changing set inputs', () => {
  const initial = render();
  expect(initial.html).toContain('Video from your coach');
  expect(initial.html).not.toContain('<img');
  expect(initial.html).toContain('aria-pressed="false"');
  elements(initial.tree).find(node => node.props['aria-pressed'] === false)?.props.onClick?.();
  const gif = render();
  expect(gif.html).toContain('<img');
  expect(gif.html).not.toContain('Video from your coach');
  expect(gif.html).toContain('value="50"');
  expect(gif.html).toContain('value="10"');
  elements(gif.tree).find(node => node.props['aria-pressed'] === true)?.props.onClick?.();
  expect(render().html).toContain('Video from your coach');
});
it('uses the chosen alternative video and leaves completion enabled offline', () => {
  vi.stubGlobal('navigator', { onLine: false });
  const chosen = applyAlternative(exercise, 'press');
  const html = render({ exercise: chosen, setIndex: 1, restAfter: 60 }).html;
  expect(html).toContain('Press');
  expect(html).toContain('Google Drive');
  expect(html).toContain('Video needs internet. You can keep training; everything is saved.');
  const completion = html.match(/<button[^>]*>(?:(?!<button)[\s\S])*?Set complete<\/button>/)?.[0];
  expect(completion).toBeDefined();
  expect(completion).not.toContain(' disabled=');
});
