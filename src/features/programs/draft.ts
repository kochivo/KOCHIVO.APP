import type { DraftDay, DraftExercise, ExercisePatch, LibraryExercise, ProgramDraft } from './types';

function positioned<T extends { position: number }>(rows: T[]): T[] {
  return rows.map((row, i) => ({ ...row, position: i + 1 }));
}
function cleanGroups(rows: DraftExercise[]): DraftExercise[] {
  return positioned(rows).map(row => ({ ...row, superset_group: row.superset_group !== null &&
    rows.filter(other => other.superset_group === row.superset_group).length > 1 ? row.superset_group : null }));
}
function editDay(draft: ProgramDraft, id: string, edit: (day: DraftDay) => DraftDay): ProgramDraft {
  return { ...draft, days: positioned(draft.days.map(day => day.id === id ? edit(day) : day)) };
}
function move<T extends { id: string; position: number }>(rows: T[], id: string, delta: -1 | 1): T[] {
  const from = rows.findIndex(row => row.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= rows.length) return rows;
  const copy = [...rows];
  const row = copy.splice(from, 1)[0];
  if (row) copy.splice(to, 0, row);
  return positioned(copy);
}
export function addDay(draft: ProgramDraft, id: string, title = 'يوم جديد'): ProgramDraft {
  return { ...draft, days: positioned([...draft.days, { id, program_id: draft.id, title, position: 0, exercises: [] }]) };
}
export function removeDay(draft: ProgramDraft, id: string): ProgramDraft {
  return { ...draft, days: positioned(draft.days.filter(day => day.id !== id)) };
}
export function renameDay(draft: ProgramDraft, id: string, title: string): ProgramDraft {
  return editDay(draft, id, day => ({ ...day, title: title.slice(0, 60) }));
}
export function moveDay(draft: ProgramDraft, id: string, delta: -1 | 1): ProgramDraft {
  return { ...draft, days: move(draft.days, id, delta) };
}
export function addExercise(draft: ProgramDraft, dayId: string, library: LibraryExercise, id: string): ProgramDraft {
  return editDay(draft, dayId, day => ({ ...day, exercises: positioned([...day.exercises, {
    id, day_id: day.id, exercise_id: library.id, library, position: 0,
    sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
  }]) }));
}
export function removeExercise(draft: ProgramDraft, dayId: string, id: string): ProgramDraft {
  return editDay(draft, dayId, day => ({ ...day, exercises: cleanGroups(day.exercises.filter(row => row.id !== id)) }));
}
export function moveExercise(draft: ProgramDraft, dayId: string, id: string, delta: -1 | 1): ProgramDraft {
  return editDay(draft, dayId, day => ({ ...day, exercises: move(day.exercises, id, delta) }));
}
export function toggleSuperset(draft: ProgramDraft, dayId: string, ids: string[]): ProgramDraft {
  return editDay(draft, dayId, day => {
    const selected = day.exercises.filter(row => ids.includes(row.id));
    if (selected.length < 2) return day;
    const groups = new Set(day.exercises.map(row => row.superset_group));
    let next = 1;
    while (groups.has(next)) next++;
    const first = selected[0]?.superset_group;
    const ungroup = first != null && selected.every(row => row.superset_group === first);
    return { ...day, exercises: cleanGroups(day.exercises.map(row => ids.includes(row.id)
      ? { ...row, superset_group: ungroup ? null : next } : row)) };
  });
}
function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : min;
}
export function updateExercise(draft: ProgramDraft, dayId: string, id: string, patch: ExercisePatch): ProgramDraft {
  return editDay(draft, dayId, day => ({ ...day, exercises: day.exercises.map(row => {
    if (row.id !== id) return row;
    const next = { ...row, ...patch };
    next.sets = clamp(next.sets, 1, 20);
    next.reps_min = clamp(next.reps_min, 1, 100);
    next.reps_max = next.reps_max === null ? null : clamp(next.reps_max, next.reps_min, 32767);
    next.rest_seconds = clamp(Math.round(next.rest_seconds / 15) * 15, 0, 900);
    return next;
  }) }));
}
