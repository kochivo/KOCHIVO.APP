import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, program: string, day: string, exercise: string, alternative: string;
const id = '019ab800-0000-7000-8000-000000000209';
const plan = [{ reps_min: 12, reps_max: 12, rir: 2 }, { reps_min: 8, reps_max: null, rir: null }];
let policies: unknown[];
async function seed(database: PGlite) {
  ({ captain, player } = await createCaptainWithPlayer(database));
  program = (await database.query<{ id: string }>("insert into public.programs(captain_id,player_id,title) values($1,$2,'Plan') returning id", [captain, player])).rows[0]?.id ?? '';
  day = (await database.query<{ id: string }>('insert into public.program_days(program_id,position) values($1,1) returning id', [program])).rows[0]?.id ?? '';
  const rows = await database.query<{ id: string }>("insert into public.exercises(name_en,body_part) values('Bench','chest'),('Press','chest') returning id");
  exercise = rows.rows[0]?.id ?? ''; alternative = rows.rows[1]?.id ?? '';
  await database.query('insert into public.program_exercises(id,day_id,exercise_id,position,sets,reps_min,reps_max) values($1,$2,$3,1,2,8,12)', [id, day, exercise]);
  policies = (await database.query("select * from pg_policies where tablename='program_exercises' order by policyname")).rows;
}
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (file === '0100_exercise_alternatives_set_plan.sql') await seed(database);
  });
});
afterAll(async () => { await db?.close(); });
it('defaults existing prescriptions and rejects excessive, duplicate, own and invisible alternatives', async () => {
  expect((await db.query('select alternatives,set_plan from public.program_exercises where id=$1', [id])).rows)
    .toEqual([{ alternatives: [], set_plan: null }]);
  const other = await createUser(db, 'captain');
  const hidden = (await db.query<{ id: string }>("insert into public.exercises(owner_id,name_en,body_part) values($1,'Private','chest') returning id", [other])).rows[0]?.id;
  const visible = (await db.query<{ id: string }>("insert into public.exercises(owner_id,name_en,body_part) values($1,'Own private','chest') returning id", [captain])).rows[0]?.id;
  const globals = (await db.query<{ id: string }>("insert into public.exercises(name_en,body_part) select 'Alternative '||n,'chest' from generate_series(1,4) n returning id")).rows.map(row => row.id);
  await asUser(db, captain, tx => tx.query('update public.program_exercises set alternatives=$1 where id=$2', [globals.slice(0, 3), id]));
  await asUser(db, captain, tx => tx.query('update public.program_exercises set alternatives=$1 where id=$2', [[visible], id]));
  for (const alternatives of [[alternative, alternative], [exercise], [hidden], globals, [null]]) {
    await expect(asUser(db, captain, tx => tx.query('update public.program_exercises set alternatives=$1 where id=$2', [alternatives, id])))
      .rejects.toMatchObject({ code: '23514' });
  }
  await asUser(db, captain, tx => tx.query('update public.program_exercises set alternatives=$1 where id=$2', [[alternative], id]));
});

