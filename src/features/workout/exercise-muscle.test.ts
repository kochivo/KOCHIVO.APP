import { expect, it } from 'vitest';
import type { SnapshotExercise } from '@/core/offline';
import { exerciseMuscle } from './exercise-muscle';

const exercise: SnapshotExercise = { id: 'p', exercise_id: 'e', position: 1, sets: 3, reps_min: 8, reps_max: 12,
  rest_seconds: 90, superset_group: null, rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Press', media_path: null };

it('uses refreshed muscle metadata while tolerating old and malformed cached snapshots', () => {
  expect(exerciseMuscle({ ...exercise, ...{ body_part: 'chest' } })).toBe('chest');
  expect(exerciseMuscle(exercise)).toBeNull();
  expect(exerciseMuscle({ ...exercise, ...{ body_part: 5 } })).toBeNull();
});
