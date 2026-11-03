import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDb } from './harness';

let db: PGlite;

// Building the database lives in a hook: its timeout is longer, and a cold PGlite start can pass 5s.
beforeAll(async () => {
  db = await createTestDb();
});

afterAll(async () => {
  await db.close();
});

it('rejects duplicate global food seed keys while allowing two null keys', async () => {
  const insert = (seedKey: string | null) => db.query(
    `insert into public.foods
      (owner_id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, seed_key)
      values (null, 'أرز', 130, 2.7, 28.2, 0.3, $1)`,
    [seedKey],
  );
  await insert('rice');
  await expect(insert('rice')).rejects.toMatchObject({ code: '23505' });
  await insert(null);
  await insert(null);
  const { rows } = await db.query(`select seed_key from public.foods where seed_key is null`);
  expect(rows).toHaveLength(2);
});
