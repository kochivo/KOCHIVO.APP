import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { localDb } from '@/core/offline';

export async function readRemoteSessionIds() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];
  const id = localDb().userId;
  if (!id) return [];
  const client = await loadSupabaseBrowser();
  const ids: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('workout_sessions').select('id').eq('player_id', id)
      .not('completed_at', 'is', null).order('id').range(offset, offset + 499);
    if (error) throw error;
    ids.push(...data.map(row => row.id));
    if (data.length < 500) return ids;
  }
}
