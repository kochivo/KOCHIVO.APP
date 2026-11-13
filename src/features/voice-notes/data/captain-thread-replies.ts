import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { CaptainReply } from '../player-thread';

export async function loadCaptainThreadReplies(client: SupabaseClient<AppDatabase>, playerId: string): Promise<CaptainReply[]> {
  const results = await Promise.all((['check_ins', 'form_checks', 'form_requests'] as const).map(table =>
    client.from(table).select('id,captain_reply,reviewed_at').eq('player_id', playerId)
      .not('captain_reply', 'is', null).not('reviewed_at', 'is', null)
      .order('reviewed_at', { ascending: false }).limit(30)
      .then(result => ({ ...result, table }))));
  return results.flatMap(result => {
    if (result.error) throw result.error;
    return (result.data ?? []).map(row => ({ ...row, id: `${result.table}:${row.id}` }));
  });
}
