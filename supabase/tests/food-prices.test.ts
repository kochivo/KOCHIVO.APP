import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let captain: string, player: string, other: string, admin: string;
const food = '00000000-0000-4000-8000-000000000312';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
  await db.query(`insert into foods(id,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values ($1,'Rice',100,3,20,0)`, [food]);
});
afterAll(async () => { await db?.close(); });
const insert = (user: string, owner: string | null, price = 30) => asUser(db, user, tx =>
  tx.query('insert into food_prices(food_id,owner_id,unit,unit_grams,price_egp) values($1,$2,\'kg\',1000,$3)', [food, owner, price]));

it('allows only admins to create platform prices', async () => {
  await expect(insert(captain, null)).rejects.toThrow();
  await insert(admin, null);
  expect((await asUser(db, player, tx => tx.query('select price_egp from food_prices where owner_id is null'))).rows).toHaveLength(1);
});
it('limits captain writes and team reads to the owning captain', async () => {
  await expect(insert(player, player)).rejects.toThrow();
  await expect(insert(captain, other)).rejects.toThrow();
  await insert(captain, captain);
  expect((await asUser(db, player, tx => tx.query('select * from food_prices where owner_id=$1', [captain]))).rows).toHaveLength(1);
  expect((await asUser(db, other, tx => tx.query('select * from food_prices where owner_id=$1', [captain]))).rows).toHaveLength(0);
  await expect(asUser(db, captain, tx => tx.query('update food_prices set owner_id=null where owner_id=$1', [captain]))).rejects.toThrow();
  expect((await asUser(db, other, tx => tx.query('delete from food_prices where owner_id=$1 returning *', [captain]))).rows).toHaveLength(0);
});
it('enforces unique platform prices and valid purchase units', async () => {
  await expect(insert(admin, null)).rejects.toThrow();
  await expect(asUser(db, captain, tx => tx.query('update food_prices set unit_grams=0 where owner_id=$1', [captain]))).rejects.toThrow();
  await expect(asUser(db, captain, tx => tx.query('update food_prices set price_egp=0 where owner_id=$1', [captain]))).rejects.toThrow();
});
it('denies suspended callers even platform reads', async () => {
  await db.query('update profiles set suspended_at=now() where id=$1', [other]);
  expect((await asUser(db, other, tx => tx.query('select * from food_prices'))).rows).toEqual([]);
});
