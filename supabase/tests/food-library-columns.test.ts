import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { FOOD_COLUMNS } from '@/features/meal-plans/data/food-library-columns';
import { createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('selects only food columns the migrations create', async () => {
  const result = await db.query<{ column_name: string }>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'foods'`);
  const existing = new Set(result.rows.map(row => row.column_name));
  expect(FOOD_COLUMNS.filter(column => !existing.has(column))).toEqual([]);
});

it('runs the library columns and embeds against the schema', async () => {
  await expect(db.query(`select ${FOOD_COLUMNS.join(',')} from public.foods limit 0`)).resolves.toBeDefined();
  await expect(db.query('select 1 from public.meal_item_alternatives limit 0')).resolves.toBeDefined();
});
