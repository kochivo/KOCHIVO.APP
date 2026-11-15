import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, other: string, plan: string, meal: string, food: string, item: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  plan = (await db.query<{ id: string }>(`insert into public.nutrition_plans (captain_id,title,is_template) values ($1,'Plan',true) returning id`, [captain])).rows[0]?.id ?? '';
  meal = (await db.query<{ id: string }>(`insert into public.meals (plan_id,name,position) values ($1,'Breakfast',1) returning id`, [plan])).rows[0]?.id ?? '';
  food = (await db.query<{ id: string }>(`insert into public.foods (name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,units)
    values ('Egg',150,12,1,10,'[{"key":"egg","name_ar":"بيضة","name_en":"egg","grams":50}]') returning id`)).rows[0]?.id ?? '';
  item = (await db.query<{ id: string }>(`insert into public.meal_items (meal_id,food_id,grams,position) values ($1,$2,150,1) returning id`, [meal, food])).rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });
function draft() { return { title: 'Plan', targets: { kcal: 2000, protein: 100, carbs: 200, fat: 60 }, meals: [{ id: meal, name: 'Breakfast', items: [{ id: item, food: { id: food }, grams: 150, alternatives: [] }] }] }; }
function save(user: string, unit: string | null = 'egg', time = '09:00') {
  return asUser(db, user, tx => tx.query('select public.save_nutrition_plan($1,$2,$3,$4)', [plan, draft(), [{ id: meal, dayType: 'training' }], [{ id: meal, timeOfDay: time, items: [{ id: item, foodId: food, unit }] }]]));
}
it('saves and reads meal time and portion unit without changing grams', async () => {
  await save(captain);
  expect((await asUser(db, captain, tx => tx.query('select time_of_day from public.meals where id=$1', [meal]))).rows).toEqual([{ time_of_day: '09:00:00' }]);
  expect((await asUser(db, captain, tx => tx.query('select unit,grams from public.meal_items where id=$1', [item]))).rows).toEqual([{ unit: 'egg', grams: '150.0' }]);
});
it('keeps ownership and validates unit keys atomically', async () => {
  await expect(save(other)).rejects.toThrow(/owned/);
  await expect(save(captain, 'invented', '10:00')).rejects.toThrow(/Unknown food unit/);
  expect((await db.query('select time_of_day from public.meals where id=$1', [meal])).rows).toEqual([{ time_of_day: '09:00:00' }]);
});
it('preserves both original signatures and old drafts', async () => {
  await asUser(db, captain, tx => tx.query('select public.save_nutrition_plan($1,$2)', [plan, draft()]));
  await asUser(db, captain, tx => tx.query('select public.save_nutrition_plan($1,$2,$3)', [plan, draft(), [{ id: meal, dayType: 'rest' }]]));
  expect((await db.query('select unit from public.meal_items where id=$1', [item])).rows).toEqual([{ unit: 'egg' }]);
  await save(captain, null);
  expect((await db.query('select unit from public.meal_items where id=$1', [item])).rows).toEqual([{ unit: null }]);
});
