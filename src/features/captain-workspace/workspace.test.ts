import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { WorkspacePlan } from './components/workspace-plan';
import { WorkspaceState } from './components/workspace-state';
import { PlayerFileSlot } from './components/player-file-slot';
import { WorkspaceHeader } from './components/workspace-header';
import { ExerciseRow } from './components/exercise-row';

vi.mock('server-only', () => ({}));
const row = { id: 'e', day_id: 'd', exercise_id: 'x', position: 1, sets: 4, reps_min: 8,
  reps_max: 10, rest_seconds: 60, rir: null, superset_group: null, library: null };
const trainingDay: DraftDay = { id: 'd', program_id: 'p', title: 'Chest', position: 1, weekday: 0, exercises: [row] };
const program: ProgramDraft = { id: 'p', player_id: 'player', title: 'Plan', status: 'active', days: [trainingDay] };

it('isolates the rep scheme LTR in Arabic and handles failure and equal reps', () => {
  for (const [reps_max, expected] of [[10, '4 × 8-10'], [8, '4 × 8'], [null, '4 × للفشل']] as const) {
    const html = renderToStaticMarkup(createElement(ExerciseRow, { row: { ...row, reps_max }, locale: 'ar' }));
    expect(html).toContain(`<bdi dir="ltr" class="whitespace-nowrap font-bold tabular-nums">${expected}</bdi>`);
  }
});
it('renders the library name and translated muscle and equipment in Arabic', () => {
  const html = renderToStaticMarkup(createElement(ExerciseRow, { locale: 'ar', row: { ...row,
    library: { id: 'x', name_ar: 'بنش بريس', name_en: 'Bench press', body_part: 'chest', equipment: 'barbell', media_path: null },
  } }));
  expect(html).toContain('بنش بريس');
  expect(html).toContain('صدر · بار');
});
it.each(['ar', 'en'] as const)('renders weekly and rotation plans in %s with no editing controls', locale => {
  for (const weekday of [0, undefined]) {
    const html = renderToStaticMarkup(createElement(WorkspacePlan, { locale,
      program: { ...program, days: [{ ...trainingDay, weekday }] },
    }));
    expect(html).toContain('Plan');
    expect(html).toContain('Chest');
    expect(html).toContain('dir="ltr"');
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<form');
  }
});
it.each(['ar', 'en'] as const)('renders translated loading, error, no-program and empty-day states in %s', locale => {
  const loading = renderToStaticMarkup(createElement(WorkspaceState, { kind: 'loading', locale }));
  const error = renderToStaticMarkup(createElement(WorkspaceState, { kind: 'error', locale }));
  const empty = renderToStaticMarkup(createElement(WorkspaceState, { kind: 'empty', locale }));
  expect(loading).toContain('role="status"');
  expect(error).toContain('role="alert"');
  expect(empty).toContain('href="/captain/templates"');
  const emptyDay = renderToStaticMarkup(createElement(WorkspacePlan, { locale, program: { ...program, days: [] } }));
  expect(emptyDay).toContain(locale === 'en' ? 'No training days yet' : 'لسه مفيش أيام تمرين');
});
it('renders intake facts and explicit unavailable values without inventing numbers', () => {
  const html = renderToStaticMarkup(createElement(PlayerFileSlot, { locale: 'en', today: '2026-11-11',
    player: { name: 'Ahmed', intake: { birthYear: 1999, weightKg: 82.4, targetWeightKg: 86 } },
  }));
  expect(html).toContain('27 years');
  expect(html).toContain('82.4 kg');
  expect(html).toContain('86 kg');
  const missing = renderToStaticMarkup(createElement(PlayerFileSlot, { locale: 'en', today: '2026-11-11', player: { name: 'Ahmed', intake: null } }));
  expect(missing).toContain('Not provided');
  expect(missing).not.toContain('0 kg');
});
it('links tabs to existing routes and profile tabs', () => {
  const html = renderToStaticMarkup(createElement(WorkspaceHeader, { playerId: 'player', name: 'Ahmed', locale: 'en' }));
  for (const href of ['/captain/players/player', '/captain/players/player/programs', '/captain/players/player/nutrition',
    '/captain/players/player?tab=checkins']) expect(html).toContain(`href="${href}"`);
});
