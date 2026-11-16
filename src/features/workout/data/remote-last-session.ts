import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { latestSession } from './last-performance';
import type { LastSession, PastSet } from './last-performance';

/**
 * A new phone has no local history yet, so read the player's own synced sets (RLS limits the rows).
 * Thirty rows cover the newest workout even with many sets of the same exercise.
 */
export async function remoteLastSession(client: SupabaseClient<AppDatabase>, input: {
  playerId: string; exerciseId: string; beforeSessionId: string; painSince?: string; skipDate?: (date: string) => boolean;
}): Promise<LastSession | null> {
  const { playerId, exerciseId, beforeSessionId } = input;
  if (input.skipDate) {
    const eligible: PastSet[] = [];
    for (let offset = 0; ; offset += 100) {
      const base = client.from('set_logs').select('id,session_id,set_index,weight_kg,reps,completed_at,workout_sessions!inner(training_date)')
        .eq('player_id', playerId).eq('exercise_id', exerciseId).eq('drop_index', 0).is('deleted_at', null);
      const { data, error } = await (beforeSessionId ? base.neq('session_id', beforeSessionId) : base)
        .order('completed_at', { ascending: false }).order('id').range(offset, offset + 99);
      if (error) throw new Error('Loading past sets failed');
      eligible.push(...data.filter(row => !input.skipDate?.(row.workout_sessions.training_date)));
      // A page can end midway through the baseline workout; keep reading until it is complete.
      if (data.length < 100 || eligible.some(row => row.session_id !== eligible[0]?.session_id))
        return latestSession(eligible, input.painSince);
    }
  }
  // Captains can read every player's sets, so the player filter is not optional.
  const base = client.from('set_logs').select('id,session_id,set_index,weight_kg,reps,completed_at')
    .eq('player_id', playerId).eq('exercise_id', exerciseId).eq('drop_index', 0).is('deleted_at', null);
  const { data, error } = await (beforeSessionId ? base.neq('session_id', beforeSessionId) : base)
    .order('completed_at', { ascending: false }).limit(30);
  if (error) throw new Error('Loading past sets failed');
  return latestSession(data ?? [], input.painSince);
}
