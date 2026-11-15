import type { SetLogRow, WorkoutSessionRow } from '@/core/offline';

export type HistorySet = Omit<SetLogRow, 'program_exercise_id'> & { program_exercise_id: string | null };
export type HistorySession = Omit<WorkoutSessionRow, 'program_day_id'> & { program_day_id: string | null };
export type HistoryWorkout = HistorySession & { exercises: { id: string; sets: HistorySet[] }[]; setCount: number };

type Versioned = { id: string; client_updated_at: string };
export function mergeHistoryRows<R extends Versioned, L extends Versioned>(remote: R[], local: L[]): (R | L)[] {
  const rows = new Map<string, R | L>(remote.map(row => [row.id, row]));
  for (const row of local) {
    const existing = rows.get(row.id);
    if (!existing || Date.parse(row.client_updated_at) >= Date.parse(existing.client_updated_at)) rows.set(row.id, row);
  }
  return [...rows.values()];
}

export function groupHistory(sessions: HistorySession[], sets: HistorySet[]): HistoryWorkout[] {
  const bySession = new Map<string, Map<string, HistorySet[]>>();
  for (const set of sets) {
    if (set.deleted_at) continue;
    const exercises = bySession.get(set.session_id) ?? new Map<string, HistorySet[]>();
    const rows = exercises.get(set.exercise_id) ?? [];
    rows.push(set);
    exercises.set(set.exercise_id, rows);
    bySession.set(set.session_id, exercises);
  }
  return sessions.filter(row => row.completed_at).sort((a, b) =>
    b.training_date.localeCompare(a.training_date) || b.started_at.localeCompare(a.started_at) || b.id.localeCompare(a.id))
    .map(row => {
      const exercises = [...(bySession.get(row.id) ?? [])].map(([id, sets]) => ({ id,
        sets: sets.sort((a, b) => a.set_index - b.set_index || (a.drop_index ?? 0) - (b.drop_index ?? 0) || a.completed_at.localeCompare(b.completed_at)) }));
      return { ...row, exercises, setCount: exercises.reduce((total, exercise) => total + exercise.sets.filter(set => (set.drop_index ?? 0) === 0).length, 0) };
    });
}

export function bestSet(sets: HistorySet[]): HistorySet | null {
  return sets.filter(row => (row.drop_index ?? 0) === 0).reduce<HistorySet | null>((best, row) => !best || (row.weight_kg ?? 0) > (best.weight_kg ?? 0) ||
    (row.weight_kg === best.weight_kg && (row.reps ?? 0) > (best.reps ?? 0)) ? row : best, null);
}
