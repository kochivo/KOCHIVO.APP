import { expect, it } from 'vitest';
import type { PainReportRow } from '@/core/offline/pain-tables';
import type { SnapshotExercise } from '@/core/offline';
import { painBlocksExercise } from './pain-block';

const report: PainReportRow = { id: 'pain', captain_id: 'coach', session_id: 'session',
  program_exercise_id: 'bench', exercise_id: 'bench-exercise', set_index: 1,
  area: 'knee_r', side_view: 'front', severity: 2, kind: 'strain', created_at: '2026-11-16T10:00:00Z' };
const bench: SnapshotExercise = { id: 'bench', exercise_id: 'bench-exercise', position: 1,
  sets: 1, reps_min: 8, reps_max: 12, rest_seconds: 0, superset_group: null,
  rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Bench', media_path: null, body_part: 'chest' };
const squat = { ...bench, id: 'squat', exercise_id: 'squat-exercise', body_part: 'upper legs' };
const lat = { ...bench, id: 'lat', exercise_id: 'lat-exercise', body_part: 'back' };

it('blocks squats for knee pain reported on bench, but keeps bench and lat pulldown writable', () => {
  expect(painBlocksExercise([report], squat)).toBe(true);
  expect(painBlocksExercise([report], bench)).toBe(false);
  expect(painBlocksExercise([report], lat)).toBe(false);
});

it.each([{ severity: 5 }, { kind: 'sharp' as const }])('keeps severe pain local unless the next exercise loads the area: %j', urgent => {
  const reports = [{ ...report, ...urgent }];
  expect(painBlocksExercise(reports, bench)).toBe(true);
  expect(painBlocksExercise(reports, lat)).toBe(false);
  expect(painBlocksExercise(reports, squat)).toBe(true);
});

it('checks every report, including stress metadata and unknown body parts', () => {
  const stressed = { ...lat, exercise_id: 'swap', alternative_exercises: [{ id: 'swap',
    name_ar: null, name_en: 'Swap', media_path: null, body_part: 'back', stress: ['knee'] }] };
  expect(painBlocksExercise([{ ...report, area: 'ankle_r' }, report], stressed)).toBe(true);
  expect(painBlocksExercise([report], { ...lat, body_part: null })).toBe(false);
  expect(painBlocksExercise([], undefined)).toBe(false);
});

it.each([null, undefined, 'unknown'])('keeps unknown part %s open for mild named pain only', body_part => {
  const unknown = { ...lat, body_part };
  expect(painBlocksExercise([report], unknown)).toBe(false);
  expect(painBlocksExercise([{ ...report, kind: 'sharp' }], unknown)).toBe(true);
  expect(painBlocksExercise([{ ...report, severity: 5 }], unknown)).toBe(true);
  expect(painBlocksExercise([{ ...report, area: 'other' }], unknown)).toBe(true);
  expect(painBlocksExercise([report], { ...bench, body_part })).toBe(true);
});

it('uses the selected alternative body part for reports from another exercise', () => {
  const alternative = { id: 'swap', name_ar: null, name_en: 'Swap', media_path: null, body_part: 'back' };
  expect(painBlocksExercise([report], { ...squat, exercise_id: 'swap', alternative_exercises: [alternative] }, 'swap')).toBe(false);
  expect(painBlocksExercise([report], { ...lat, exercise_id: 'swap', alternative_exercises: [{ ...alternative, body_part: 'upper legs' }] }, 'swap')).toBe(true);
});

it('preserves the selectedId exception for the current exercise own reports', () => {
  expect(painBlocksExercise([{ ...report, severity: 5 }], bench, 'swap')).toBe(false);
  expect(painBlocksExercise([{ ...report, severity: 5 }], bench, 'bench-exercise')).toBe(true);
});
