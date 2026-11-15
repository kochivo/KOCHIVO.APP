import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { SnapshotExercise } from '@/core/offline';
import { ExerciseHeader } from './components/exercise-header';
import { WorkoutOverviewExercise } from './components/workout-overview-exercise';
import { formatTempo } from './tempo';

it.each([['3010', '3-0-1-0'], ['30X0', '3-0-X-0'], ['0000', '0-0-0-0']])('formats %s', (raw, expected) => {
  expect(formatTempo(raw)).toBe(expected);
});

vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => true }));
vi.mock('./hooks/use-last-session', () => ({ useLastSession: () => ({ ready: true, last: null }) }));
const exercise: SnapshotExercise = { id: 'bench', exercise_id: 'bench', position: 1, sets: 3,
  reps_min: 8, reps_max: 8, rest_seconds: 60, superset_group: null, rpe: null, rir: null,
  tempo: null, notes: null, name_ar: 'بنش', name_en: 'Bench', media_path: null };

it.each(['header', 'overview'] as const)('%s shows prescribed tempo, RPE and zero RIR and hides absent values', view => {
  const render = (value: SnapshotExercise) => renderToStaticMarkup(view === 'header'
    ? createElement(ExerciseHeader, { exercise: value, last: null })
    : createElement(WorkoutOverviewExercise, { exercise: value, sessionId: 'session' }));
  const html = render({ ...exercise, tempo: '30X0', rpe: 8, rir: 0 });
  expect(html).toContain('<bdi dir="ltr">3-0-X-0</bdi>');
  expect(html).toContain('RPE 8');
  expect(html).toContain('RIR 0');
  if (view === 'header') expect(html).toContain('X = explosive'); else expect(html).not.toContain('X = explosive');
  const empty = render(exercise);
  expect(empty).not.toContain('Tempo');
  expect(empty).not.toContain('RPE');
  expect(empty).not.toContain('RIR');
});

it.each([
  { tempo: '3010', rpe: null, rir: null, shown: '3-0-1-0', hidden: ['RPE', 'RIR'] },
  { tempo: null, rpe: 7, rir: null, shown: 'RPE 7', hidden: ['Tempo', 'RIR'] },
  { tempo: null, rpe: null, rir: 2, shown: 'RIR 2', hidden: ['Tempo', 'RPE'] },
])('renders independent prescriptions in the shared focus/demo display: $shown', ({ shown, hidden, ...values }) => {
  const html = renderToStaticMarkup(createElement(ExerciseHeader, {
    exercise: { ...exercise, ...values }, last: null, prescriptionOnly: true,
  }));
  expect(html).toContain(shown);
  for (const label of hidden) expect(html).not.toContain(label);
});

it('renders no prescription container for an exercise without targets', () => {
  expect(renderToStaticMarkup(createElement(ExerciseHeader, { exercise, last: null, prescriptionOnly: true }))).toBe('');
});
