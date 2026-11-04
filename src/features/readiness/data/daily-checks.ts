import { saveAndQueue, stableId } from '@/core/offline';
import type { KochivoDB } from '@/core/offline';
import type { DailyCheckRow } from '@/core/offline/tables';
import { localDate } from '@/lib/dates';

export async function readDailyCheck(db: KochivoDB, playerId: string, date: string) {
  const row = await db.daily_checks.get(await stableId('daily_check', playerId, date));
  return row?.deleted_at ? null : row ?? null;
}

export async function saveDailyCheck(db: KochivoDB, playerId: string,
  patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>, waterDelta: number, now: number) {
  const date = localDate(new Date(now));
  const id = await stableId('daily_check', playerId, date);
  // Serialize read/add/save so rapid taps and simultaneous question edits cannot lose water.
  return db.transaction('rw', db.daily_checks, db.outbox, async () => {
    const previous = await db.daily_checks.get(id);
    const timestamp = Math.max(now, previous ? Date.parse(previous.client_updated_at) + 1 : now);
    const row: DailyCheckRow = { id, log_date: date, sleep_hours: null, soreness: null,
      ...previous, ...patch, water_ml: Math.min(10000, Math.max(0, (previous?.water_ml ?? 0) + waterDelta)),
      client_updated_at: new Date(timestamp).toISOString(), deleted_at: null };
    await saveAndQueue(db, 'daily_checks', row, now);
    return row;
  });
}
