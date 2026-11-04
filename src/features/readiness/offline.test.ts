import { expect, it } from 'vitest';
import { KochivoDB, stableId } from '@/core/offline';
import { saveDailyCheck } from './data/daily-checks';

it('increments one stable row and advances its timestamp, even for simultaneous taps', async () => {
  const db = new KochivoDB('readiness-water-test');
  const now = Date.parse('2026-11-04T08:00:00Z');
  try {
    await Promise.all([saveDailyCheck(db, 'player', {}, 250, now), saveDailyCheck(db, 'player', {}, 250, now)]);
    const rows = await db.daily_checks.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: await stableId('daily_check', 'player', '2026-11-04'), water_ml: 500,
      client_updated_at: new Date(now + 1).toISOString() });
    expect(await db.outbox.count()).toBe(1);
    await saveDailyCheck(db, 'player', { sleep_hours: 8 }, 0, now + 2);
    expect((await db.daily_checks.toArray())[0]).toMatchObject({ water_ml: 500, sleep_hours: 8 });
  } finally { await db.delete(); }
});
