import { expect, it } from 'vitest';
import { bestSet, groupHistory, mergeHistoryRows } from './data/history-grouping';
import type { SetLogRow, WorkoutSessionRow } from '@/core/offline';

const session = (id: string, date: string, completed_at: string | null = date): WorkoutSessionRow => ({
  id, training_date: date, completed_at, program_day_id: 'day', started_at: date, client_updated_at: date,
});
const set = (id: string, session_id: string, weight_kg: number, reps: number, set_index = 1): SetLogRow => ({
  id, session_id, weight_kg, reps, set_index, exercise_id: 'squat', program_exercise_id: 'item',
  completed_at: '2026-11-03', client_updated_at: '2026-11-03', deleted_at: null,
});

it('groups finished sessions newest first, then exercises and ordered sets', () => {
  const rows = groupHistory([session('old', '2026-11-01'), session('new', '2026-11-03'), session('open', '2026-11-04', null)],
    [set('b', 'new', 60, 8, 2), set('a', 'new', 50, 10), set('c', 'old', 40, 12), set('d', 'open', 70, 8)]);
  expect(rows.map(row => row.id)).toEqual(['new', 'old']);
  expect(rows[0]?.exercises[0]?.sets.map(row => row.id)).toEqual(['a', 'b']);
  expect(bestSet(rows.flatMap(row => row.exercises.flatMap(ex => ex.sets)))?.id).toBe('b');
});

it('merges by id with the latest version, including local deletions', () => {
  const remote = [set('a', 's', 50, 8), set('b', 's', 60, 8)];
  const local = [{ ...remote[0], ...set('a', 's', 55, 8), client_updated_at: '2026-11-04' },
    { ...set('b', 's', 60, 8), deleted_at: '2026-11-04', client_updated_at: '2026-11-04' }];
  const merged = mergeHistoryRows(remote, local);
  expect(merged).toHaveLength(2);
  expect(groupHistory([session('s', '2026-11-03')], merged)[0]?.exercises[0]?.sets.map(row => row.weight_kg)).toEqual([55]);
  expect(mergeHistoryRows(local, remote)).toEqual(local);
});

it('breaks heaviest-set ties by reps and handles an empty history', () => {
  expect(bestSet([set('a', 's', 60, 8), set('b', 's', 60, 10), set('c', 's', 50, 20)])?.id).toBe('b');
  expect(bestSet([])).toBeNull();
});
