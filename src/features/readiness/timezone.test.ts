import { expect, it } from 'vitest';
import { KochivoDB, flushOutbox } from '@/core/offline';
import { saveDailyCheck } from './data/daily-checks';

it('keeps the action day when a queued check syncs after travel', async () => {
  const db = new KochivoDB('readiness-timezone');
  const now = Date.parse('2026-01-01T21:30:00Z');
  try {
    const row = await saveDailyCheck(db, 'player', { sleep_hours: 8 }, 0, now, 'Asia/Dubai');
    expect(row.log_date).toBe('2026-01-02');
    await flushOutbox(db, async (_table, rows) => {
      expect(rows[0]).toMatchObject({ log_date: '2026-01-02' });
    }, now + 86_400_000);
    expect((await db.daily_checks.get(row.id))?.log_date).toBe('2026-01-02');
  } finally { await db.delete(); }
});
