import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { loadMyPoints } from '@/features/ranks';
import type { AccountSession } from '../player-account-stats';

export async function loadPlayerAccountSummary(playerId: string) {
  const client = await loadSupabaseBrowser();
  const sessions = async () => {
    const rows: AccountSession[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await client.from('workout_sessions').select('id,training_date,completed_at,client_updated_at')
        .eq('player_id', playerId).not('completed_at', 'is', null).order('id').range(offset, offset + 499);
      if (result.error) throw result.error;
      rows.push(...(result.data ?? []));
      if (!result.data || result.data.length < 500) return rows;
    }
  };
  const [rows, points] = await Promise.all([sessions(), loadMyPoints()]);
  return { sessions: rows, tier: points.tier };
}
