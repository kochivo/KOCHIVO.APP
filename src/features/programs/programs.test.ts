import { describe, expect, it } from 'vitest';
import { addDay, addExercise, moveDay, moveExercise, removeDay, removeExercise, renameDay, toggleSuperset, updateExercise } from './draft';
import { daySummary, validateForActivation, escapeSearch } from './summary';
import type { ProgramDraft, LibraryExercise } from './types';

const exercise: LibraryExercise = { id: 'exercise', name_ar: 'بنش', name_en: 'Press', body_part: 'chest', equipment: null, media_path: null };
const empty = (): ProgramDraft => ({ id: 'program', player_id: 'player', title: 'برنامج', status: 'draft', days: [] });
function filled() {
  let draft = addDay(empty(), 'day', 'صدر');
  for (const id of ['a', 'b', 'c']) draft = addExercise(draft, 'day', exercise, id);
  return draft;
}
function positions(draft: ProgramDraft) {
  expect(draft.days.map(d => d.position)).toEqual(draft.days.map((_, i) => i + 1));
  for (const day of draft.days) expect(day.exercises.map(e => e.position)).toEqual(day.exercises.map((_, i) => i + 1));
}
describe('program draft', () => {
  it('adds, renames, moves and removes days immutably', () => {
    const initial = empty();
    let d = addDay(addDay(initial, 'a'), 'b');
    d = renameDay(d, 'a', 'صدر');
    expect(d.days[0]?.title).toBe('صدر');
    expect(moveDay(d, 'a', -1)).toEqual(d);
    expect(moveDay(d, 'b', 1)).toEqual(d);
    d = moveDay(d, 'b', -1);
    expect(d.days[0]?.id).toBe('b');
    positions(d);
    d = removeDay(d, 'b');
    positions(d);
    expect(d.days).toHaveLength(1);
    expect(initial.days).toEqual([]);
  });
  it('adds, reorders and removes exercises and ignores unknown IDs', () => {
    const d = filled();
    expect(moveExercise(d, 'day', 'a', -1)).toEqual(d);
    expect(moveExercise(d, 'day', 'c', 1)).toEqual(d);
    expect(moveExercise(d, 'day', 'missing', 1)).toEqual(d);
    let moved = moveExercise(d, 'day', 'a', 1);
    expect(moved.days[0]?.exercises.map(e => e.id)).toEqual(['b', 'a', 'c']);
    moved = removeExercise(moved, 'day', 'b');
    positions(moved);
    expect(moved.days[0]?.exercises).toHaveLength(2);
    expect(d.days[0]?.exercises).toHaveLength(3);
  });
  it('groups at least two, toggles off and clears orphaned groups', () => {
    let d = filled();
    expect(toggleSuperset(d, 'day', ['a'])).toEqual(d);
    d = toggleSuperset(d, 'day', ['a', 'b']);
    expect(d.days[0]?.exercises.map(e => e.superset_group)).toEqual([1, 1, null]);
    expect(toggleSuperset(d, 'day', ['a', 'b']).days[0]?.exercises.map(e => e.superset_group)).toEqual([null, null, null]);
    expect(removeExercise(d, 'day', 'b').days[0]?.exercises[0]?.superset_group).toBeNull();
    d = toggleSuperset(d, 'day', ['b', 'c']);
    expect(d.days[0]?.exercises.map(e => e.superset_group)).toEqual([null, 2, 2]);
    positions(d);
  });
  it('clamps sets, reps and rest, rounds rest to 15 seconds and permits an open rep range', () => {
    let d = updateExercise(filled(), 'day', 'a', { sets: 50, reps_min: 200, reps_max: 2, rest_seconds: 908 });
    expect(d.days[0]?.exercises[0]).toMatchObject({ sets: 20, reps_min: 100, reps_max: 100, rest_seconds: 900 });
    d = updateExercise(d, 'day', 'a', { sets: -1, reps_min: 0, reps_max: null, rest_seconds: 23 });
    expect(d.days[0]?.exercises[0]).toMatchObject({ sets: 1, reps_min: 1, reps_max: null, rest_seconds: 30 });
    d = updateExercise(d, 'day', 'a', { rest_seconds: -20 });
    expect(d.days[0]?.exercises[0]?.rest_seconds).toBe(0);
    positions(d);
  });
  it('validates title, assignment and at least one populated day', () => {
    expect(validateForActivation(empty()).length).toBeGreaterThan(0);
    expect(validateForActivation(filled())).toEqual([]);
    expect(validateForActivation({ ...filled(), player_id: null }).length).toBeGreaterThan(0);
    expect(validateForActivation({ ...filled(), title: ' ' }).length).toBeGreaterThan(0);
    expect(validateForActivation({ ...filled(), title: 'a'.repeat(81) }).length).toBeGreaterThan(0);
  });
  it('uses the today-card estimate rounded to five minutes', () => {
    const d = filled();
    const day = d.days[0];
    if (!day) throw new Error('fixture');
    expect(daySummary(day)).toEqual({ exercises: 3, sets: 9, minutes: 20 });
    expect(daySummary({ ...day, exercises: [] })).toEqual({ exercises: 0, sets: 0, minutes: 0 });
  });
  it('escapes literal search wildcards and backslashes', () => {
    expect(escapeSearch('50%_\\')).toBe('50\\%\\_\\\\');
    expect(escapeSearch('بنش Press')).toBe('بنش Press');
  });
});
