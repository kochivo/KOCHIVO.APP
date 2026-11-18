import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { DEFAULT_TIMEZONE, localDate } from '@/lib/dates';

export async function loadWeeklyPoints(now = new Date(), timezone = DEFAULT_TIMEZONE): Promise<number | undefined> {
  const today = localDate(now, timezone);
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 27);
  const db = await loadSupabaseBrowser();
  const { data, error } = await db.from('points_log').select('points').eq('status', 'counted')
    .gte('earned_on', localDate(start, 'UTC')).lte('earned_on', today);
  if (error) throw error;
  return data?.length ? data.reduce((sum, row) => sum + row.points, 0) / 4 : undefined;
}