it('patches every live function that inserts or copies program exercise rows', async () => {
  const functions = await db.query<{ signature: string; source: string }>(`select p.oid::regprocedure::text as signature,p.prosrc as source
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','security_private')
    and p.prosrc ilike '%insert into public.program_exercises%' order by 1`);
  expect(functions.rows).toHaveLength(5);
  for (const row of functions.rows) {
    expect(row.source, row.signature).toContain('alternatives'); expect(row.source, row.signature).toContain('set_plan');
  }
});
it('enforces plan length, shape, integer ranges and count changes atomically', async () => {
  for (const invalid of [{}, [], [plan[0]], [{ reps_min: 0, reps_max: null, rir: null }, plan[1]],
    [{ reps_min: 'eight', reps_max: null, rir: null }, plan[1]], [[], plan[1]], ['target', plan[1]],
    [{ reps_min: 8.5, reps_max: 12, rir: 2 }, plan[1]], [{ reps_min: 8, reps_max: 7, rir: 2 }, plan[1]],
    [{ reps_min: 8, reps_max: null, rir: 6 }, plan[1]], [{ reps_min: 8 }, plan[1]], [null, plan[1]]]) {
    await expect(db.query('update public.program_exercises set set_plan=$1 where id=$2', [JSON.stringify(invalid), id]))
      .rejects.toMatchObject({ code: '23514' });
  }
  await db.query('update public.program_exercises set set_plan=$1 where id=$2', [JSON.stringify(plan), id]);
  await expect(db.query('update public.program_exercises set sets=3 where id=$1', [id])).rejects.toMatchObject({ code: '23514' });
});
it('saves, updates and copies both columns through every template RPC', async () => {
  const draft = { id: program, player_id: player, title: 'Plan', days: [{ id: day, program_id: program, title: 'Training',
    position: 1, cardio: [], exercises: [{ id, day_id: day, exercise_id: exercise, position: 1, sets: 2,
      reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null, rir: null, alternatives: [alternative], set_plan: plan }] }] };
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  const missingPlan = { ...draft, days: draft.days.map(day => ({ ...day,
    exercises: day.exercises.map(row => ({ ...row, sets: 3, set_plan: undefined })) })) };
  await expect(asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(missingPlan)])))
    .rejects.toMatchObject({ code: '23514' });
  const template = (await asUser(db, captain, tx => tx.query<{ id: string }>("select public.program_to_template($1,'Template') as id", [program]))).rows[0]?.id;
  const copy = (await asUser(db, captain, tx => tx.query<{ id: string }>("select public.copy_template('program',$1,'Copy') as id", [template]))).rows[0]?.id;
  const assigned = (await asUser(db, captain, tx => tx.query<{ id: string }>('select public.assign_program_template($1,$2) as id', [copy, player]))).rows[0]?.id;
  for (const parent of [program, template, copy, assigned]) {
    expect((await db.query(`select e.alternatives,e.set_plan from public.program_exercises e join public.program_days d on d.id=e.day_id
      where d.program_id=$1`, [parent])).rows).toEqual([{ alternatives: [alternative], set_plan: plan }]);
  }
  const row = draft.days[0]?.exercises[0];
  if (!row) throw new Error('Missing fixture');
  row.alternatives = []; row.set_plan = [...plan].reverse();
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  expect((await db.query('select alternatives,set_plan from public.program_exercises where id=$1', [id])).rows)
    .toEqual([{ alternatives: [], set_plan: [...plan].reverse() }]);
});
it('retains RLS for unrelated captains and player writes', async () => {
  expect((await db.query("select * from pg_policies where tablename='program_exercises' order by policyname")).rows).toEqual([
    ...policies.slice(0, 1),
    ...['DELETE', 'INSERT', 'UPDATE'].map(cmd => ({
      schemaname: 'public', tablename: 'program_exercises', policyname: `first_party_${cmd.toLowerCase()}`,
      permissive: 'RESTRICTIVE', roles: ['authenticated'], cmd,
      qual: cmd === 'INSERT' ? null : '(NOT is_oauth_client())',
      with_check: ['INSERT', 'UPDATE'].includes(cmd) ? '(NOT is_oauth_client())' : null,
    })),
    ...policies.slice(1),
  ]);
  const other = await createUser(db, 'captain');
  for (const user of [other, player]) {
    expect((await asUser(db, user, tx => tx.query('update public.program_exercises set sets=2 where id=$1 returning id', [id]))).rows).toEqual([]);
  }
  expect((await asUser(db, other, tx => tx.query('select id from public.program_exercises where id=$1', [id]))).rows).toEqual([]);
});
it('keeps the injury request approval flow working when its target is also an alternative', async () => {
  await db.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level) values
    ($1,'h_push','compound','gym','{}','beginner'),($2,'h_push','compound','gym','{}','beginner')`, [exercise, alternative]);
  await db.query("update public.programs set status='draft' where player_id=$1 and status='active'", [player]);
  await db.query("update public.programs set status='active' where id=$1", [program]);
  await db.query('update public.program_exercises set alternatives=$1 where id=$2', [[alternative], id]);
  const request = (await asUser(db, player, tx => tx.query<{ id: string }>(
    "select public.request_exercise_swap($1,$2,'shoulder','injury') as id", [id, alternative]))).rows[0]?.id;
  await asUser(db, captain, tx => tx.query('select public.decide_exercise_swap($1,true)', [request]));
  expect((await db.query('select exercise_id,alternatives from public.program_exercises where id=$1', [id])).rows)
    .toEqual([{ exercise_id: alternative, alternatives: [] }]);
  expect((await db.query('select status from public.exercise_swap_requests where id=$1', [request])).rows).toEqual([{ status: 'approved' }]);
});
it('carries both fields from starter JSON through captain creation and both demo paths', async () => {
  await db.query("update public.exercises set dataset_id='t209' where id=$1", [exercise]);
  await db.query(`update security_private.starter_templates set payload=jsonb_set(payload,'{days}',
    (select jsonb_agg(jsonb_set(d,'{exercises}',(select jsonb_agg(e || jsonb_build_object('alternatives',jsonb_build_array($1::text),
      'dataset_id','t209','sets',2,'set_plan',$2::jsonb)) from jsonb_array_elements(d->'exercises') e))) from jsonb_array_elements(payload->'days') d))
    where payload->>'kind'='workout'`, [alternative, JSON.stringify(plan)]);
  const owner = await createUser(db, 'captain');
  const demoCaptain = await createUser(db, 'player');
  await asUser(db, demoCaptain, tx => tx.query('select public.create_demo_workspace()'), true);
  const demoPlayer = '019ab800-0000-7000-8000-000000000210';
  await db.query('insert into auth.users(id,is_anonymous) values($1,true)', [demoPlayer]);
  await asUser(db, demoPlayer, tx => tx.query('select public.create_demo_player_workspace()'), true);
  for (const [column, user] of [['captain_id', owner], ['captain_id', demoCaptain], ['player_id', demoPlayer]]) {
    const rows = await db.query(`select e.alternatives,e.set_plan from public.program_exercises e join public.program_days d on d.id=e.day_id
      join public.programs p on p.id=d.program_id where p.${column}=$1`, [user]);
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const row of rows.rows) expect(row).toEqual({ alternatives: [alternative], set_plan: plan });
  }
});
