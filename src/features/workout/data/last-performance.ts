import type { KochivoDB, SetLogRow } from '@/core/offline';

export type Performance = Pick<SetLogRow, 'weight_kg' | 'reps'> & { pain_adjusted?: boolean };
export type PastSet = Pick<SetLogRow, 'id' | 'session_id' | 'set_index' | 'weight_kg' | 'reps' | 'completed_at' | 'drop_index'>;

/** Every set of the most recent earlier workout that included this exercise, in set order. */
export interface LastSession {
  sets: (Performance & { set_index: number })[];
}

export function latestSession(rows: readonly PastSet[], painSince?: string): LastSession | null {
  rows = rows.filter(row => (row.drop_index ?? 0) === 0);
  const newest = [...rows].sort((a, b) => b.completed_at.localeCompare(a.completed_at) || b.id.localeCompare(a.id))[0];
  if (!newest) return null;
  const sets = rows.filter((row) => row.session_id === newest.session_id).sort((a, b) => a.set_index - b.set_index)
    .map(({ set_index, weight_kg, reps, completed_at }) => ({ set_index, weight_kg, reps,
      ...(painSince ? { pain_adjusted: completed_at >= painSince } : {}) }));
  return { sets };
}

/** The same set from last time; progressive overload compares set 2 with set 2. */
export function performanceFor(last: LastSession | null | undefined, setIndex: number): Performance | null {
  const match = last?.sets.find((row) => row.set_index === setIndex);
  return match ? { weight_kg: match.weight_kg, reps: match.reps,
    ...(match.pain_adjusted === undefined ? {} : { pain_adjusted: match.pain_adjusted }) } : null;
}

export async function lastSession(db: KochivoDB, exerciseId: string, beforeSessionId: string, painSince?: string,
  skipDate?: (date: string) => boolean): Promise<LastSession | null> {
  const rows = await db.set_logs.filter((row) => row.exercise_id === exerciseId &&
    row.session_id !== beforeSessionId && row.deleted_at === null).toArray();
  if (skipDate) {
    const sessions = await db.workout_sessions.toArray();
    const eligible = new Set(sessions.filter(row => !skipDate(row.training_date)).map(row => row.id));
    return latestSession(rows.filter(row => eligible.has(row.session_id)), painSince);
  }
  return latestSession(rows, painSince);
}
