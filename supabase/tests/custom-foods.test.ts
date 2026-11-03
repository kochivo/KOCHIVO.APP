import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';
let db: PGlite;
let captain: string;
let player: string;
let other: string;
let food: string;
const as = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const insert = (user: string, owner = user) => as(user, `insert into public.foods
  (owner_id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source)
  values ($1, 'Soup', 100, 5, 10, 2, 'captain') returning id`, [owner]);
const upload = (user: string, name: string) => as(user,
  `insert into storage.objects (bucket_id, name) values ('captain-food-photos', $1) returning name`, [name]);
beforeAll(async () => {
  db = await createTestDb();
  await db.exec('grant delete on storage.objects to authenticated');
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });
it('lets a captain create food that their player can read', async () => {
  const row = (await insert(captain)).rows[0] as { id: string };
  food = row.id;
  expect((await as(player, 'select id from public.foods where id = $1', [food])).rows).toHaveLength(1);
});
it('hides the food from another captain including update and delete', async () => {
  expect((await as(other, 'select id from public.foods where id = $1', [food])).rows).toEqual([]);
  expect((await as(other, `update public.foods set name_ar = 'Changed' where id = $1 returning id`, [food])).rows).toEqual([]);
  expect((await as(other, 'delete from public.foods where id = $1 returning id', [food])).rows).toEqual([]);
  await expect(insert(other, captain)).rejects.toThrow(/row-level security/);
});
it('allows only captains to upload into their own folder and delete their own files', async () => {
  expect((await upload(captain, `${captain}/a.jpg`)).rows).toHaveLength(1);
  await expect(upload(other, `${captain}/b.jpg`)).rejects.toThrow(/row-level security/);
  await expect(upload(captain, captain)).rejects.toThrow(/row-level security/);
  await expect(upload(player, `${player}/a.jpg`)).rejects.toThrow(/row-level security/);
  expect((await as(other, 'delete from storage.objects where name = $1 returning name', [`${captain}/a.jpg`])).rows).toEqual([]);
  expect((await as(captain, 'delete from storage.objects where name = $1 returning name', [`${captain}/a.jpg`])).rows).toHaveLength(1);
});
it('rejects a custom photo outside the owner folder', async () => {
  await expect(as(captain, `update public.foods set photo_path = $1 where id = $2`,
    [`captain-food-photos/${other}/a.jpg`, food])).rejects.toThrow(/check constraint/);
});
it('rejects food creation by a player', async () => {
  await expect(insert(player)).rejects.toThrow(/row-level security/);
});
it('lets a captain edit and delete their own food', async () => {
  const row = (await insert(captain)).rows[0] as { id: string };
  expect((await as(captain, `update public.foods set name_ar = 'Edited' where id = $1 returning name_ar`, [row.id])).rows)
    .toEqual([{ name_ar: 'Edited' }]);
  expect((await as(captain, 'delete from public.foods where id = $1 returning id', [row.id])).rows).toHaveLength(1);
});
it('preserves food used in a meal plan with a foreign key error', async () => {
  const plan = await db.query<{ id: string }>(`insert into public.nutrition_plans (captain_id, title, is_template) values ($1, 'Plan', true) returning id`, [captain]);
  const meal = await db.query<{ id: string }>(`insert into public.meals (plan_id, name, position) values ($1, 'Lunch', 0) returning id`, [plan.rows[0]?.id]);
  await db.query(`insert into public.meal_items (meal_id, food_id, grams, position) values ($1, $2, 100, 0)`, [meal.rows[0]?.id, food]);
  await expect(as(captain, 'delete from public.foods where id = $1', [food])).rejects.toMatchObject({ code: '23503' });
});
it('blocks a suspended captain from food and storage writes', async () => {
  await upload(captain, `${captain}/before-suspension.jpg`);
  await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
  await expect(insert(captain)).rejects.toThrow(/row-level security|account suspended/);
  await expect(upload(captain, `${captain}/s.jpg`)).rejects.toThrow(/row-level security|account suspended/);
  expect((await as(captain, 'delete from storage.objects where name = $1 returning name', [`${captain}/before-suspension.jpg`])).rows).toEqual([]);
});
