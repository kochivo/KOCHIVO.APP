import { saveAndQueue, stableId, type KochivoDB } from '@/core/offline';
import { localDate } from '@/lib/dates';

export async function setSupplementTaken(db: KochivoDB, supplementId: string, logDate: string, taken: boolean, now: number) {
  const id = await stableId('supplement_log', supplementId, logDate);
  const timestamp = new Date(now).toISOString();
  await saveAndQueue(db, 'supplement_logs', { id, supplement_id: supplementId, log_date: logDate,
    taken_at: taken ? timestamp : null, deleted_at: taken ? null : timestamp, client_updated_at: timestamp }, now);
}

export async function toggleTodaySupplement(db: KochivoDB, supplementId: string, now: number) {
  const day = localDate(new Date(now));
  const id = await stableId('supplement_log', supplementId, day);
  const current = await db.supplement_logs.get(id);
  await setSupplementTaken(db, supplementId, day, !current?.taken_at || !!current.deleted_at, now);
  return day;
}
