import { expect, it } from 'vitest';
import { KochivoDB, stableId } from '@/core/offline';
import { flushOutbox } from '@/core/offline/sync';
import { addWater } from './data/add-water';

it('serializes rapid water taps with existing morning answers and syncs the latest total', async () => {
  const db = new KochivoDB('v6-water');
  const now = Date.parse('2026-11-12T22:30:00Z');
  try {
    const id = await stableId('daily_check', 'player', '2026-11-13');
    await db.daily_checks.put({ id, log_date: '2026-11-13', sleep_hours: 7, soreness: 2, water_ml: 1000,
      client_updated_at: new Date(now).toISOString(), deleted_at: null });
    await Promise.all([addWater(db, 'player', now, 'Africa/Cairo'), addWater(db, 'player', now, 'Africa/Cairo')]);
    expect(await db.daily_checks.get(id)).toMatchObject({ sleep_hours: 7, soreness: 2, water_ml: 1500 });
    expect(await db.outbox.count()).toBe(1);
    expect(await flushOutbox(db, async (table, rows) => {
      expect(table).toBe('daily_checks');
      expect(rows).toMatchObject([{ water_ml: 1500, log_date: '2026-11-13' }]);
    }, now + 10)).toEqual({ sent: 1, failed: 0 });
  } finally { await db.delete(); }
});
