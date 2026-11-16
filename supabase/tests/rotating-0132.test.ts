import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-03T10:00Z' $$; discard plans;`);
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-11-01'));
  await db.query(`update coach_clients set access_until='2027-12-31' where player_id=$1`, [player]);
  await db.query(`insert into player_intake
    (player_id,birth_year,sex,height_cm,weight_kg,training_days,session_minutes,experience)
    values($1,1990,'male',180,80,'{6,2,4}',60,'new')`, [player]);
});
async function plan(weekday: number | null) {
  const id = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`, [captain, player])).rows[0]?.id;
  await db.query(`insert into program_days(program_id,position,title,weekday) values($1,0,'First',$2)`, [id, weekday]);
  return id;
}
async function reminders() {
  return (await db.query(`select payload from notifications where user_id=$1 and type='workout_reminder'`, [player])).rows;
}
it('preserves explicit slots and meal scheduling through save, copy and assignment', async () => {
  const source = (await db.query<{ id: string }>(`insert into nutrition_plans(captain_id,player_id,title)
    values($1,$2,'Meals') returning id`, [captain, player])).rows[0]?.id;
  await db.query(`insert into meals(plan_id,position,name,day_type,time_of_day,ramadan_slot)
    values($1,0,'Early','training','04:00','suhoor'),($1,1,'Evening','rest','18:00','iftar')`, [source]);
  const run = async (sql: string, args: (string | undefined)[]) =>
    (await asUser(db, captain, tx => tx.query<{ id: string }>(sql, args))).rows[0]?.id;
  const template = await run('select nutrition_plan_to_template($1,$2) id', [source, 'Template']);
  const copy = await run("select copy_template('nutrition',$1,$2) id", [template, 'Copy']);
  const assigned = await run('select assign_nutrition_template($1,$2) id', [copy, player]);
  const expected = (await db.query('select day_type,time_of_day,ramadan_slot from meals where plan_id=$1 order by position', [source])).rows;
  for (const id of [template, copy, assigned]) {
    expect((await db.query('select day_type,time_of_day,ramadan_slot from meals where plan_id=$1 order by position', [id])).rows).toEqual(expected);
  }
});
it.each([false, true])('keeps normal reminders eligible and deduplicated (weekly=%s)', async weekly => {
  await plan(weekly ? 3 : null);
  for (let run = 0; run < 2; run++) await db.exec("select queue_workout_reminders('2026-11-03')");
  expect(await reminders()).toHaveLength(1);
  await db.query('delete from notifications where user_id=$1', [player]);
  await db.exec("select queue_workout_reminders('2026-11-04')");
  expect(await reminders()).toHaveLength(0);
});
it('uses the next rotating day after the latest completed session', async () => {
  const id = await plan(null);
  await db.query(`insert into program_days(program_id,position,title) values($1,1,'Second')`, [id]);
  await db.query(`insert into workout_sessions(id,player_id,program_day_id,training_date,started_at,completed_at,client_updated_at)
    select gen_random_uuid(),$1,id,'2026-11-01','2026-11-01T08:00Z','2026-11-01T09:00Z',now()
    from program_days where program_id=$2 and position=0`, [player, id]);
  await db.exec("select queue_workout_reminders('2026-11-03')");
  expect(await reminders()).toEqual([{ payload: { day_title: 'Second', program_id: id, training_date: '2026-11-03' } }]);
});
it.each([false, true])('keeps Ramadan reminders eligible and deduplicated (weekly=%s)', async weekly => {
  await plan(weekly ? 3 : null);
  await db.query('update profiles set ramadan_mode=true where id=$1', [captain]);
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2027-02-16T18:00Z' $$; discard plans;`);
  await db.exec("select queue_workout_reminders('2027-02-16')");
  expect(await reminders()).toHaveLength(0);
  for (let run = 0; run < 2; run++) await db.exec("select security_private.queue_ramadan_reminders('2027-02-16T18:00Z')");
  expect(await reminders()).toHaveLength(1);
  await db.query('delete from notifications where user_id=$1', [player]);
  await db.exec("select security_private.queue_ramadan_reminders('2027-02-17T18:00Z')");
  expect(await reminders()).toHaveLength(0);
});
it.each([false, true])('counts November planned dates and retains weekly adherence (weekly=%s)', async weekly => {
  const id = await plan(weekly ? 0 : null);
  if (weekly) await db.query(`insert into program_days(program_id,position,weekday) values($1,1,3),($1,2,5)`, [id]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    select gen_random_uuid(),$1,date '2026-11-01'+n,'2026-11-01T08:00Z',now() from generate_series(0,7) n`, [player]);
  await db.query(`insert into points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    select $1,$2,'workout',id::text,3,'counted',training_date from workout_sessions where player_id=$1`, [player, captain]);
  expect((await db.query(`select adherence,done,planned from security_private.points_board($1,'2026-11-01')`, [captain])).rows)
    .toEqual([{ adherence: 67, done: 8, planned: 12 }]);
});
