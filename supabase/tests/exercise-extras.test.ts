import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let program: string;
let day: string;
let exercise: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  const p = await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title)
    values($1,$2,'RIR program') returning id`, [captain, player]);
  program = p.rows[0]?.id ?? '';
  const d = await db.query<{ id: string }>(`insert into public.program_days(program_id,position,title)
    values($1,1,'Training') returning id`, [program]);
  day = d.rows[0]?.id ?? '';
  const e = await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part,dataset_id)
    values('Hip thrust','upper legs','rir-fixture') returning id`);
  exercise = e.rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });

it('accepts null and 0–5 and rejects RIR outside the range', async () => {
  for (const rir of [null, 0, 1, 2, 3, 4, 5]) {
    const result = await asUser(db, captain, tx => tx.query(`insert into public.program_exercises
      (day_id,exercise_id,position,sets,reps_min,rir) values($1,$2,1,3,8,$3) returning rir`, [day, exercise, rir]));
    expect(result.rows).toEqual([{ rir }]);
    await db.query('delete from public.program_exercises where day_id=$1', [day]);
  }
  for (const rir of [-1, 6]) await expect(asUser(db, captain, tx => tx.query(`insert into public.program_exercises
    (day_id,exercise_id,position,sets,reps_min,rir) values($1,$2,1,3,8,$3)`, [day, exercise, rir])))
    .rejects.toMatchObject({ code: '23514' });
});

it('keeps RIR through weekly save, template save, copy and assignment and permits clearing it', async () => {
  const ids = await db.query<{ id: string }>('select gen_random_uuid() as id');
  const id = ids.rows[0]?.id;
  const row = { id, day_id: day, exercise_id: exercise, position: 1, sets: 3, reps_min: 8,
    reps_max: 12, rest_seconds: 90, superset_group: null, rir: 2 };
  const draft = { id: program, player_id: player, title: 'RIR program', days: [{ id: day, program_id: program,
    title: 'Training', position: 1, exercises: [row], cardio: [] }] };
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  const template = await asUser(db, captain, tx => tx.query<{ id: string }>(
    "select public.program_to_template($1,'RIR template') as id", [program]));
  const copy = await asUser(db, captain, tx => tx.query<{ id: string }>(
    "select public.copy_template('program',$1,'RIR copy') as id", [template.rows[0]?.id]));
  const assigned = await asUser(db, captain, tx => tx.query<{ id: string }>(
    'select public.assign_program_template($1,$2) as id', [copy.rows[0]?.id, player]));
  for (const p of [program, template.rows[0]?.id, copy.rows[0]?.id, assigned.rows[0]?.id]) {
    expect((await db.query(`select rir from public.program_exercises where day_id in
      (select id from public.program_days where program_id=$1)`, [p])).rows).toEqual([{ rir: 2 }]);
  }
  row.rir = 0;
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  expect((await db.query('select rir from public.program_exercises where id=$1', [id])).rows).toEqual([{ rir: 0 }]);
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)',
    [JSON.stringify({ ...draft, days: [{ ...draft.days[0], exercises: [{ ...row, rir: null }] }] })]));
  expect((await db.query('select rir from public.program_exercises where id=$1', [id])).rows).toEqual([{ rir: null }]);
});

it('reads target RIR from starter JSON when creating a captain workspace', async () => {
  const payload = { kind: 'workout', title: 'RIR starter', days: [{ title: 'Training', exercises: [
    { dataset_id: 'rir-fixture', sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, rir: 2 },
  ] }] };
  await db.query("update security_private.starter_templates set payload=$1 where key='beginner-full-body'", [JSON.stringify(payload)]);
  const owner = await createUser(db, 'captain');
  expect((await db.query(`select e.rir from public.program_exercises e join public.program_days d on d.id=e.day_id
    join public.programs p on p.id=d.program_id where p.captain_id=$1 and p.title='RIR starter'`, [owner])).rows)
    .toEqual([{ rir: 2 }]);
});
