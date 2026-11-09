import { z } from 'zod';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { LeaderboardRow } from '../types';

const row = z.object({
  player_id: z.uuid().nullable(), display_name: z.string(), lifetime: z.number().int().nonnegative(),
  tier: z.enum(['beginner', 'champion', 'elite', 'legend']), monthly: z.number().int().nonnegative(),
  is_crown: z.boolean(), position: z.number().int().positive(),
  adherence: z.number().int().min(0).max(100), done: z.number().int().nonnegative(),
  planned: z.number().int().min(8),
});
export async function loadLeaderboard(month?: string): Promise<LeaderboardRow[]> {
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.rpc('team_leaderboard', month ? { p_month: month } : {});
  if (error) throw error;
  return z.array(row).parse(data);
}
