import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, other: string, original: string, version: string;
const as = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const insert = (user: string, replaces: string | null) => as(user, `insert into public.foods
  (owner_id, replaces_id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source)
  values ($1, $2, 'Food', 150, 10, 10, 5, 'captain') returning id`, [user, replaces]);
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  const row = await db.query<{ id: string }>(`insert into public.foods
    (name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source)
    values ('Catalog', 100, 5, 10, 2, 'captain') returning id`);
  original = row.rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });
it('keeps the trigger function off the public API', async () => {
  const result = await db.query<{ anon: boolean; authenticated: boolean }>(`select
    has_function_privilege('anon', 'public.check_food_replacement()', 'EXECUTE') as anon,
    has_function_privilege('authenticated', 'public.check_food_replacement()', 'EXECUTE') as authenticated`);
  expect(result.rows).toEqual([{ anon: false, authenticated: false }]);
});
it('creates a captain version readable by their player without changing the catalog', async () => {
  const result = await insert(captain, original);
  version = (result.rows[0] as { id: string }).id;
  expect((await as(player, 'select id from public.foods where id = $1', [version])).rows).toHaveLength(1);
  expect((await as(other, 'select id from public.foods where id = $1', [version])).rows).toEqual([]);
  expect((await as(other, 'select kcal_per_100g from public.foods where id = $1', [original])).rows)
    .toEqual([{ kcal_per_100g: '100.0' }]);
});
it('rejects references to another captain’s food and to an owned food', async () => {
  const own = (await insert(other, null)).rows[0] as { id: string };
  await expect(insert(captain, own.id)).rejects.toMatchObject({ code: '23514' });
  await expect(insert(captain, version)).rejects.toMatchObject({ code: '23514' });
});
it('cannot update the catalog and rejects a second live version', async () => {
  expect((await as(captain, 'update public.foods set kcal_per_100g = 200 where id = $1 returning id', [original])).rows).toEqual([]);
  await expect(insert(captain, original)).rejects.toMatchObject({ code: '23505' });
  expect((await insert(other, original)).rows).toHaveLength(1);
});
it('allows editing the same version and restoring by archiving a referenced version', async () => {
  await as(captain, 'update public.foods set protein_per_100g = 20 where id = $1', [version]);
  const plan = await db.query<{ id: string }>(`insert into public.nutrition_plans (captain_id, title, is_template) values ($1, 'Plan', true) returning id`, [captain]);
  const meal = await db.query<{ id: string }>(`insert into public.meals (plan_id, name, position) values ($1, 'Lunch', 0) returning id`, [plan.rows[0]?.id]);
  await db.query('insert into public.meal_items (meal_id, food_id, grams, position) values ($1, $2, 100, 0)', [meal.rows[0]?.id, version]);
  await expect(as(captain, 'delete from public.foods where id = $1', [version])).rejects.toMatchObject({ code: '23503' });
  await as(captain, `update public.foods set archived_at = '2026-11-15T12:00:00Z' where id = $1`, [version]);
  expect((await insert(captain, original)).rows).toHaveLength(1);
  expect((await db.query('select food_id from public.meal_items where meal_id = $1', [meal.rows[0]?.id])).rows).toEqual([{ food_id: version }]);
});
