import type { KochivoDB, SetLogRow } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export function mergeHistory(local: SetLogRow[], remote: SetLogRow[]): SetLogRow[] {
  const rows = new Map(remote.map(row => [row.id, row]));
  for (const row of local) {
    const other = rows.get(row.id);
    if (!other || Date.parse(row.client_updated_at) >= Date.parse(other.client_updated_at)) rows.set(row.id, row);
  }
  return [...rows.values()].filter(row => !row.deleted_at);
}

export async function remotePrHistory(db: KochivoDB, exerciseId?: string): Promise<SetLogRow[]> {
  if (!db.userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return [];
  const client = await loadSupabaseBrowser();
  const rows: SetLogRow[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from('set_logs')
      .select('id,session_id,exercise_id,program_exercise_id,set_index,drop_index,weight_kg,reps,completed_at,client_updated_at,deleted_at')
      .eq('player_id', db.userId);
    if (exerciseId) query = query.eq('exercise_id', exerciseId);
    const { data, error } = await query.order('id').range(offset, offset + 499);
    if (error) throw error;
    // Deleted plan references remain valid history; this field is not used by PR comparisons.
    rows.push(...data.map(row => ({ ...row, program_exercise_id: row.program_exercise_id ?? '' })));
    if (data.length < 500) return rows;
  }
}

export async function prHistory(db: KochivoDB, exerciseId: string, excludeId: string) {
  const remote = await remotePrHistory(db, exerciseId);
  const local = await db.set_logs.filter(row => row.exercise_id === exerciseId).toArray();
  return mergeHistory(local, remote).filter(row => row.id !== excludeId && (row.drop_index ?? 0) === 0);
}
