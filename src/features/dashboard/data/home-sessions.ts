import 'server-only';
import type { supabaseServer } from '@/core/supabase/server';

type Client = Awaited<ReturnType<typeof supabaseServer>>;
export async function loadHomeSessions(client: Client, from: string, until: string) {
  const sessions: { player_id: string; training_date: string; program_day_id: string | null }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client.from('workout_sessions').select('player_id,training_date,program_day_id')
      .not('completed_at', 'is', null).gte('training_date', from).lte('training_date', until)
      .order('id').range(offset, offset + 999);
    if (result.error) throw result.error;
    sessions.push(...result.data);
    if (result.data.length < 1000) return sessions;
  }
}
