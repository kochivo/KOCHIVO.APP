import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
beforeAll(async () => {
  db = await createTestDb(async (file, connection) => {
    if (file === '0126_food_library_sources.sql') {
      await connection.exec(`insert into public.foods (name_ar, kcal_per_100g, protein_per_100g,
        carbs_per_100g, fat_per_100g) values ('existing', 100, 10, 10, 2)`);
    }
  });
  captain = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });

it('preserves existing rows with safe defaults', async () => {
  const { rows } = await db.query(`select diet_tags, region, source_kind, source_ref, state, fiber_per_100g,
    sugar_per_100g, sodium_mg_per_100g from public.foods where name_ar = 'existing'`);
  expect(rows).toEqual([{ diet_tags: [], region: 'intl', source_kind: null, source_ref: null, state: null,
    fiber_per_100g: null, sugar_per_100g: null, sodium_mg_per_100g: null }]);
});

it('allows captain inserts without the new columns under existing RLS', async () => {
  const result = await asUser(db, captain, tx => tx.query(`insert into public.foods
    (owner_id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ($1, 'captain food', 100, 10, 10, 2) returning region, source_kind, diet_tags`, [captain]));
  expect(result.rows).toEqual([{ region: 'intl', source_kind: null, diet_tags: [] }]);
});

it.each([
  ['region', "'other'"], ['region', 'null'], ['state', "'fried'"], ['source_kind', "'guess'"],
  ['fiber_per_100g', '-1'], ['sugar_per_100g', '-1'], ['sodium_mg_per_100g', '-1'],
  ['diet_tags', "array['plant','vegan']"], ['diet_tags', 'null'], ['diet_tags', 'array[null]::text[]'],
])('rejects invalid %s = %s', async (column, value) => {
  await expect(db.exec(`insert into public.foods (name_ar, kcal_per_100g, protein_per_100g,
    carbs_per_100g, fat_per_100g, ${column}) values ('invalid', 100, 10, 10, 2, ${value})`))
    .rejects.toThrow(/constraint/);
});

it('accepts all supported regions, states and source kinds', async () => {
  for (const region of ['eg', 'gulf', 'lev', 'na', 'intl']) {
    await db.query(`insert into public.foods (name_ar, kcal_per_100g, protein_per_100g,
      carbs_per_100g, fat_per_100g, region, state, source_kind, source_ref,
      fiber_per_100g, sugar_per_100g, sodium_mg_per_100g)
      values ($1, 100, 10, 10, 2, $1, 'cooked', 'recipe', '{"ingredients":[],"cooked_yield_g":100}', 0, 0, 0)`, [region]);
  }
});

it('accepts the six allowed diet tags together and individually', async () => {
  const tags = ['meat', 'poultry', 'fish', 'dairy', 'egg', 'plant'];
  for (const dietTags of [tags, ...tags.map(tag => [tag])]) {
    const { rows } = await db.query(`insert into public.foods (name_ar, kcal_per_100g,
      protein_per_100g, carbs_per_100g, fat_per_100g, diet_tags)
      values ('tagged', 100, 10, 10, 2, $1) returning diet_tags`, [dietTags]);
    expect(rows).toEqual([{ diet_tags: dietTags }]);
  }
});
