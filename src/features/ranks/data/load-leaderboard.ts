import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { LeaderboardRow } from '../types';

export async function loadLeaderboard(month?: string): Promise<LeaderboardRow[]> {
  const { leaderboard } = await import('./leaderboard-schema');
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('team_leaderboard', month ? { p_month: month } : {});
  if (error) throw error;
  return leaderboard.parse(data);
}
