import type { KochivoDB, SetLogRow } from '@/core/offline';

export type Performance = Pick<SetLogRow, 'weight_kg' | 'reps'>;

export async function lastPerformance(db: KochivoDB, exerciseId: string, beforeSessionId: string): Promise<Performance | null> {
  const rows = await db.set_logs.filter((row) => row.exercise_id === exerciseId &&
    row.session_id !== beforeSessionId && row.deleted_at === null).toArray();
  rows.sort((a, b) => b.completed_at.localeCompare(a.completed_at) || b.id.localeCompare(a.id));
  const row = rows[0];
  return row ? { weight_kg: row.weight_kg, reps: row.reps } : null;
}
