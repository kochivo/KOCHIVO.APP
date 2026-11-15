import type { SetLogRow } from '@/core/offline';
import { detectPr } from '../pr';

export function finishSummary(rows: readonly SetLogRow[], sessionId: string) {
  const live = rows.filter(row => !row.deleted_at);
  const sets = live.filter(row => row.session_id === sessionId);
  return { sets: sets.filter(row => (row.drop_index ?? 0) === 0).length,
    volume: sets.reduce((sum, row) => sum + (row.weight_kg ?? 0) * (row.reps ?? 0), 0),
    records: sets.filter(row => detectPr(live.filter(previous => previous.exercise_id === row.exercise_id &&
      previous.completed_at < row.completed_at), row)).length };
}
