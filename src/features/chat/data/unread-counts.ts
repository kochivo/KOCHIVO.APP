import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';

export async function unreadCounts(client: SupabaseClient<AppDatabase>, captainId: string): Promise<Record<string, number>> {
  const { data, error } = await client.from('chat_messages').select('player_id').eq('captain_id', captainId)
    .neq('sender_id', captainId).is('read_at', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.player_id] = (counts[row.player_id] ?? 0) + 1;
  return counts;
}
