import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { TEST_NOW, asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, program: string, day: string, exercise: string, prescription: string;
const uuid = (n: number) => `00000306-0000-7000-8000-${String(n).padStart(12, '0')}`;
const drop = { count: 2, percent: 20, mode: 'failure', reps: null };
const plan = [{ reps_min: 8, reps_max: 12, rir: 2, drop }];
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  program = (await db.query<{ id: string }>("insert into public.programs(captain_id,player_id,title,status) values($1,$2,'Drops','active') returning id", [captain, player])).rows[0]?.id ?? '';
  day = (await db.query<{ id: string }>('insert into public.program_days(program_id,position) values($1,1) returning id', [program])).rows[0]?.id ?? '';
  exercise = (await db.query<{ id: string }>("insert into public.exercises(name_en,body_part) values('Press','chest') returning id")).rows[0]?.id ?? '';
  prescription = (await db.query<{ id: string }>('insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min,reps_max) values($1,$2,1,1,8,12) returning id', [day, exercise])).rows[0]?.id ?? '';
  await asUser(db, player, tx => tx.query(`select public.sync_workout_sessions($1)`, [JSON.stringify([
    { id: uuid(1), program_day_id: day, training_date: '2026-11-03', started_at: TEST_NOW, client_updated_at: TEST_NOW },
  ])]));
});
afterAll(async () => db?.close());
const row = (n: number, index: number) => ({ id: uuid(n), session_id: uuid(1), program_exercise_id: prescription,
  exercise_id: exercise, set_index: 1, drop_index: index, weight_kg: 60, reps: 8,
  completed_at: TEST_NOW, client_updated_at: TEST_NOW, deleted_at: null });
it('adds the bounded index, allows main plus drops and rejects duplicate logical rows', async () => {
  expect((await db.query("select column_default from information_schema.columns where table_name='set_logs' and column_name='drop_index'")).rows)
    .toEqual([{ column_default: '0' }]);
  for (const index of [-1, 4]) {
    await expect(asUser(db, player, tx => tx.query('select public.sync_set_logs($1)', [JSON.stringify([row(10, index)])])))
      .rejects.toMatchObject({ code: '23514' });
  }
  await asUser(db, player, tx => tx.query('select public.sync_set_logs($1)', [JSON.stringify([row(2, 0), row(3, 1), row(4, 2)])]));
  expect((await db.query('select drop_index from public.set_logs where session_id=$1 order by drop_index', [uuid(1)])).rows)
    .toEqual([{ drop_index: 0 }, { drop_index: 1 }, { drop_index: 2 }]);
  await expect(db.query(`insert into public.set_logs(id,session_id,player_id,program_exercise_id,exercise_id,set_index,drop_index,completed_at,client_updated_at)
    values($1,$2,$3,$4,$5,1,1,$6,$6)`, [uuid(9), uuid(1), player, prescription, exercise, TEST_NOW])).rejects.toMatchObject({ code: '23505' });
});
it('keeps RLS on drops and refuses another player session', async () => {
  const other = await createUser(db, 'player');
  await expect(asUser(db, other, tx => tx.query('select public.sync_set_logs($1)', [JSON.stringify([row(11, 3)])])))
    .rejects.toMatchObject({ code: '42501' });
});
it('validates drop shape and ranges at the database boundary', async () => {
  await asUser(db, captain, tx => tx.query('update public.program_exercises set set_plan=$1 where id=$2', [JSON.stringify(plan), prescription]));
  for (const invalid of [{ ...drop, count: 4 }, { ...drop, percent: 50 }, { ...drop, mode: 'reps', reps: null },
    { ...drop, count: 1.5 }, { ...drop, mode: 'other' }, null, [], { ...drop, extra: true }]) {
    await expect(asUser(db, captain, tx => tx.query('update public.program_exercises set set_plan=$1 where id=$2',
      [JSON.stringify([{ ...plan[0], drop: invalid }]), prescription]))).rejects.toMatchObject({ code: '23514' });
  }
});
it('does not award a personal-record point for a drop', async () => {
  await db.query(`insert into public.workout_sessions(id,player_id,program_day_id,training_date,started_at,client_updated_at)
    values($1,$2,$3,'2026-11-02','2026-11-02T08:00:00Z',$4)`, [uuid(30), player, day, TEST_NOW]);
  await db.query(`insert into public.set_logs(id,session_id,player_id,program_exercise_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    values($1,$2,$3,$4,$5,1,60,8,'2026-11-02T09:00:00Z',$6)`, [uuid(31), uuid(30), player, prescription, exercise, TEST_NOW]);
  await db.query('update public.set_logs set weight_kg=100 where id=$1', [uuid(3)]);
  await db.query("update public.workout_sessions set completed_at='2026-11-03T11:00:00Z' where id=$1", [uuid(1)]);
  expect((await db.query("select kind from public.points_log where player_id=$1 and kind='pr'", [player])).rows).toEqual([]);
});
it('preserves drops through template copy, assignment and KO resize', async () => {
  await db.query('update public.program_exercises set set_plan=$1 where id=$2', [JSON.stringify(plan), prescription]);
  const template = (await asUser(db, captain, tx => tx.query<{ id: string }>("select public.program_to_template($1,'Drops') as id", [program]))).rows[0]?.id;
  const copy = (await asUser(db, captain, tx => tx.query<{ id: string }>("select public.copy_template('program',$1,'Copy') as id", [template]))).rows[0]?.id;
  const assigned = (await asUser(db, captain, tx => tx.query<{ id: string }>('select public.assign_program_template($1,$2) as id', [copy, player]))).rows[0]?.id;
  for (const parent of [template, copy, assigned]) expect((await db.query(`select e.set_plan from public.program_exercises e
    join public.program_days d on d.id=e.day_id where d.program_id=$1`, [parent])).rows).toEqual([{ set_plan: plan }]);
  const secret = 'drop-set-test-signing-key-123456789012345';
  await db.query("update public.programs set status='draft' where player_id=$1 and status='active'", [player]);
  await db.query("update public.programs set status='active' where id=$1", [program]);
  await db.query('insert into security_private.ko_approval_config(signing_key) values($1)', [secret]);
  const body = Buffer.from(JSON.stringify({ actor: captain, id: uuid(20), player, kind: 'exercise', expires: Date.parse(TEST_NOW) + 60000,
    payload: { id: prescription, previousSets: 1, previousReps: 8, previousMax: 12, previousSetPlan: plan, sets: 3, reps: 10 } })).toString('base64url');
  await asUser(db, captain, tx => tx.query('select public.ko_apply_action($1)', [body + '.' + createHmac('sha256', secret).update(body).digest('hex')]));
  expect((await db.query('select set_plan from public.program_exercises where id=$1', [prescription])).rows)
    .toEqual([{ set_plan: Array.from({ length: 3 }, () => ({ ...plan[0], reps_min: 10, reps_max: null })) }]);
});
