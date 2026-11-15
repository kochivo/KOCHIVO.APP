import { expect, it } from 'vitest';
import { expectedWorkoutPrs } from './data/expected-workout-prs';

const set = (session_id: string, weight_kg: number, reps: number, exercise_id = 'bench') => ({
  session_id, weight_kg, reps, exercise_id, completed_at: session_id === 'old' ? '2026-11-14T10:00Z' : '2026-11-15T10:00Z',
  deleted_at: null, drop_index: 0,
});
const session = { id: 'today', started_at: '2026-11-15T09:00Z' };
it('uses SQL estimated-max criteria rather than heavier weight alone', () => {
  expect(expectedWorkoutPrs([set('old', 100, 12), set('today', 101, 1)], session)).toBe(0);
  expect(expectedWorkoutPrs([set('old', 100, 1), set('today', 100, 2)], session)).toBe(1);
});
it('requires prior-session history, excludes drops and high reps, and counts each exercise once', () => {
  expect(expectedWorkoutPrs([set('today', 100, 1), set('today', 110, 1)], session)).toBe(0);
  expect(expectedWorkoutPrs([set('old', 100, 1), set('today', 110, 13)], session)).toBe(0);
  expect(expectedWorkoutPrs([set('old', 100, 1), { ...set('today', 110, 1), drop_index: 1 }], session)).toBe(0);
  expect(expectedWorkoutPrs([set('old', 100, 1), set('today', 110, 1), set('today', 120, 1)], session)).toBe(1);
});
it('caps expected PR points at three exercises', () => {
  const rows = ['a', 'b', 'c', 'd'].flatMap(id => [set('old', 100, 1, id), set('today', 110, 1, id)]);
  expect(expectedWorkoutPrs(rows, session)).toBe(3);
});
