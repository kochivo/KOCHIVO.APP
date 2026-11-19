import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

export async function hasPendingStartForm(db: SupabaseClient<AppDatabase>, player: string, captain?: string) {
  if (captain === undefined) {
    const result = await db.rpc('my_captain_id');
    if (result.error) throw result.error;
    if (!result.data) return false;
    captain = result.data;
  }
  const { data, error } = await db.from('form_requests').select('id').eq('player_id', player)
    .eq('captain_id', captain).eq('blocks_access', true).is('answered_at', null).limit(1);
  if (error) throw error;
  return data.length > 0;
}
