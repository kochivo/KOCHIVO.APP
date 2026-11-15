import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`delete from public.coach_clients;
    create or replace function pg_catalog.now() returns timestamptz language sql stable
      as $$ select timestamptz '2026-11-03T10:00:00Z' $$;`);
  await db.exec('discard plans');
});
const feed = (id: string) => asUser(db, id, tx => tx.query<{ kind: string; key: string; player_id: string }>('select * from public.ko_feed()'));

it('isolates captains and players and emits missing-plan rules', async () => {
  const a = await createCaptainWithPlayer(db);
  const b = await createCaptainWithPlayer(db);
  expect((await feed(a.captain)).rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'no_program', player_id: a.player }),
    expect.objectContaining({ kind: 'no_nutrition', player_id: a.player }),
  ]));
  expect((await feed(a.captain)).rows.every(row => row.player_id !== b.player)).toBe(true);
  expect((await feed(a.player)).rows).toEqual([]);
});

it.each([[3, 'expiring'], [4, 'expiring'], [7, 'expiring'], [8, null], [0, 'expiring'], [-1, 'expired'], [-7, 'expired'], [-8, null]] as const)
('checks access boundary %s', async (days, kind) => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query("update public.coach_clients set access_until=date '2026-11-03'+$2::int where player_id=$1", [player, days]);
  const rows = (await feed(captain)).rows.filter(row => ['expiring', 'expired'].includes(row.kind));
  expect(rows.map(row => row.kind)).toEqual(kind ? [kind] : []);
  expect((await feed(player)).rows.map(row => row.kind)).toEqual(kind === 'expiring' ? ['my_expiring'] : []);
});

it('keeps dismissals private, excludes them, and blocks suspended callers', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const key = `no_program:${player}:2026-11-03`;
  await asUser(db, captain, tx => tx.query('insert into public.ko_dismissals(key,until) values ($1,now()+interval \'24 hours\')', [key]));
  expect((await feed(captain)).rows.map(row => row.key)).not.toContain(key);
  expect((await asUser(db, player, tx => tx.query('select * from public.ko_dismissals'))).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query('insert into public.ko_dismissals(user_id,key,until) values ($1,$2,now())', [captain, key]))).rejects.toThrow();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  expect((await feed(captain)).rows).toEqual([]);
});

async function program(captain: string, player: string) {
  const { rows } = await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values ($1,$2,'Training','active') returning id`, [captain, player]);
  return rows[0]?.id;
}

it.each([['2026-10-29T10:00:00Z', true], ['2026-10-29T10:00:01Z', false]])
('checks inactivity at five days: %s', async (completed, expected) => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-01');
  await program(captain, player);
  await db.query(`insert into public.workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-10-29',$2,$2,$2)`, [player, completed]);
  expect((await asUser(db, captain, tx => tx.query('select completed_at from public.workout_sessions where player_id=$1', [player]))).rows).toHaveLength(1);
  expect((await feed(captain)).rows.some(row => row.kind === 'inactive')).toBe(expected);
});

it('reports depleted sessions and pending join requests only to their captain', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query('update public.coach_clients set sessions_left=0 where player_id=$1', [player]);
  expect((await feed(captain)).rows.some(row => row.kind === 'sessions_used_up')).toBe(true);
  await db.query('delete from public.coach_clients where player_id=$1', [player]);
  await db.query("update public.profiles set public_slug='feed-coach',role_confirmed=true where id=$1", [captain]);
  await db.query('insert into public.coach_join_requests(id,captain_id,player_id) values(gen_random_uuid(),$1,$2)', [captain, player]);
  expect((await feed(captain)).rows.map(row => row.kind)).toEqual(['join_requested']);
  expect((await feed(player)).rows).toEqual([]);
});

it.each([['2026-11-03T15:59:59Z', false], ['2026-11-03T16:00:00Z', true]])
('uses 18:00 Cairo for today workout: %s', async (now, expected) => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '${now}' $$`);
  // The SQL function caches plans that inline the harness clock's previous body.
  await db.exec('discard plans');
  const { captain, player } = await createCaptainWithPlayer(db);
  const id = await program(captain, player);
  // App weekdays start on Saturday (lib/dates weeklyWeekday), so Tuesday is 3, not Postgres dow 2.
  const day = await db.query<{ id: string }>(`insert into public.program_days(program_id,position,title,weekday)
    values($1,0,'Tuesday',3) returning id`, [id]);
  expect((await asUser(db, player, tx => tx.query('select id from public.program_days where id=$1', [day.rows[0]?.id]))).rows).toHaveLength(1);
  expect((await db.query("select (now() at time zone 'Africa/Cairo')::time::text as time")).rows).toEqual([{ time: now.includes('15:59') ? '17:59:59' : '18:00:00' }]);
  expect((await feed(player)).rows.some(row => row.kind === 'today_workout')).toBe(expected);
  await db.query(`insert into public.workout_sessions(id,player_id,program_day_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,'2026-11-03',now(),now(),now())`, [player, day.rows[0]?.id]);
  expect((await feed(player)).rows.some(row => row.kind === 'today_workout')).toBe(false);
});

it('offers meal logging until a completed, non-deleted meal is logged today', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into public.nutrition_plans(captain_id,player_id,title,status)
    values($1,$2,'Meals','active')`, [captain, player]);
  expect((await feed(captain)).rows.some(row => row.kind === 'no_nutrition')).toBe(false);
  expect((await feed(player)).rows.map(row => row.kind)).toEqual(['log_meal']);
  await db.query(`insert into public.meal_logs(id,player_id,log_date,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-11-03',now(),now())`, [player]);
  expect((await feed(player)).rows).toEqual([]);
  await db.query('update public.meal_logs set deleted_at=now() where player_id=$1', [player]);
  expect((await feed(player)).rows.map(row => row.kind)).toEqual(['log_meal']);
});

it('restores expired snoozes and grants only authenticated invoker execution', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const key = `no_program:${player}:2026-11-03`;
  await asUser(db, captain, tx => tx.query('insert into public.ko_dismissals(key,until) values($1,now())', [key]));
  expect((await feed(captain)).rows.map(row => row.key)).toContain(key);
  expect((await db.query("select prosecdef from pg_proc where oid='public.ko_feed()'::regprocedure")).rows).toEqual([{ prosecdef: false }]);
  expect((await db.query("select has_function_privilege('anon','public.ko_feed()','execute') as allowed")).rows).toEqual([{ allowed: false }]);
});

it('limits to eight rows and places urgent rules ahead of generate rules', async () => {
  const captain = await createUser(db, 'captain');
  for (let i = 0; i < 3; i++) {
    const player = await createUser(db, 'player');
    await db.query(`insert into public.coach_clients(captain_id,player_id,access_until,sessions_left)
      values($1,$2,'2026-11-06',0)`, [captain, player]);
  }
  const rows = await asUser(db, captain, tx => tx.query<{ severity: string }>('select * from public.ko_feed()'));
  expect(rows.rows).toHaveLength(8);
  expect(rows.rows.map(row => row.severity)).toEqual([...Array<string>(6).fill('urgent'), 'generate', 'generate']);
});

it('uses a new Cairo date key tomorrow even while yesterday is snoozed', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await asUser(db, captain, tx => tx.query(`insert into public.ko_dismissals(key,until)
    values($1,now()+interval '24 hours')`, [`no_program:${player}:2026-11-03`]));
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-03T22:00:00Z' $$;
    discard plans;`);
  expect((await feed(captain)).rows.map(row => row.key)).toContain(`no_program:${player}:2026-11-04`);
});
