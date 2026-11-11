import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let other: string;
let plan: string;
let meal: string;
let global: string;
let own: string;
beforeAll(async () => {
  db = await createTestDb(async (file, instance) => {
    if (file === '0092_meal_day_types_and_units.sql') {
      await instance.exec(`insert into public.foods (name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
        values ('عيش بلدي',250,8,50,1),('بيض مسلوق',150,12,1,10),('أرز أبيض مطبوخ',130,3,28,0)`);
    }
  });
  ({ captain } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  const plans = await db.query<{ id: string }>(`insert into public.nutrition_plans (captain_id,title,is_template) values ($1,'Plan',true) returning id`, [captain]);
  plan = plans.rows[0]?.id ?? '';
  const meals = await db.query<{ id: string }>(`insert into public.meals (plan_id,name,position) values ($1,'Meal',1) returning id`, [plan]);
  meal = meals.rows[0]?.id ?? '';
  global = (await db.query<{ id: string }>(`select id from public.foods where name_ar = 'عيش بلدي'`)).rows[0]?.id ?? '';
  own = (await db.query<{ id: string }>(`insert into public.foods (owner_id,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values ($1,'Own',100,10,10,2) returning id`, [captain])).rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });
it('keeps defaults compatible and rejects invalid values', async () => {
  expect((await db.query('select day_type from public.meals where id=$1', [meal])).rows).toEqual([{ day_type: 'all' }]);
  expect((await db.query('select units from public.foods where id=$1', [own])).rows).toEqual([{ units: [] }]);
  await expect(db.query(`update public.meals set day_type='invalid' where id=$1`, [meal])).rejects.toThrow(/check constraint/);
  await expect(db.query(`update public.foods set units='{}' where id=$1`, [own])).rejects.toThrow(/check constraint/);
});
it('seeds existing global staples idempotently without touching owned food', async () => {
  const before = await db.query('select id,units from public.foods order by id');
  const migration = readFileSync(new URL('../migrations/0092_meal_day_types_and_units.sql', import.meta.url), 'utf8');
  await db.exec(migration.slice(migration.indexOf('-- Seed existing')));
  expect((await db.query('select id,units from public.foods order by id')).rows).toEqual(before.rows);
  expect((await db.query<{ units: { grams: number }[] }>('select units from public.foods where id=$1', [global])).rows[0]?.units[0]?.grams).toBe(90);
});
it('retains RLS for global and own food units', async () => {
  const update = (user: string, id: string) => asUser(db, user, tx => tx.query(`update public.foods set units='[{"key":"cup","name_ar":"كوباية","name_en":"cup","grams":200}]' where id=$1 returning id`, [id]));
  expect((await update(captain, global)).rows).toEqual([]);
  expect((await update(other, own)).rows).toEqual([]);
  expect((await update(captain, own)).rows).toHaveLength(1);
});
it('saves day types atomically through the additive overload and retains the original save', async () => {
  const draft = { title: 'Updated', targets: { kcal: 2000, protein: 100, carbs: 200, fat: 50 }, meals: [{ id: meal, name: 'Meal', items: [] }] };
  const save = (user: string, day: string) => asUser(db, user, tx => tx.query('select public.save_nutrition_plan($1,$2,$3)', [plan, draft, [{ id: meal, dayType: day }]]));
  await save(captain, 'training');
  await expect(save(captain, 'invalid')).rejects.toThrow(/check constraint/);
  await expect(save(other, 'rest')).rejects.toThrow(/owned/);
  expect((await db.query('select day_type from public.meals where id=$1', [meal])).rows).toEqual([{ day_type: 'training' }]);
  await asUser(db, captain, tx => tx.query('select public.save_nutrition_plan($1,$2)', [plan, draft]));
  expect((await db.query('select day_type from public.meals where id=$1', [meal])).rows).toEqual([{ day_type: 'training' }]);
});
