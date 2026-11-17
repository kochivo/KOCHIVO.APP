import { expect, it } from 'vitest';
import type { SnapshotExercise } from '@/core/offline';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { remainingPainIds, savePainSkips, painFinishHeadline, readPainSkipCount } from './pain-stop';

const exercise: SnapshotExercise = { id: 'squat', exercise_id: 'squat-ex', position: 1,
  sets: 2, reps_min: 8, reps_max: 12, rest_seconds: 0, superset_group: null,
  rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Squat', media_path: null, body_part: 'upper legs' };
const report: PainReportRow = { id: 'pain', captain_id: 'coach', session_id: 'session',
  program_exercise_id: 'squat', exercise_id: 'squat-ex', set_index: 1,
  area: 'knee_r', side_view: 'front', severity: 2, kind: 'strain', created_at: '2026-11-18T10:00:00Z' };
const step = (id: string, body_part: string, setIndex = 1) => ({ exercise: { ...exercise, id, body_part }, setIndex, restAfter: 0 });
const queue = [step('done', 'upper legs'), step('squat', 'upper legs'), step('squat', 'upper legs', 2),
  step('bench', 'chest'), step('lunge', 'upper legs'), step('unknown', 'unknown')];
const logged = [{ program_exercise_id: 'done', set_index: 1 }];

it('bulk skips only blocked remaining exercises, once per exercise', () => {
  expect(remainingPainIds(queue, logged, {}, report)).toEqual(['squat', 'lunge']);
  expect(remainingPainIds(queue, logged, {}, { ...report, kind: 'sharp' })).toEqual(['squat', 'lunge', 'unknown']);
});

it('stopping skips every remaining exercise and respects logged drop sets', () => {
  expect(remainingPainIds(queue, logged, {})).toEqual(['squat', 'bench', 'lunge', 'unknown']);
  const drops = [{ ...step('squat', 'upper legs'), dropIndex: 1 }];
  expect(remainingPainIds(drops, [{ program_exercise_id: 'squat', set_index: 1 }], {})).toEqual(['squat']);
});

it('checks the selected alternative when deciding which remaining exercises to remove', () => {
  const swapped = [{ ...step('squat', 'upper legs'), exercise: { ...exercise, alternatives: ['safe'], alternative_exercises: [
    { id: 'safe', name_ar: null, name_en: 'Row', media_path: null, body_part: 'back' },
  ] } }];
  expect(remainingPainIds(swapped, [], { squat: 'safe' }, report)).toEqual([]);
});

it('persists the complete merged skip list in one write to the existing store', () => {
  const writes: [string, string][] = [];
  const ids = savePainSkips({ setItem: (key, value) => { writes.push([key, value]); } }, 'session', ['old'], ['squat', 'squat', 'lunge']);
  expect(ids).toEqual(['old', 'squat', 'lunge']);
  expect(writes).toEqual([['exercise-choices:pain-skips:session', '{"old":"skip","squat":"skip","lunge":"skip"}']]);
});

it('chooses the normal, stopped, or safe-exercises finish headline from skips and logged sets', () => {
  expect(painFinishHeadline(0, 0)).toBe(null);
  expect(painFinishHeadline(0, 6)).toBe(null);
  expect(painFinishHeadline(3, 0)).toBe('finishStopped');
  expect(painFinishHeadline(3, 1)).toBe('finishSafe');
});

it('counts pain skips saved for a session, through the same storage key the skips use', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  savePainSkips(storage, 's1', [], ['squat', 'lunge']);
  expect(readPainSkipCount(storage, 's1')).toBe(2);
  expect(readPainSkipCount(storage, 'other')).toBe(0);
});
