import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let captain: string;
const source = (name: string) => JSON.parse(fs.readFileSync(
  new URL(`../seed/source/${name}.json`, import.meta.url), 'utf8'));
const counts = async (user: string) => (await db.query(`select
  (select count(*)::int from public.programs where captain_id = $1) as workouts,
  (select count(*)::int from public.nutrition_plans where captain_id = $1) as nutrition`, [user])).rows;
const copy = (user: string) => db.query('select security_private.copy_starter_templates($1)', [user]);
async function pending() {
  const result = await db.query<{ id: string }>(
    'insert into auth.users (id) values (gen_random_uuid()) returning id');
  const row = result.rows[0];
  if (!row) throw new Error('Missing user');
  return row.id;
}
beforeAll(async () => {
  db = await createTestDb();
  await db.query(`insert into public.exercises (dataset_id, name_en, body_part)
    select dataset_id, name_en, body_part from jsonb_to_recordset($1) as x(dataset_id text, name_en text, body_part text)`,
  [JSON.stringify(source('exercises-gif'))]);
  await db.query(`insert into public.foods (seed_key, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    select regexp_replace(photo_file, '\\.[^.]+$', ''), name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
    from jsonb_to_recordset($1) as x(photo_file text, name_ar text, kcal_per_100g numeric,
      protein_per_100g numeric, carbs_per_100g numeric, fat_per_100g numeric)`, [JSON.stringify(source('foods-starter'))]);
  captain = await pending();
});
afterAll(async () => { await db?.close(); });

