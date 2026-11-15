import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { MedalCounts } from '../medals';

export async function loadMedals(playerId?: string): Promise<MedalCounts> {
  const { medalCounts } = await import('./medals-schema');
  const db = await loadSupabaseBrowser();
  const { data, error } = playerId ? await db.rpc('player_medals', { p_player: playerId }) : await db.rpc('my_medals');
  if (error) throw error;
  return medalCounts.parse(data?.[0]);
}
