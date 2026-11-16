import { expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import type { MealLogRow, NutritionSnapshot } from '@/core/offline';
import { mergeMealLogs } from './data/refresh-meal-logs';
import { setMealEaten } from './data/log-meal';
import { eatenTotals } from './macros';

const now = Date.parse('2026-11-16T10:00:00Z'), today = '2026-11-16';
it('hydrates a second device with swaps, merges corrections and preserves newer local rows and pending unticks', async () => {
  const db = new KochivoDB('meal-log-refresh');
  const row: MealLogRow = { id: 'remote', meal_id: 'meal', log_date: today, completed_at: new Date(now).toISOString(),
    deleted_at: null, client_updated_at: new Date(now).toISOString(), swaps: { item: 'alt' } };
  const food = { name: 'Food', grams: 100, photo_path: null, per100g: { kcal: 100, protein: 10, carbs: 5, fat: 2 } };
  const snapshot: NutritionSnapshot = { id: 'active', player_id: 'p', plan_id: 'plan', title: 'Plan',
    targets: { kcal: null, protein: null, carbs: null, fat: null }, meals: [{ id: 'meal', name: 'Meal', position: 0,
      items: [{ ...food, id: 'item', position: 0, alternatives: [{ ...food, id: 'alt', grams: 200 }] }] }] };
  try {
    await mergeMealLogs(db, [row]);
    expect(eatenTotals(snapshot, await db.meal_logs.toArray(), today).kcal).toBe(200);
    await mergeMealLogs(db, [{ ...row, client_updated_at: new Date(now - 1).toISOString(), swaps: {} }]);
    expect((await db.meal_logs.get(row.id))?.swaps).toEqual({ item: 'alt' });
    await mergeMealLogs(db, [{ ...row, client_updated_at: new Date(now + 1).toISOString(), completed_at: null }]);
    expect((await db.meal_logs.get(row.id))?.completed_at).toBeNull();
    await setMealEaten(db, { mealId: 'pending', logDate: today, eaten: false, swaps: {} }, now);
    const pending = (await db.meal_logs.toArray()).find(log => log.meal_id === 'pending');
    if (!pending) throw new Error('Missing fixture');
    await mergeMealLogs(db, [{ ...pending, completed_at: row.completed_at, client_updated_at: new Date(now + 2).toISOString() }]);
    expect(await db.meal_logs.get(pending.id)).toEqual(pending);
    expect(await db.outbox.count()).toBe(1);
  } finally { await db.delete(); }
});
