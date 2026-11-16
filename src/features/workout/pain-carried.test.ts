import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { PainReportRow } from '@/core/offline/pain-tables';
import type { SnapshotExercise } from '@/core/offline';
import { PainCarried } from './components/pain-carried';

vi.mock('@/core/i18n/client', () => ({ useT: (m: Parameters<typeof createT>[0]) => createT(m, 'en'), useLocale: () => 'en' }));
const report: PainReportRow = { id: 'pain', captain_id: 'coach', session_id: 'session',
  program_exercise_id: 'bench', exercise_id: 'bench-exercise', set_index: 1, area: 'knee_r',
  side_view: 'front', severity: 2, kind: 'strain', created_at: '2026-11-16T10:00:00Z' };
const exercise: SnapshotExercise = { id: 'squat', exercise_id: 'squat-exercise', position: 2,
  sets: 1, reps_min: 8, reps_max: 12, rest_seconds: 0, superset_group: null,
  rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Squat', media_path: null,
  body_part: 'upper legs', pattern: 'pull' };
const safe = { id: 'safe', name_ar: null, name_en: 'Supported row', media_path: null,
  body_part: 'back', pattern: 'pull', stress: [] };
const step = { exercise, setIndex: 1, restAfter: 0 };
const state: Parameters<typeof PainCarried>[0]['state'] = { current: step, painCarried: [report], painReports: [report],
  disabled: false, switchExercise() {}, skipExercise: async () => {} };
type Props = { children?: unknown; onClick?: () => void };
function elements(node: unknown): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !('props' in node)) return [];
  const element = node as ReactElement<Props>;
  return [element, ...elements(element.props.children)];
}

it('explains the carried area and skips the current exercise without another report', () => {
  let skipped = '';
  const tree = PainCarried({ state: { ...state, skipExercise: async id => { skipped = id; } } });
  const html = renderToStaticMarkup(tree);
  expect(html).toContain('Your pain report (Right knee) affects this exercise.');
  expect(html).toContain('Skip this exercise');
  expect(html).toContain('control-secondary');
  expect(html).not.toContain('Switch to');
  elements(tree).find(node => node.props.children === 'Skip this exercise')?.props.onClick?.();
  expect(skipped).toBe('squat');
});

it('offers a safe alternative and switches to its identity', () => {
  let chosen = '';
  const current = { ...step, exercise: { ...exercise, alternatives: ['unsafe', 'safe'],
    alternative_exercises: [{ ...safe, id: 'unsafe', name_en: 'Leg pull', body_part: 'upper legs' }, safe] } };
  const tree = PainCarried({ state: { ...state, current, switchExercise: id => { chosen = id; } } });
  const html = renderToStaticMarkup(tree);
  expect(html).toContain('Switch to Supported row');
  expect(html).toContain('control-primary');
  expect(html).not.toContain('Switch to Leg pull');
  elements(tree).find(node => node.props.children === 'Switch to Supported row')?.props.onClick?.();
  expect(chosen).toBe('safe');
});

it('checks all reports, approved alternatives and drop-set restrictions before offering a swap', () => {
  const current = { ...step, exercise: { ...exercise, alternatives: ['safe'], alternative_exercises: [safe] } };
  const render = (overrides: Partial<Parameters<typeof PainCarried>[0]['state']>) =>
    renderToStaticMarkup(createElement(PainCarried, { state: { ...state, current, ...overrides } }));
  expect(render({ painReports: [report, { ...report, id: 'shoulder', area: 'shoulder_r' }] })).not.toContain('Switch to');
  expect(render({ current: { ...current, dropIndex: 1 } })).not.toContain('Switch to');
  expect(render({ current: { ...current, exercise: { ...current.exercise, alternatives: [] } } })).not.toContain('Switch to');
  expect(render({ painCarried: [] })).toBe('');
});
