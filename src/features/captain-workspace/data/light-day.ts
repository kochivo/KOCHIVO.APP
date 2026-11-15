import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function loadLightDay(playerId: string, date: string): Promise<boolean> {
  const client = await loadSupabaseBrowser();
  const result = await client.rpc('player_light_day', { p_player: playerId, p_date: date });
  if (result.error) throw new Error('light day unavailable');
  return result.data === true;
}
