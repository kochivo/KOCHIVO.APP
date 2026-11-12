import { expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { saveDailyCheck } from './data/daily-checks';

it('restores both morning answers and their queued write after the local database is reopened offline', async () => {
  const name = 't196-morning-reopen';
  const now = Date.parse('2026-11-12T08:00:00Z');
  const first = new KochivoDB(name);
  await saveDailyCheck(first, 'player', { sleep_hours: 7 }, 0, now, 'Africa/Cairo');
  await saveDailyCheck(first, 'player', { soreness: 2 }, 0, now + 1, 'Africa/Cairo');
  first.close();
  const reopened = new KochivoDB(name);
  try {
    expect(await reopened.daily_checks.toArray()).toMatchObject([{ sleep_hours: 7, soreness: 2, log_date: '2026-11-12' }]);
    expect(await reopened.outbox.count()).toBe(1);
  } finally { await reopened.delete(); }
});
