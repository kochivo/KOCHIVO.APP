import { describe, expect, it } from 'vitest';
import Dexie from 'dexie';
import { KochivoDB, stableId, type MealLogRow } from '@/core/offline';
import { mapNutritionSnapshot, type NutritionResponse } from './data/nutrition-snapshot';
import { refreshNutrition } from './data/refresh-nutrition';
import { setMealEaten } from './data/log-meal';
import { eatenTotals, itemMacros, targetsOf } from './macros';

const food = { name_ar: 'رز', photo_path: 'rice.jpg', kcal_per_100g: 100,
  protein_per_100g: 2, carbs_per_100g: 20, fat_per_100g: 1 };
const item = { id: 'item', position: 2, grams: 200, foods: food,
  meal_item_alternatives: [{ id: 'alt', grams: 100,
    foods: { ...food, name_ar: 'مكرونة', kcal_per_100g: 200, protein_per_100g: 6 } }] };
const response: NutritionResponse = { id: 'plan', title: 'نظام', target_kcal: 2900,
  target_protein: null, target_carbs: null, target_fat: 0,
  meals: [{ id: 'later', position: 2, name: 'العشا', meal_items: [] },
    { id: 'meal', position: 1, name: 'الغدا', meal_items: [item, { ...item, id: 'first', position: 1 }] }] };
const snapshot = mapNutritionSnapshot(response, 'player');
const meal = snapshot.meals[0];
if (!meal) throw new Error('Missing fixture meal');
const original = meal.items[1];
if (!original) throw new Error('Missing fixture item');
const today = '2026-11-03';
const now = Date.parse('2026-11-03T10:00:00Z');
const log: MealLogRow = { id: 'log', meal_id: 'meal', log_date: today, swaps: { item: 'alt' },
  completed_at: new Date(now).toISOString(), client_updated_at: new Date(now).toISOString(), deleted_at: null };

describe('nutrition snapshot and macros', () => {
  it('sorts meals and items without changing the response', () => {
    expect(snapshot.meals.map((entry) => entry.id)).toEqual(['meal', 'later']);
    expect(meal.items.map((entry) => entry.id)).toEqual(['first', 'item']);
    expect(response.meals[0]?.id).toBe('later');
    expect(response.meals[1]?.meal_items[0]?.id).toBe('item');
  });
  it('uses the original or the chosen alternative with precomputed grams', () => {
    expect(itemMacros(original)).toEqual({ kcal: 200, protein: 4, carbs: 40, fat: 2 });
    expect(itemMacros(original, 'alt')).toEqual({ kcal: 200, protein: 6, carbs: 20, fat: 1 });
    expect(itemMacros(original, 'removed')).toEqual(itemMacros(original));
  });
  it('totals eaten meals with swaps and ignores other dates, deleted and uneaten logs', () => {
    expect(eatenTotals(snapshot, [log], today)).toEqual({ kcal: 400, protein: 10, carbs: 60, fat: 3 });
    expect(eatenTotals(snapshot, [{ ...log, completed_at: null }], today).kcal).toBe(0);
    expect(eatenTotals(snapshot, [{ ...log, log_date: '2026-11-02' }], today).kcal).toBe(0);
    expect(eatenTotals(snapshot, [{ ...log, deleted_at: log.completed_at }], today).kcal).toBe(0);
  });
  it('falls back per nullable target and preserves zero targets', () => {
    expect(targetsOf(snapshot)).toEqual({ kcal: 2900, protein: 8, carbs: 80, fat: 0 });
    expect(targetsOf({ ...snapshot, meals: [] }).protein).toBe(0);
  });
  it('keeps eaten macros after a captain edits the meal', () => {
    const saved = { ...log, eaten_macros: { kcal: 400, protein: 10, carbs: 60, fat: 3 } };
    const edited = { ...snapshot, meals: snapshot.meals.map(entry => ({ ...entry, items: [] })) };
    expect(eatenTotals(edited, [saved], today)).toEqual(saved.eaten_macros);
  });
});

it('keeps one row and one outbox entry across toggles and eaten swaps', async () => {
  const db = new KochivoDB('nutrition-log-test');
  try {
    const input = { mealId: 'meal', meal, logDate: today, swaps: {} };
    await setMealEaten(db, { ...input, eaten: true }, now);
    await setMealEaten(db, { ...input, eaten: true, swaps: { item: 'alt' } }, now + 1);
    expect(await db.meal_logs.toArray()).toMatchObject([{ swaps: { item: 'alt' } }]);
    expect((await db.meal_logs.toArray())[0]).toHaveProperty('eaten_macros', { kcal: 400, protein: 10, carbs: 60, fat: 3 });
    await setMealEaten(db, { ...input, eaten: false }, now + 2);
    expect(await db.meal_logs.toArray()).toEqual([{ id: await stableId('meal', 'meal', today), meal_id: 'meal',
      log_date: today, swaps: {}, completed_at: null, deleted_at: null, eaten_macros: null,
      client_updated_at: new Date(now + 2).toISOString() }]);
    expect(await db.outbox.count()).toBe(1);
    await setMealEaten(db, { ...input, meal: { ...meal, items: [] }, eaten: true }, now + 3);
    expect((await db.meal_logs.toArray())[0]?.eaten_macros).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  } finally { await db.delete(); }
});

it('upgrades a version 8 database without changing legacy logs or pending writes', async () => {
  const old = new Dexie('nutrition-upgrade');
  old.version(8).stores({ meal_logs: 'id, &[meal_id+log_date]', outbox: '++id, &[table+row_id], next_attempt_at' });
  await old.table('meal_logs').put(log);
  const pending = { table: 'meal_logs', row_id: log.id, revision: 1, enqueued_at: now, attempts: 0, next_attempt_at: now };
  await old.table('outbox').add(pending);
  old.close();
  const db = new KochivoDB('nutrition-upgrade');
  try {
    expect(await db.meal_logs.get(log.id)).toEqual(log);
    expect(await db.outbox.toArray()).toMatchObject([pending]);
    expect(eatenTotals(snapshot, await db.meal_logs.toArray(), today).kcal).toBe(400);
  } finally { await db.delete(); }
});

it('keeps cached nutrition offline or on errors, replaces it and clears a null plan', async () => {
  const db = new KochivoDB('nutrition-refresh-test');
  try {
    await db.nutrition_snapshot.put(snapshot);
    const fail = async () => { throw new Error('network'); };
    expect(await refreshNutrition({ db, online: false, fetch: fail })).toBe('offline');
    expect(await refreshNutrition({ db, online: true, fetch: fail })).toBe('error');
    expect(await db.nutrition_snapshot.get('active')).toEqual(snapshot);
    const updated = { ...snapshot, title: 'جديد' };
    expect(await refreshNutrition({ db, online: true, fetch: async () => updated })).toBe('ready');
    expect(await db.nutrition_snapshot.get('active')).toEqual(updated);
    expect(await refreshNutrition({ db, online: true, fetch: async () => null })).toBe('empty');
    expect(await db.nutrition_snapshot.get('active')).toBeUndefined();
  } finally { await db.delete(); }
});
