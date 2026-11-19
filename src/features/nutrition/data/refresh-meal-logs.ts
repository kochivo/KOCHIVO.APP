import { localDb, type KochivoDB, type MealLogRow } from '@/core/offline';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { eatenMacros } from '../macros';

export async function mergeMealLogs(db: KochivoDB, logs: MealLogRow[]) {
  await db.transaction('rw', db.meal_logs, db.outbox, async () => {
    for (const log of logs) {
      const pending = await db.outbox.where('[table+row_id]').equals(['meal_logs', log.id]).first();
      const current = await db.meal_logs.get(log.id);
      if (!pending && (!current || Date.parse(current.client_updated_at) < Date.parse(log.client_updated_at))) {
        await db.meal_logs.put(log);
      }
    }
  });
}

export async function refreshMealLogs(day: string, db: KochivoDB = localDb()) {
  if (!day || !navigator.onLine) return;
  const client = await loadSupabaseBrowser();
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw error ?? new Error('Missing session');
  if (db.userId && db.userId !== auth.user.id) throw new Error('Local account changed');
  const logs: MealLogRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client.from('meal_logs').select('*').eq('player_id', auth.user.id)
      .eq('log_date', day).order('id').range(offset, offset + 499);
    if (result.error) throw result.error;
    for (const row of result.data) {
      logs.push({ id: row.id, meal_id: row.meal_id, log_date: row.log_date, completed_at: row.completed_at,
        deleted_at: row.deleted_at, client_updated_at: row.client_updated_at, eaten_macros: eatenMacros(row.eaten_macros),
        swaps: Object.fromEntries(Object.entries(row.swaps ?? {}).filter((pair): pair is [string, string] => typeof pair[1] === 'string')) });
    }
    if (result.data.length < 500) break;
  }
  await mergeMealLogs(db, logs);
}
