import { saveAndQueue, stableId } from '@/core/offline';
import type { KochivoDB } from '@/core/offline';
import type { DailyCheckRow } from '@/core/offline/tables';
import { localDate } from '@/lib/dates';

export async function addWater(db: KochivoDB, playerId: string, now: number, timezone: string) {
  const date = localDate(new Date(now), timezone);
  const id = await stableId('daily_check', playerId, date);
  return db.transaction('rw', db.daily_checks, db.outbox, async () => {
    const previous = await db.daily_checks.get(id);
    const timestamp = Math.max(now, previous ? Date.parse(previous.client_updated_at) + 1 : now);
    const row: DailyCheckRow = { id, log_date: date, sleep_hours: null, soreness: null, ...previous,
      water_ml: Math.min(10000, (previous?.deleted_at ? 0 : previous?.water_ml ?? 0) + 250),
      client_updated_at: new Date(timestamp).toISOString(), deleted_at: null };
    await saveAndQueue(db, 'daily_checks', row, now);
    return row;
  });
}
