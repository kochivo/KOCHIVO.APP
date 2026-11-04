import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, other: string, program: string, day: string, rest: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'player');
  const p = await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,settings)
    values ($1,$2,'Week','{"repeatWeekly":false}') returning id`, [captain, player]);
  program = p.rows[0]?.id ?? '';
  const days = await db.query<{ id: string }>(`insert into public.program_days(program_id,position,weekday,is_rest_day)
    values ($1,1,0,false),($1,2,1,true) returning id`, [program]);
  day = days.rows[0]?.id ?? ''; rest = days.rows[1]?.id ?? '';
});
afterAll(async () => { await db?.close(); });
const insertCardio = (id: string) => asUser(db, id, tx => tx.query(`insert into public.program_cardio
  (day_id,position,kind,minutes,intensity,notes) values ($1,1,'Walk',20,'low','Easy')`, [day]));

it('allows captain CRUD and assigned player read, denies other players and anon', async () => {
  await insertCardio(captain);
  const ids = await db.query<{ id: string }>('select id from public.program_cardio');
  expect(ids.rows[0]?.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  await asUser(db, captain, tx => tx.query('select public.activate_program($1)', [program]));
  expect((await asUser(db, player, tx => tx.query('select * from public.program_cardio'))).rows).toHaveLength(1);
  expect((await asUser(db, other, tx => tx.query('select * from public.program_cardio'))).rows).toHaveLength(0);
  for (const id of [player, other]) {
    await expect(insertCardio(id)).rejects.toMatchObject({ code: '42501' });
    expect((await asUser(db, id, tx => tx.query('delete from public.program_cardio returning id'))).rows).toHaveLength(0);
    expect((await asUser(db, id, tx => tx.query("update public.program_cardio set minutes=30 returning id"))).rows).toHaveLength(0);
  }
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon'); await tx.query('select * from public.program_cardio');
  })).rejects.toMatchObject({ code: '42501' });
  await asUser(db, captain, tx => tx.query('update public.program_cardio set minutes=25 where day_id=$1', [day]));
  expect((await db.query('select minutes from public.program_cardio')).rows).toEqual([{ minutes: 25 }]);
});
it('copies weekdays, rest and cardio through program-to-template, editable copy and assignment', async () => {
  const template = await asUser(db, captain, tx => tx.query<{ id: string }>(
    "select public.program_to_template($1,'Weekly template') as id", [program]));
  const copy = await asUser(db, captain, tx => tx.query<{ id: string }>(
    "select public.copy_template('program',$1,'Copy') as id", [template.rows[0]?.id]));
  const assigned = await asUser(db, captain, tx => tx.query<{ id: string }>(
    'select public.assign_program_template($1,$2) as id', [copy.rows[0]?.id, player]));
  for (const id of [template.rows[0]?.id, copy.rows[0]?.id, assigned.rows[0]?.id]) {
    expect((await db.query('select weekday,is_rest_day from public.program_days where program_id=$1 order by position', [id])).rows)
      .toEqual([{ weekday: 0, is_rest_day: false }, { weekday: 1, is_rest_day: true }]);
    expect((await db.query(`select c.kind,c.minutes,c.intensity,c.notes from public.program_cardio c
      join public.program_days d on d.id=c.day_id where d.program_id=$1`, [id])).rows)
      .toEqual([{ kind: 'Walk', minutes: 25, intensity: 'low', notes: 'Easy' }]);
  }
  expect((await db.query<{ settings: Record<string, unknown> }>('select settings from public.programs where id=$1',
    [assigned.rows[0]?.id])).rows[0]?.settings).toMatchObject({ repeatWeekly: false, weeklyStartedOn: '2026-11-03' });
});
it('rejects exercises on rest days and turning populated days into rest directly', async () => {
  const exercise = await db.query<{ id: string }>("insert into public.exercises(name_en,body_part) values('Press','chest') returning id");
  await expect(asUser(db, captain, tx => tx.query(`insert into public.program_exercises
    (day_id,exercise_id,position,sets,reps_min) values($1,$2,1,3,8)`, [rest, exercise.rows[0]?.id])))
    .rejects.toMatchObject({ code: '23514' });
  await db.query(`insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min)
    values($1,$2,1,3,8)`, [day, exercise.rows[0]?.id]);
  await expect(asUser(db, captain, tx => tx.query('update public.program_days set is_rest_day=true where id=$1', [day])))
    .rejects.toMatchObject({ code: '23514' });
});
it('blocks a suspended captain', async () => {
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  await expect(insertCardio(captain)).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at=null where id=$1', [captain]);
  await asUser(db, captain, tx => tx.query('delete from public.program_cardio where day_id=$1', [day]));
  expect((await db.query('select * from public.program_cardio where day_id=$1', [day])).rows).toHaveLength(0);
});

it('saves rest clearing atomically and rolls back an invalid cardio block', async () => {
  await db.query(`update public.program_days set weekday=null where program_id=$1`, [program]);
  await db.query(`update public.programs set status='archived' where player_id=$1 and status='active'`, [player]);
  await db.query(`update public.programs set status='active',settings='{}' where id=$1`, [program]);
  const draft = { id: program, player_id: player, title: 'Updated', repeatWeekly: true, days: [
    { id: day, program_id: program, position: 1, title: '', weekday: 0, is_rest_day: true, exercises: [], cardio: [] },
    { id: rest, program_id: program, position: 2, title: '', weekday: 1, is_rest_day: false, exercises: [], cardio: [] },
  ] };
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)]));
  expect((await db.query<{ settings: unknown }>('select settings from public.programs where id=$1', [program])).rows[0]?.settings)
    .toMatchObject({ weeklyStartedOn: '2026-11-03' });
  expect((await db.query('select * from public.program_exercises where day_id=$1', [day])).rows).toHaveLength(0);
  expect((await db.query('select is_rest_day from public.program_days where id=$1', [day])).rows).toEqual([{ is_rest_day: true }]);
  const invalid = { ...draft, title: 'Should roll back', days: [{ ...draft.days[0], is_rest_day: false,
    cardio: [{ id: '01900000-0000-7000-8000-000000000001', day_id: day, position: 1, kind: 'Walk', minutes: 301, intensity: 'low', notes: '' }] }] };
  await expect(asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)', [JSON.stringify(invalid)])))
    .rejects.toMatchObject({ code: '23514' });
  expect((await db.query('select title from public.programs where id=$1', [program])).rows).toEqual([{ title: 'Updated' }]);
});
