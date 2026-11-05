import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let program: string;
let plan: string;
const source = (name: string) => JSON.parse(fs.readFileSync(
  new URL(`../seed/source/${name}.json`, import.meta.url), 'utf8'));
const as = <T>(fn: Parameters<typeof asUser<T>>[2]) => asUser(db, captain, fn);
const one = async (sql: string) => (await db.query<{ id: string }>(sql, [captain])).rows[0]?.id ?? '';

beforeAll(async () => {
  db = await createTestDb();
  await db.query(`insert into public.exercises (dataset_id, name_en, body_part)
    select dataset_id, name_en, body_part from jsonb_to_recordset($1) as x(dataset_id text, name_en text, body_part text)`,
  [JSON.stringify(source('exercises-gif'))]);
  await db.query(`insert into public.foods (seed_key, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    select regexp_replace(photo_file, '\\.[^.]+$', ''), name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
    from jsonb_to_recordset($1) as x(photo_file text, name_ar text, kcal_per_100g numeric,
      protein_per_100g numeric, carbs_per_100g numeric, fat_per_100g numeric)`, [JSON.stringify(source('foods-starter'))]);
  captain = (await db.query<{ id: string }>('insert into auth.users (id) values (gen_random_uuid()) returning id')).rows[0]?.id ?? '';
  await as(tx => tx.query("select public.confirm_role('captain')"));
  await db.query(`update public.profiles set captain_status = 'approved' where id = $1`, [captain]);
  program = await one('select id from public.programs where captain_id = $1 and is_starter limit 1');
  plan = await one('select id from public.nutrition_plans where captain_id = $1 and is_starter limit 1');
});
afterAll(async () => { await db?.close(); });

it('marks the whole copied library as starter templates', async () => {
  const rows = (await db.query(`select
    (select count(*)::int from public.programs where captain_id = $1 and is_starter) as workouts,
    (select count(*)::int from public.nutrition_plans where captain_id = $1 and is_starter) as nutrition`, [captain])).rows;
  expect(rows).toEqual([{ workouts: 6, nutrition: 4 }]);
});

it.each([
  ['rename a starter workout', `update public.programs set title = 'x' where id = $1`, () => program],
  ['delete a starter plan', 'delete from public.nutrition_plans where id = $1', () => plan],
  ['unlock a starter', 'update public.programs set is_starter = false where id = $1', () => program],
  ['add a day', `insert into public.program_days (program_id, position, title) values ($1, 99, 'x')`, () => program],
  ['edit an exercise', `update public.program_exercises set sets = 9
    where day_id in (select id from public.program_days where program_id = $1)`, () => program],
  ['delete a meal item', `delete from public.meal_items
    where meal_id in (select id from public.meals where plan_id = $1)`, () => plan],
])('refuses to %s', async (_name, sql, target) => {
  await expect(as(tx => tx.query(sql, [target()]))).rejects.toMatchObject({ code: '42501' });
});

it('copies a starter into an editable template of the captain', async () => {
  for (const [kind, id] of [['program', program], ['nutrition', plan]] as const) {
    const copy = (await as(tx => tx.query<{ id: string }>('select public.copy_template($1, $2, $3) as id', [kind, id, 'نسختي'])))
      .rows[0]?.id ?? '';
    const table = kind === 'program' ? 'programs' : 'nutrition_plans';
    const child = kind === 'program' ? 'program_days where program_id' : 'meals where plan_id';
    const counts = await db.query(`select (select count(*)::int from public.${child} = $1) as source,
      (select count(*)::int from public.${child} = $2) as copy`, [id, copy]);
    expect(counts.rows[0]).toMatchObject({ source: expect.any(Number) });
    expect((counts.rows[0] as { source: number; copy: number }).copy).toBe((counts.rows[0] as { source: number }).source);
    await as(tx => tx.query(`update public.${table} set title = 'معدّل' where id = $1`, [copy]));
    await as(tx => tx.query(`delete from public.${table} where id = $1`, [copy]));
  }
});

it('keeps another captain out of copy_template', async () => {
  const other = (await db.query<{ id: string }>('insert into auth.users (id) values (gen_random_uuid()) returning id')).rows[0]?.id ?? '';
  await asUser(db, other, tx => tx.query("select public.confirm_role('captain')"));
  await db.query(`update public.profiles set captain_status = 'approved' where id = $1`, [other]);
  await expect(asUser(db, other, tx => tx.query('select public.copy_template($1, $2, $3)', ['program', program, 'x'])))
    .rejects.toMatchObject({ code: 'P0002' });
});

it('still lets account deletion remove the starter library', async () => {
  await db.query('delete from auth.users where id = $1', [captain]);
  expect((await db.query('select count(*)::int as n from public.programs where captain_id = $1', [captain])).rows).toEqual([{ n: 0 }]);
});
