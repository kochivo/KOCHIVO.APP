import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';
let db: PGlite;
let captain: string, other: string, player: string, food: string;
beforeAll(async () => {
  db = await createTestDb();
  captain = await createUser(db, 'captain'); other = await createUser(db, 'captain'); player = await createUser(db, 'player');
  const result = await db.query<{ id: string }>(`insert into public.foods (name_ar, source, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ('Food', 'captain', 100, 10, 10, 2) returning id`);
  const row = result.rows[0];
  if (!row) throw new Error('Missing fixture food');
  food = row.id;
});
afterAll(async () => { await db?.close(); });
it('persists favorites for their captain only', async () => {
  await asUser(db, captain, tx => tx.query('insert into public.food_favorites(captain_id, food_id) values ($1,$2)', [captain, food]));
  expect((await asUser(db, captain, tx => tx.query('select * from public.food_favorites'))).rows).toHaveLength(1);
  expect((await asUser(db, other, tx => tx.query('select * from public.food_favorites'))).rows).toHaveLength(0);
  await expect(asUser(db, other, tx => tx.query('insert into public.food_favorites(captain_id, food_id) values ($1,$2)', [captain, food]))).rejects.toThrow();
  await asUser(db, other, tx => tx.query('delete from public.food_favorites'));
  expect((await asUser(db, captain, tx => tx.query('select * from public.food_favorites'))).rows).toHaveLength(1);
});
it('rejects player writes and suspended captains', async () => {
  await expect(asUser(db, player, tx => tx.query('insert into public.food_favorites(captain_id, food_id) values ($1,$2)', [player, food]))).rejects.toThrow();
  await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
  expect((await asUser(db, captain, tx => tx.query('select * from public.food_favorites'))).rows).toHaveLength(0);
});
