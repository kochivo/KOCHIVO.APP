import type { KochivoDB } from '@/core/offline';

export async function prHistory(db: KochivoDB, exerciseId: string, excludeId: string) {
  return db.set_logs.filter((row) => row.exercise_id === exerciseId &&
    row.id !== excludeId && row.deleted_at === null && (row.drop_index ?? 0) === 0).toArray();
}
