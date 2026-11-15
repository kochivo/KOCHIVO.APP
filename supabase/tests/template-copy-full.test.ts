import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string;
let programBranch: string;
const id = (n: number) => `29200000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (file !== '0114_template_copy_full.sql') return;
    const definition = await database.query<{ prosrc: string }>(
      "select prosrc from pg_proc where oid = 'public.copy_template(text,uuid,text)'::regprocedure");
    programBranch = definition.rows[0]?.prosrc.split("elsif p_kind = 'nutrition'")[0] ?? '';
  });
  ({ captain, player } = await createCaptainWithPlayer(db));
  await db.exec(`insert into public.foods
    (id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, units)
    values ('${id(1)}', 'Bread', 250, 8, 50, 2,
      '[{"key":"loaf","name_ar":"Loaf","name_en":"loaf","grams":80}]'),
      ('${id(2)}', 'Rice', 130, 3, 28, 1, '[]'),
      ('${id(3)}', 'Potato', 80, 2, 17, 1, '[]')`);
});
afterAll(async () => { await db?.close(); });

async function seed(source: string, template: boolean) {
  await db.query(`insert into public.nutrition_plans
    (id, captain_id, player_id, is_template, title, target_kcal, target_protein, target_carbs, target_fat)
    values ($1, $2, $3, $4, 'Source', 2400, 180, 260, 70)`,
  [source, captain, template ? null : player, template]);
  for (const [position, dayType, time, unit] of [
    [1, 'training', '13:00', 'loaf'], [2, 'rest', '20:30', 'loaf'], [3, 'all', null, null],
  ] as const) {
    const meal = (await db.query<{ id: string }>(`insert into public.meals
      (plan_id, position, name, day_type, time_of_day) values ($1,$2,$3,$4,$5) returning id`,
    [source, position, `Meal ${position}`, dayType, time])).rows[0]?.id;
    const item = (await db.query<{ id: string }>(`insert into public.meal_items
      (meal_id, food_id, grams, position, unit) values ($1,$2,160,1,$3) returning id`,
    [meal, id(1), unit])).rows[0]?.id;
    await db.query(`insert into public.meal_item_alternatives (meal_item_id, food_id, grams)
      values ($1,$2,300), ($1,$3,500)`, [item, id(2), id(3)]);
  }
}

async function contents(plan: string) {
  return (await asUser(db, captain, tx => tx.query(`select m.position, m.name, m.day_type,
    m.time_of_day, i.food_id, i.grams, i.position as item_position, i.unit,
    (select jsonb_agg(jsonb_build_object('food', a.food_id, 'grams', a.grams) order by a.grams)
      from public.meal_item_alternatives a where a.meal_item_id = i.id) as alternatives
    from public.meals m join public.meal_items i on i.meal_id = m.id
    where m.plan_id = $1 order by m.position, i.position`, [plan]))).rows;
}

it.each(['save', 'copy', 'assign'] as const)('%s preserves the full nutrition hierarchy', async operation => {
  const source = id({ save: 10, copy: 20, assign: 30 }[operation]);
  await seed(source, operation !== 'save');
  const before = await contents(source);
  const sql = {
    save: 'select public.nutrition_plan_to_template($1,$2) as id',
    copy: "select public.copy_template('nutrition',$1,$2) as id",
    assign: 'select public.assign_nutrition_template($1,$2) as id',
  }[operation];
  const result = await asUser(db, captain, tx => tx.query<{ id: string }>(sql,
    [source, operation === 'assign' ? player : 'New template']));
  const copy = result.rows[0]?.id;
  if (!copy) throw new Error('RPC returned no copy');
  const item = { food_id: id(1), grams: '160.0', item_position: 1,
    alternatives: [{ food: id(2), grams: 300 }, { food: id(3), grams: 500 }] };
  expect(await contents(copy)).toEqual([
    { ...item, position: 1, name: 'Meal 1', day_type: 'training', time_of_day: '13:00:00', unit: 'loaf' },
    { ...item, position: 2, name: 'Meal 2', day_type: 'rest', time_of_day: '20:30:00', unit: 'loaf' },
    { ...item, position: 3, name: 'Meal 3', day_type: 'all', time_of_day: null, unit: null },
  ]);
  expect(await contents(source)).toEqual(before);
  expect((await db.query(`select target_kcal, target_protein, target_carbs, target_fat,
    is_template, player_id, source_template_id, status, is_starter
    from public.nutrition_plans where id = $1`, [copy])).rows).toEqual([{
    target_kcal: 2400, target_protein: 180, target_carbs: 260, target_fat: 70,
    is_template: operation !== 'assign', player_id: operation === 'assign' ? player : null,
    source_template_id: operation === 'assign' ? source : null,
    status: operation === 'assign' ? 'active' : 'draft', is_starter: false,
  }]);
  for (const [table, parent, parentSql] of [
    ['meals', 'plan_id', 'select id from public.nutrition_plans where id = $1'],
    ['meal_items', 'meal_id', 'select id from public.meals where plan_id = $1'],
    ['meal_item_alternatives', 'meal_item_id',
      'select i.id from public.meal_items i join public.meals m on m.id = i.meal_id where m.plan_id = $1'],
  ] as const) {
    expect((await db.query(`select id from public.${table} where ${parent} in (${parentSql})
      intersect select id from public.${table} where ${parent} in (${parentSql.replace('$1', '$2')})`,
    [source, copy])).rows).toEqual([]);
  }
});

it.each(['nutrition_plan_to_template(uuid,text)', 'assign_nutrition_template(uuid,uuid)',
  'copy_template(text,uuid,text)'])('preserves security for %s', async signature => {
  expect((await db.query(`select prosecdef, proconfig,
    has_function_privilege('anon', oid, 'execute') as anon,
    has_function_privilege('authenticated', oid, 'execute') as authenticated
    from pg_proc where oid = $1::regprocedure`, [`public.${signature}`])).rows).toEqual([{
    prosecdef: false, proconfig: ['search_path=""'], anon: false, authenticated: true,
  }]);
});

it('retains the effective program-copy branch from all preceding migrations', async () => {
  const definition = await db.query<{ prosrc: string }>(
    "select prosrc from pg_proc where oid = 'public.copy_template(text,uuid,text)'::regprocedure");
  expect(programBranch).toContain('set_plan');
  expect(definition.rows[0]?.prosrc.split("elsif p_kind = 'nutrition'")[0]).toBe(programBranch);
});
