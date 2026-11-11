import { expect, it } from 'vitest';
import { KochivoDB, flushOutbox } from '@/core/offline';
import { localDate } from '@/lib/dates';
import { setMealEaten } from './data/log-meal';

it('preserves the action log date across a later sync in another timezone', async () => {
  const now = Date.parse('2026-01-01T21:30:00Z');
  const db = new KochivoDB('meal-timezone');
  try {
    await setMealEaten(db, { mealId: 'meal', eaten: true, swaps: {}, logDate: localDate(new Date(now), 'Asia/Dubai') }, now);
    await flushOutbox(db, async (_table, rows) => { expect(rows[0]).toMatchObject({ log_date: '2026-01-02' }); }, now + 86_400_000);
    expect((await db.meal_logs.toArray())[0]?.log_date).toBe('2026-01-02');
  } finally { await db.delete(); }
});