it('confirmation copies six workouts and four nutrition plans with complete hierarchies', async () => {
  expect(await counts(captain)).toEqual([{ workouts: 0, nutrition: 0 }]);
  await asUser(db, captain, tx => tx.query("select public.confirm_role('captain')"));
  expect(await counts(captain)).toEqual([{ workouts: 6, nutrition: 4 }]);
  await db.query(`update public.profiles set captain_status = 'approved' where id = $1`, [captain]);
  const library = source('starter-templates') as {
    kind: string; days?: { exercises: unknown[] }[];
    meals?: { items: { alternatives: unknown[] }[] }[];
  }[];
  for (const [table, expected] of [
    ['program_days', library.flatMap(t => t.days ?? []).length],
    ['program_exercises', library.flatMap(t => t.days ?? []).flatMap(d => d.exercises).length],
    ['meals', library.flatMap(t => t.meals ?? []).length],
    ['meal_items', library.flatMap(t => t.meals ?? []).flatMap(m => m.items).length],
    ['meal_item_alternatives', library.flatMap(t => t.meals ?? []).flatMap(m => m.items).flatMap(i => i.alternatives).length],
  ] as const) expect((await db.query(`select count(*)::int as n from public.${table}`)).rows).toEqual([{ n: expected }]);
  for (const table of ['programs', 'nutrition_plans']) {
    const rows = (await asUser(db, captain, tx => tx.query<{ id: string }>(`select * from public.${table}`))).rows;
    expect(rows).toHaveLength(table === 'programs' ? 6 : 4);
    for (const row of rows) {
      expect(row).toMatchObject({ captain_id: captain, player_id: null,
        is_template: true, status: 'draft', source_template_id: null, created_at: new Date(TEST_NOW) });
      expect(row.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    }
  }
});

it('preserves ordered workout prescriptions, meal grams, alternatives and targets', async () => {
  const actual = await db.query<{ payload: unknown }>(`select jsonb_build_object(
    'title', p.title, 'notes', p.notes, 'days', (select jsonb_agg(jsonb_build_object(
      'title', d.title, 'exercises', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'dataset_id', e.dataset_id, 'sets', x.sets, 'reps_min', x.reps_min,
        'reps_max', x.reps_max, 'rest_seconds', x.rest_seconds, 'superset_group', x.superset_group)) order by x.position)
        from public.program_exercises x join public.exercises e on e.id = x.exercise_id where x.day_id = d.id)) order by d.position)
      from public.program_days d where d.program_id = p.id)) as payload
    from public.programs p where captain_id = $1
    union all select jsonb_build_object('title', p.title, 'targets', jsonb_build_object(
      'kcal', p.target_kcal, 'protein', p.target_protein, 'carbs', p.target_carbs, 'fat', p.target_fat),
      'meals', (select jsonb_agg(jsonb_build_object('name', m.name, 'items', (
        select jsonb_agg(jsonb_build_object('seed_key', f.seed_key, 'grams', i.grams,
          'alternatives', coalesce((select jsonb_agg(jsonb_build_object('seed_key', a.seed_key, 'grams', x.grams) order by a.seed_key)
            from public.meal_item_alternatives x join public.foods a on a.id = x.food_id where x.meal_item_id = i.id), '[]'::jsonb)) order by i.position)
        from public.meal_items i join public.foods f on f.id = i.food_id where i.meal_id = m.id)) order by m.position)
        from public.meals m where m.plan_id = p.id)) as payload
    from public.nutrition_plans p where captain_id = $1`, [captain]);
  const expected = (source('starter-templates') as Record<string, unknown>[]).map(t => {
    const { key, kind, ...payload } = t;
    expect(key).toBeDefined();
    expect(kind).toBeDefined();
    return payload;
  });
  expect(actual.rows.map(r => r.payload)).toEqual(expect.arrayContaining(expected));
  expect(actual.rows).toHaveLength(10);
});

it('also handles captains confirmed on profile insertion and gives players none', async () => {
  expect(await counts(await createUser(db, 'captain'))).toEqual([{ workouts: 6, nutrition: 4 }]);
  const player = await createUser(db, 'player');
  await copy(player);
  expect(await counts(player)).toEqual([{ workouts: 0, nutrition: 0 }]);
});

// Starters are read-only since 0036 (see starter-lock.test.ts), so a retry can only add duplicates.
it('is idempotent', async () => {
  await copy(captain);
  await copy(captain);
  expect(await counts(captain)).toEqual([{ workouts: 6, nutrition: 4 }]);
});

it('skips missing exercises, foods and alternatives without aborting confirmation', async () => {
  await db.exec('begin');
  try {
    await db.exec('truncate public.exercises, public.foods cascade');
    await db.exec(`insert into public.exercises (dataset_id, name_en, body_part) values ('0025', 'Bench press', 'chest');
      insert into public.foods (seed_key, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
        values ('food_white_rice-v1', 'رز', 130, 2.7, 28.2, 0.3)`);
    const user = await createUser(db, 'captain');
    expect(await counts(user)).toEqual([{ workouts: 6, nutrition: 4 }]);
    expect((await db.query('select distinct e.dataset_id from public.program_exercises p join public.exercises e on e.id = p.exercise_id')).rows)
      .toEqual([{ dataset_id: '0025' }]);
    expect((await db.query('select distinct f.seed_key from public.meal_items i join public.foods f on f.id = i.food_id')).rows)
      .toEqual([{ seed_key: 'food_white_rice-v1' }]);
    expect((await db.query('select * from public.meal_item_alternatives')).rows).toEqual([]);
  } finally { await db.exec('rollback'); }
});

it('another captain and a player cannot read any part of the copies', async () => {
  const tables = ['programs', 'program_days', 'program_exercises', 'nutrition_plans', 'meals', 'meal_items', 'meal_item_alternatives'];
  const existing = await Promise.all(tables.map(t => db.query<{ id: string }>(`select id from public.${t}`)));
  for (const user of [await createUser(db, 'captain'), await createUser(db, 'player')]) {
    for (const [index, table] of tables.entries()) {
      const ids = existing[index]?.rows.map(r => r.id) ?? [];
      expect((await asUser(db, user, tx => tx.query(`select * from public.${table} where id = any($1::uuid[])`, [ids]))).rows)
        .toEqual([]);
    }
  }
});

it('a suspended captain gets no copies through the trigger, backfill or direct retry', async () => {
  const user = await pending();
  await db.query('update public.profiles set suspended_at = $2, role = $3, role_confirmed = true where id = $1',
    [user, TEST_NOW, 'captain']);
  await copy(user);
  expect(await counts(user)).toEqual([{ workouts: 0, nutrition: 0 }]);
});

it('backfills existing confirmed captains and preserves existing copies', async () => {
  const migration = fs.readFileSync(new URL('../migrations/0030_starter_templates.sql', import.meta.url), 'utf8');
  await db.exec('begin');
  try {
    await db.exec('alter table public.profiles disable trigger profiles_starter_templates');
    const user = await createUser(db, 'captain');
    expect(await counts(user)).toEqual([{ workouts: 0, nutrition: 0 }]);
    const backfill = migration.slice(migration.lastIndexOf('-- Backfill'));
    await db.exec(backfill);
    expect(await counts(user)).toEqual([{ workouts: 6, nutrition: 4 }]);
    expect(await counts(captain)).toEqual([{ workouts: 6, nutrition: 4 }]);
  } finally { await db.exec('rollback'); }
});

it('keeps private tables and definer functions inaccessible to both API roles', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const table of ['starter_templates', 'starter_template_receipts']) {
      expect((await db.query(`select has_table_privilege($1, $2, 'select,insert,update,delete') as allowed`,
        [role, `security_private.${table}`])).rows).toEqual([{ allowed: false }]);
    }
    for (const signature of ['copy_starter_templates(uuid)', 'on_captain_confirmed()', 'starter_uuidv7()']) {
      expect((await db.query('select has_function_privilege($1, $2, $3) as allowed',
        [role, `security_private.${signature}`, 'execute'])).rows).toEqual([{ allowed: false }]);
    }
  }
  expect((await db.query(`select prosecdef, proconfig from pg_proc
    where oid = 'security_private.copy_starter_templates(uuid)'::regprocedure`)).rows)
    .toEqual([{ prosecdef: true, proconfig: ['search_path=""'] }]);
});
