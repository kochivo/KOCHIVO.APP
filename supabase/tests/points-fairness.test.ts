import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, day: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-03T10:00:00Z' $$`);
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-10-01'));
  const program = (await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values($1,$2,'Cardio','active') returning id`, [captain, player])).rows[0]?.id;
  day = (await db.query<{ id: string }>(`insert into public.program_days(program_id,position,weekday)
    values($1,0,1) returning id`, [program])).rows[0]?.id ?? '';
  await db.query(`insert into public.program_cardio(day_id,position,kind,minutes,intensity)
    values($1,0,'Walk',10,'low')`, [day]);
});
async function complete(who: string, date: string, minutes = 10, programDay: string | null = day) {
  return (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,program_day_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,$3::date+time '08:00',
      $3::date+time '08:00'+make_interval(mins=>$4),now()) returning id`,
  [who, programDay, date, minutes])).rows[0]?.id ?? '';
}
it('counts a short cardio-only workout, its adherence and perfect week, but flags insufficient duration', async () => {
  await complete(player, '2026-11-01', 9);
  expect((await db.query('select status from public.points_log where player_id=$1', [player])).rows)
    .toEqual([{ status: 'pending' }]);
  await complete(player, '2026-11-02');
  expect((await db.query(`select kind,status from public.points_log where player_id=$1
    and status='counted' order by kind`, [player])).rows)
    .toEqual([{ kind: 'perfect_week', status: 'counted' }, { kind: 'workout', status: 'counted' }]);
  expect((await asUser(db, player, tx => tx.query<{ p: { done: number } }>('select public.my_points() p'))).rows[0]?.p.done).toBe(1);
});
it('selects the first eligible live and frozen crown holder even below an ineligible bonus leader', async () => {
  for (const date of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']) await complete(player, date);
  const peer = await createUser(db, 'player');
  await db.query(`insert into public.coach_clients(captain_id,player_id,started_on,access_until)
    values($1,$2,'2026-10-01','2026-12-31')`, [captain, peer]);
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    values($1,$2,'pr','bonus',100,'counted','2026-10-10')`, [peer, captain]);
  const board = await asUser(db, captain, tx => tx.query<{ player_id: string }>(
    `select player_id from public.team_leaderboard('2026-10-01') where is_crown`));
  expect(board.rows).toEqual([{ player_id: player }]);
  expect((await db.query(`select id from public.notifications where user_id=$1 and type='crown_lost'`, [player])).rows).toEqual([]);
  await db.exec(`select public.queue_crown_reminders('2026-10-29')`);
  expect((await db.query(`select user_id from public.notifications where payload->>'captain_id'=$1
    and type='crown_defend'`, [captain])).rows).toEqual([{ user_id: player }]);
  await db.exec(`select security_private.freeze_crown_winners('2026-10-01')`);
  expect((await db.query('select player_id from public.crown_winners where captain_id=$1', [captain])).rows)
    .toEqual([{ player_id: player }]);
});
it('excludes old captains and pre-relationship completions from perfect weeks', async () => {
  const oldCaptain = await createUser(db, 'captain');
  await db.query(`update public.coach_clients set started_on='2026-11-02' where player_id=$1`, [player]);
  await db.query(`insert into public.program_days(program_id,position,weekday)
    select program_id,1,2 from public.program_days where id=$1`, [day]);
  await complete(player, '2026-10-31');
  const old = (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,training_date,started_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-11-01','2026-11-01T08:00:00Z',now()) returning id`, [player])).rows[0]?.id;
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    values($1,$2,'workout',$3,3,'counted','2026-11-01')`, [player, oldCaptain, old]);
  await db.query(`update public.workout_sessions set completed_at='2026-11-01T09:00:00Z' where id=$1`, [old]);
  await complete(player, '2026-11-02');
  expect((await db.query(`select id from public.points_log where player_id=$1 and kind='perfect_week'`, [player])).rows).toEqual([]);
  await complete(player, '2026-11-03');
  expect((await db.query(`select id from public.points_log where player_id=$1 and kind='perfect_week'`, [player])).rows).toHaveLength(1);
});
it('retains counted completions when their program day reference is removed', async () => {
  await db.query(`insert into public.program_days(program_id,position,weekday)
    select program_id,1,2 from public.program_days where id=$1`, [day]);
  const first = await complete(player, '2026-11-02');
  await db.query('update public.workout_sessions set program_day_id=null where id=$1', [first]);
  await complete(player, '2026-11-03');
  expect((await db.query(`select id from public.points_log where player_id=$1 and kind='perfect_week'`, [player])).rows).toHaveLength(1);
});
it('waits 48 hours for offline completions and freezes medals exactly once', async () => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-01T10:00:00Z' $$`);
  for (const date of ['2026-10-28', '2026-10-29', '2026-10-30']) await complete(player, date);
  await db.exec(`select security_private.freeze_crown_winners('2026-10-01')`);
  expect((await db.query('select * from public.crown_winners where captain_id=$1', [captain])).rows).toEqual([]);
  await complete(player, '2026-10-31');
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-02T21:59:59Z' $$`);
  await db.exec(`select security_private.freeze_crown_winners('2026-10-01')`);
  expect((await db.query('select * from public.crown_winners where captain_id=$1', [captain])).rows).toEqual([]);
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-02T22:00:00Z' $$`);
  await db.exec(`select security_private.freeze_crown_winners('2026-10-01');
    select security_private.freeze_crown_winners('2026-10-01');`);
  expect((await asUser(db, player, tx => tx.query<{ crowns: number }>('select * from public.my_medals()'))).rows[0]?.crowns).toBe(1);
  expect((await asUser(db, captain, tx => tx.query('select * from public.crown_hall_of_fame()'))).rows).toHaveLength(1);
});
