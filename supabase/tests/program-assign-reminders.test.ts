import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { TEST_NOW, asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
const secret = 'program-reminder-test-signing-key-123456';
beforeAll(async () => {
  db = await createTestDb();
  await db.query('insert into security_private.ko_approval_config(signing_key) values($1)', [secret]);
});
afterAll(async () => { await db?.close(); });

it.each(['template', 'program'])('rejects an empty %s without archiving or starting the clock', async kind => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into programs(captain_id,player_id,title,status) values($1,$2,'Working','active')`, [captain, player]);
  await db.query(`insert into nutrition_plans(captain_id,player_id,title,status) values($1,$2,'Meals','active')`, [captain, player]);
  await db.query(`update coach_clients set awaiting_plans_at=now()-interval '5 days' where player_id=$1`, [player]);
  const before = (await db.query('select access_until,awaiting_plans_at,billing_started_at from coach_clients where player_id=$1', [player])).rows;
  const source = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,is_template,title)
    values($1,$2,$3,'Empty') returning id`, [captain, kind === 'template' ? null : player, kind === 'template'])).rows[0]?.id;
  await db.query(`insert into program_days(program_id,position,weekday,is_rest_day)
    select $1,n+1,n,n<>0 from generate_series(0,6) n`, [source]);
  await expect(asUser(db, captain, tx => kind === 'template'
    ? tx.query('select assign_program_template($1,$2)', [source, player])
    : tx.query('select activate_program($1)', [source]))).rejects.toMatchObject({ code: '22023' });
  expect((await db.query("select title from programs where player_id=$1 and status='active'", [player])).rows).toEqual([{ title: 'Working' }]);
  expect((await db.query('select access_until,awaiting_plans_at,billing_started_at from coach_clients where player_id=$1', [player])).rows).toEqual(before);
});

it.each(['exercise', 'cardio'])('assigns a template containing only %s and starts waiting access', async kind => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into nutrition_plans(captain_id,player_id,title,status) values($1,$2,'Meals','active')`, [captain, player]);
  await db.query(`update coach_clients set awaiting_plans_at=now()-interval '5 days' where player_id=$1`, [player]);
  const source = (await db.query<{ id: string }>(`insert into programs(captain_id,is_template,title) values($1,true,'Ready') returning id`, [captain])).rows[0]?.id;
  const day = (await db.query<{ id: string }>('insert into program_days(program_id,position,weekday) values($1,1,0) returning id', [source])).rows[0]?.id;
  if (kind === 'cardio') await db.query("insert into program_cardio(day_id,position,kind,minutes,intensity) values($1,1,'Walk',20,'low')", [day]);
  else {
    const exercise = (await db.query<{ id: string }>("insert into exercises(name_en,body_part) values('Press','chest') returning id")).rows[0]?.id;
    await db.query('insert into program_exercises(day_id,exercise_id,position,sets,reps_min) values($1,$2,1,3,8)', [day, exercise]);
  }
  await asUser(db, captain, tx => tx.query('select assign_program_template($1,$2)', [source, player]));
  expect((await db.query('select awaiting_plans_at from coach_clients where player_id=$1', [player])).rows).toEqual([{ awaiting_plans_at: null }]);
});

it.each(['normal', 'ramadan', 'ko'])('stops %s reminders exactly seven days after a finite weekly start', async mode => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const today = mode === 'ramadan' ? '2027-02-15' : '2026-11-03';
  await db.query(`update coach_clients set access_until='2030-01-01' where player_id=$1`, [player]);
  await db.query('update profiles set ramadan_mode=$2 where id=$1', [captain, mode === 'ramadan']);
  const program = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status,settings)
    values($1,$2,'Week','active',jsonb_build_object('repeatWeekly',false,'weeklyStartedOn',($3::date-7)::text)) returning id`, [captain, player, today])).rows[0]?.id;
  await db.query(`insert into program_days(program_id,position,weekday)
    values($1,1,(extract(dow from $2::date)::int+1)%7)`, [program, today]);
  const body = Buffer.from(JSON.stringify({ actor: captain, id: '00000000-0000-7000-8000-000000000123',
    player, kind: 'reminder', payload: { date: today }, expires: Date.parse(TEST_NOW) + 60_000 })).toString('base64url');
  const token = body + '.' + createHmac('sha256', secret).update(body).digest('hex');
  const queue = () => mode === 'normal' ? db.query('select queue_workout_reminders($1)', [today])
    : mode === 'ramadan' ? db.query('select security_private.queue_ramadan_reminders($1)', [today + 'T18:00:00Z'])
      : asUser(db, captain, tx => tx.query('select ko_private.workout_reminder($1)', [token]));
  const reminders = async () => (await db.query("select id from notifications where user_id=$1 and type='workout_reminder'", [player])).rows;
  await queue();
  expect(await reminders()).toHaveLength(0);
  await db.query(`update programs set settings=jsonb_set(settings,'{weeklyStartedOn}',to_jsonb(($2::date-6)::text)) where id=$1`, [program, today]);
  await queue();
  expect(await reminders()).toHaveLength(1);
  await db.query("delete from notifications where user_id=$1 and type='workout_reminder'", [player]);
  await db.query(`update programs set settings=jsonb_build_object('repeatWeekly',true,'weeklyStartedOn',($2::date-7)::text) where id=$1`, [program, today]);
  await queue();
  expect(await reminders()).toHaveLength(1);
  for (const settings of [
    { weeklyStartedOn: '2026-01-01' },
    { repeatWeekly: false },
    { repeatWeekly: false, weeklyStartedOn: '2030-01-01' },
  ]) {
    await db.query("delete from notifications where user_id=$1 and type='workout_reminder'", [player]);
    await db.query('update programs set settings=$2 where id=$1', [program, JSON.stringify(settings)]);
    await queue();
    expect(await reminders()).toHaveLength(1);
  }
  await db.query("delete from notifications where user_id=$1 and type='workout_reminder'", [player]);
  await db.query('update program_days set weekday=null where program_id=$1', [program]);
  await db.query(`insert into player_intake(player_id,training_days,birth_year,sex,height_cm,weight_kg,session_minutes,experience)
    values($1,$2,1990,'male',175,80,60,'new')`, [player, [mode === 'ramadan' ? 1 : 2]]);
  await db.query(`update programs set settings='{"repeatWeekly":false,"weeklyStartedOn":"2026-01-01"}' where id=$1`, [program]);
  await queue();
  expect(await reminders()).toHaveLength(1);
});
