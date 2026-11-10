import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let players: string[];
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec('delete from auth.users');
  const team = await createCaptainWithPlayer(db, '2026-01-01');
  captain = team.captain;
  players = [team.player];
  for (let i = 1; i < 4; i++) {
    const player = await createUser(db, 'player');
    players.push(player);
    await db.query(`insert into public.coach_clients(captain_id,player_id,access_until,started_on)
      values($1,$2,'2028-12-31','2026-01-01')`, [captain, player]);
  }
  for (const [index, player] of players.entries()) {
    await db.query(`insert into public.programs(captain_id,player_id,title,status)
      values($1,$2,'Plan','active')`, [captain, player]);
    for (let day = 1; day <= ([5, 4, 1, 0][index] ?? 0); day++) {
      const session = (await db.query<{ id: string }>(`insert into public.workout_sessions
        (id,player_id,training_date,started_at,client_updated_at)
        values(gen_random_uuid(),$1,$2,$2::date,now()) returning id`,
      [player, `2026-11-0${day}`])).rows[0];
      await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
        values($1,$2,'workout',$3,3,'counted',$4)`, [player, captain, session?.id, `2026-11-0${day}`]);
    }
  }
  await db.exec("update public.coach_clients set access_until='2028-12-31'");
  await db.exec('delete from public.notifications');
});
const queue = (today = '2026-11-28') => db.query('select public.queue_crown_reminders($1)', [today]);
const notices = () => db.query<{ user_id: string; type: string; payload: Record<string, unknown> }>(
  "select user_id,type,payload from public.notifications where type in ('crown_close','crown_defend') order by type,user_id");

it('notifies the holder and reachable second and third players once per month', async () => {
  await queue();
  const rows = (await notices()).rows;
  expect(rows).toHaveLength(3);
  expect(rows.find(r => r.user_id === players[0])).toMatchObject({ type: 'crown_defend',
    payload: { captain_id: captain, month: '2026-11-01' } });
  expect(rows.find(r => r.user_id === players[1])).toMatchObject({ type: 'crown_close',
    payload: { needs_workouts: 0, gap: 14, captain_id: captain, month: '2026-11-01' } });
  expect(rows.find(r => r.user_id === players[2])).toMatchObject({ type: 'crown_close',
    payload: { needs_workouts: 3, gap: 51 } });
  expect(rows.some(r => r.user_id === players[3])).toBe(false);
  await queue();
  expect((await notices()).rows).toHaveLength(3);
});

it.each(['2026-02-26', '2028-02-27', '2026-04-28', '2026-07-29'])(
  'uses the third-to-last day for %s', async today => {
    await queue(today);
    // No workouts in these months: every chaser needs four workouts.
    expect((await notices()).rows).toHaveLength(0);
    await db.query(`update public.workout_sessions set training_date=$1::date + extract(day from training_date)::int - 1`,
      [today.slice(0, 7) + '-01']);
    await queue(today);
    expect((await notices()).rows).toHaveLength(3);
  });

it.each(['2026-11-27', '2026-11-29', '2026-11-30', null])('does nothing on %s', async today => {
  await db.query('select public.queue_crown_reminders($1)', [today]);
  expect((await notices()).rows).toHaveLength(0);
});

it('skips a chaser needing four workouts and an ineligible holder', async () => {
  await db.query('delete from public.points_log where player_id=$1', [players[2]]);
  await queue();
  expect((await notices()).rows).toHaveLength(2);
  await db.exec('delete from public.notifications; delete from public.points_log');
  await queue();
  expect((await notices()).rows).toHaveLength(0);
});

it('skips a one-player team', async () => {
  await db.query('update public.coach_clients set archived_at=now() where player_id<>$1', [players[0]]);
  await queue();
  expect((await notices()).rows).toHaveLength(0);
});

it('reminds a first-place player with two workouts to qualify for the crown', async () => {
  await db.exec("delete from public.points_log where kind='workout' and earned_on>'2026-11-02'; delete from public.notifications");
  await queue();
  const rows = (await notices()).rows;
  expect(rows.some(r => r.type === 'crown_defend')).toBe(false);
  const leader = (await db.query<{ player_id: string }>(
    "select player_id from security_private.points_board($1,'2026-11-01') where position=1", [captain])).rows[0];
  expect(rows.find(r => r.user_id === leader?.player_id)).toMatchObject({ type: 'crown_close',
    payload: { captain_id: captain, month: '2026-11-01', needs_workouts: 2, gap: 0 } });
  await queue();
  expect((await notices()).rows).toHaveLength(rows.length);
});

it.each(['pending', 'frozen', 'expired', 'sessions', 'suspended'])(
  'excludes a %s player from the active team size', async state => {
    await db.query('update public.coach_clients set archived_at=now() where player_id=any($1::uuid[])', [players.slice(2)]);
    const change = {
      pending: 'pending=true', frozen: 'frozen_at=now()', expired: "access_until='2026-11-27'",
      sessions: 'sessions_left=0', suspended: '',
    }[state];
    if (state === 'suspended') await db.query('update public.profiles set suspended_at=now() where id=$1', [players[1]]);
    else await db.query(`update public.coach_clients set ${change} where player_id=$1`, [players[1]]);
    await queue();
    expect((await notices()).rows).toHaveLength(0);
  });

it('defaults to the Cairo date across a UTC day boundary', async () => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-27T23:30:00Z' $$`);
  try {
    await db.query('select public.queue_crown_reminders()');
    expect((await notices()).rows).toHaveLength(3);
  } finally {
    await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
      as $$ select timestamptz '2026-11-03T10:00:00Z' $$`);
  }
});

it('keeps execution restricted to the owner', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege($1,'public.queue_crown_reminders(date)','execute') allowed", [role]);
    expect(result.rows[0]?.allowed).toBe(false);
  }
  const result = await db.query<{ prosecdef: boolean; proconfig: string[] }>(
    "select prosecdef,proconfig from pg_proc where oid='public.queue_crown_reminders(date)'::regprocedure");
  expect(result.rows[0]).toEqual({ prosecdef: true, proconfig: ['search_path=""'] });
});
