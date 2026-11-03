import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
let otherPlayer: string;
const id = (n: number) => `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: other, player: otherPlayer } = await createCaptainWithPlayer(db));
  await db.query(`insert into public.programs (id, captain_id, player_id, title, status, notes, settings)
    values ($1, $2, $3, 'برنامج', 'archived', 'ملاحظات', '{"advanced":true}')`, [id(1), captain, player]);
  await db.query(`insert into public.exercises (id, name_en, body_part) values ($1, 'Squat', 'legs')`, [id(2)]);
  await db.query(`insert into public.nutrition_plans
    (id, captain_id, player_id, title, status, target_kcal, target_protein, target_carbs, target_fat)
    values ($1, $2, $3, 'أكل', 'active', 2400, 180, 260, 70)`, [id(3), captain, player]);
  await db.query(`insert into public.foods (id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ($1, 'رز', 100, 2, 20, 1)`, [id(4)]);
  for (const n of [1, 2]) {
    await db.query(`insert into public.program_days (id, program_id, position, title) values ($1, $2, $3, $4)`,
      [id(10 + n), id(1), n, `يوم ${n}`]);
    await db.query(`insert into public.program_exercises
      (day_id, exercise_id, position, superset_group, sets, reps_min, reps_max, rest_seconds, rpe, tempo, notes)
      values ($1, $2, 1, 2, 4, 8, 12, 120, 8.5, '3010', 'بهدوء')`, [id(10 + n), id(2)]);
    await db.query(`insert into public.meals (id, plan_id, position, name) values ($1, $2, $3, $4)`,
      [id(20 + n), id(3), n, `وجبة ${n}`]);
    for (const position of [1, 2]) {
      const item = id(100 + n * 10 + position);
      await db.query(`insert into public.meal_items (id, meal_id, food_id, grams, position) values ($1, $2, $3, $4, $5)`,
        [item, id(20 + n), id(4), n * 100 + position, position]);
      await db.query(`insert into public.meal_item_alternatives (meal_item_id, food_id, grams) values ($1, $2, $3)`,
        [item, id(4), n * 90 + position]);
    }
  }
});
afterAll(async () => { await db.close(); });

async function rpc(user: string, name: string, args: (string | null)[]) {
  const result = await asUser(db, user, tx => tx.query<{ id: string }>(
    `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) as id`, args));
  const row = result.rows[0];
  if (!row) throw new Error('RPC returned no row');
  return row.id;
}
async function hierarchy(kind: 'program' | 'nutrition', source: string) {
  const sql = kind === 'program'
    ? `select d.position, d.title, e.exercise_id, e.position as exercise_position, e.superset_group,
        e.sets, e.reps_min, e.reps_max, e.rest_seconds, e.rpe, e.tempo, e.notes
       from public.program_days d join public.program_exercises e on e.day_id = d.id
       where d.program_id = $1 order by d.position, e.position`
    : `select m.position, m.name, i.position as item_position, i.food_id, i.grams, a.food_id as alternative_food,
        a.grams as alternative_grams from public.meals m join public.meal_items i on i.meal_id = m.id
        join public.meal_item_alternatives a on a.meal_item_id = i.id
       where m.plan_id = $1 order by m.position, i.position, a.grams`;
  return (await db.query(sql, [source])).rows;
}

it.each(['program', 'nutrition'] as const)('saves the full %s hierarchy without changing the source', async kind => {
  const table = kind === 'program' ? 'programs' : 'nutrition_plans';
  const source = kind === 'program' ? id(1) : id(3);
  const name = kind === 'program' ? 'program_to_template' : 'nutrition_plan_to_template';
  const before = (await db.query(`select * from public.${table} where id = $1`, [source])).rows;
  const contents = await hierarchy(kind, source);
  const template = await rpc(captain, name, [source, '  قالب جديد  ']);
  expect(await hierarchy(kind, template)).toEqual(contents);
  expect(contents).toHaveLength(kind === 'program' ? 2 : 4);
  expect((await db.query(`select * from public.${table} where id = $1`, [source])).rows).toEqual(before);
  const row = (await db.query(`select * from public.${table} where id = $1`, [template])).rows[0];
  expect(row).toMatchObject({ captain_id: captain, player_id: null, is_template: true,
    status: 'draft', source_template_id: null, title: 'قالب جديد' });
  expect(row).toMatchObject(kind === 'program' ? { notes: 'ملاحظات', settings: { advanced: true } }
    : { target_kcal: 2400, target_protein: 180, target_carbs: 260, target_fat: 70 });
  const child = kind === 'program' ? 'program_days' : 'meals';
  const parent = kind === 'program' ? 'program_id' : 'plan_id';
  expect((await db.query(`select id from public.${child} where ${parent} = $1 intersect
    select id from public.${child} where ${parent} = $2`, [source, template])).rows).toEqual([]);
});

it.each(['program', 'nutrition'] as const)('assigned %s copies and templates remain independent in both directions', async kind => {
  const program = kind === 'program';
  const table = program ? 'programs' : 'nutrition_plans';
  const template = await rpc(captain, program ? 'program_to_template' : 'nutrition_plan_to_template',
    [program ? id(1) : id(3), 'قالب مستقل']);
  const original = await hierarchy(kind, template);
  const first = await rpc(captain, program ? 'assign_program_template' : 'assign_nutrition_template', [template, player]);
  const second = await rpc(captain, program ? 'assign_program_template' : 'assign_nutrition_template', [template, player]);
  expect(await hierarchy(kind, first)).toEqual(original);
  expect(await hierarchy(kind, second)).toEqual(original);
  expect((await db.query(`select id from public.${table} where player_id = $1 and status = 'active'`, [player])).rows)
    .toEqual([{ id: second }]);
  expect((await db.query(`select status, source_template_id from public.${table} where id = $1`, [first])).rows)
    .toEqual([{ status: 'archived', source_template_id: template }]);
  const update = program
    ? 'update public.program_exercises set sets = 9 where day_id in (select id from public.program_days where program_id = $1)'
    : 'update public.meal_item_alternatives set grams = 555 where meal_item_id in (select i.id from public.meal_items i join public.meals m on m.id = i.meal_id where m.plan_id = $1)';
  await asUser(db, captain, tx => tx.query(update, [first]));
  expect(await hierarchy(kind, template)).toEqual(original);
  expect(await hierarchy(kind, second)).toEqual(original);
  await asUser(db, captain, tx => tx.query(update, [template]));
  expect(await hierarchy(kind, second)).toEqual(original);
  expect(await hierarchy(kind, template)).not.toEqual(original);
});

it('uses P0002 for hidden, missing and wrong-kind sources, and checks the player first', async () => {
  for (const [name, source] of [['program_to_template', id(1)], ['nutrition_plan_to_template', id(3)]] as const) {
    await expect(rpc(other, name, [source, 'قالب'])).rejects.toMatchObject({ code: 'P0002' });
    await expect(rpc(captain, name, [id(999), 'قالب'])).rejects.toMatchObject({ code: 'P0002' });
    const template = await rpc(captain, name, [source, 'قالب']);
    await expect(rpc(captain, name, [template, 'قالب'])).rejects.toMatchObject({ code: 'P0002' });
  }
  const template = await rpc(captain, 'nutrition_plan_to_template', [id(3), 'قالب']);
  await expect(rpc(other, 'assign_nutrition_template', [template, otherPlayer])).rejects.toMatchObject({ code: 'P0002' });
  await expect(rpc(other, 'assign_nutrition_template', [template, player])).rejects.toMatchObject({ code: '42501' });
  await expect(rpc(other, 'assign_nutrition_template', [id(999), player])).rejects.toMatchObject({ code: '42501' });
  for (const source of [id(3), id(999)]) {
    await expect(rpc(captain, 'assign_nutrition_template', [source, player])).rejects.toMatchObject({ code: 'P0002' });
  }
});

it.each([null, '', '   ', '\n\t ', 'x'.repeat(81)])('rejects invalid title %s with 22023', async title => {
  for (const [name, source] of [['program_to_template', id(1)], ['nutrition_plan_to_template', id(3)]] as const) {
    await expect(rpc(captain, name, [source, title])).rejects.toMatchObject({ code: '22023' });
  }
});

it('grants only authenticated execute and keeps all three functions invoker with an empty search path', async () => {
  for (const signature of ['program_to_template(uuid,text)', 'nutrition_plan_to_template(uuid,text)', 'assign_nutrition_template(uuid,uuid)']) {
    expect((await db.query(`select has_function_privilege('anon', $1, 'execute') as anon,
      has_function_privilege('authenticated', $1, 'execute') as authenticated`, [`public.${signature}`])).rows)
      .toEqual([{ anon: false, authenticated: true }]);
    expect((await db.query(`select prosecdef, proconfig from pg_proc where oid = $1::regprocedure`, [`public.${signature}`])).rows)
      .toEqual([{ prosecdef: false, proconfig: ['search_path=""'] }]);
  }
});
