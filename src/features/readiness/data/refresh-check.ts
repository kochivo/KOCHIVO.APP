import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { stableId } from '@/core/offline/ids';
import type { KochivoDB } from '@/core/offline';

export async function refreshCheck(db: KochivoDB, playerId: string, date: string) {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.from('daily_checks').select('*').eq('player_id', playerId).eq('log_date', date).maybeSingle();
  if (error) throw error;
  if (!data) return;
  const id = await stableId('daily_check', playerId, date);
  await db.transaction('rw', db.daily_checks, async () => {
    const local = await db.daily_checks.get(id);
    if (local && Date.parse(local.client_updated_at) >= Date.parse(data.client_updated_at)) return;
    await db.daily_checks.put({ id, log_date: date, sleep_hours: data.sleep_hours, soreness: data.soreness,
      water_ml: data.water_ml, deleted_at: data.deleted_at, client_updated_at: data.client_updated_at });
  });
}
