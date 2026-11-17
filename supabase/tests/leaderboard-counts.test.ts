import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });

it('counts distinct finished training dates regardless of points review, within the selected month', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-01');
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-17T12:00:00Z' $$`);
  for (const [date, finished] of [['2026-11-15', true], ['2026-11-16', true], ['2026-11-16', true],
    ['2026-11-17', false], ['2026-10-31', true], ['2026-11-18', true]] as const) {
    await db.query(`insert into public.workout_sessions
      (id,player_id,training_date,started_at,completed_at,client_updated_at)
      values(gen_random_uuid(),$1,$2,$2::date,case when $3 then $2::date+time '00:01' end,now())`,
    [player, date, finished]);
  }
  const board = await asUser(db, captain, tx => tx.query<{ done: number; monthly: number }>(
    `select done,monthly from public.team_leaderboard('2026-11-01') where player_id=$1`, [player]));
  expect(board.rows).toEqual([{ done: 2, monthly: 0 }]);
  expect((await asUser(db, captain, tx => tx.query<{ done: number }>(
    `select done from public.team_leaderboard('2026-10-01') where player_id=$1`, [player]))).rows).toEqual([{ done: 1 }]);
  const peer = await createUser(db, 'player', 'Peer Private');
  await db.query(`insert into public.coach_clients(captain_id,player_id,started_on,access_until)
    values($1,$2,'2026-10-01','2026-12-31')`, [captain, peer]);
  expect((await asUser(db, peer, tx => tx.query<{ player_id: string | null; done: number }>(
    `select player_id,done from public.team_leaderboard('2026-11-01') where display_name='player'`))).rows)
    .toEqual([{ player_id: null, done: 2 }]);
  await db.query(`update public.coach_clients set started_on='2026-11-16' where player_id=$1`, [player]);
  expect((await asUser(db, captain, tx => tx.query<{ done: number }>(
    `select done from public.team_leaderboard('2026-11-01') where player_id=$1`, [player]))).rows).toEqual([{ done: 1 }]);
  const other = await createUser(db, 'captain');
  expect((await asUser(db, other, tx => tx.query(`select * from public.team_leaderboard('2026-11-01')`))).rows).toEqual([]);
});

it('unions approved and finished days without duplicating them across captain month boundaries', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-01');
  await db.query(`update profiles set timezone=case when id=$1 then 'Europe/London' else 'Pacific/Auckland' end
    where id in ($1,$2)`, [captain, player]);
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-17T12:00:00Z' $$`);
  const add = async (trainingDate: string, completedAt: string | null, earnedOn: string | null) => {
    const session = (await db.query<{ id: string }>(`insert into workout_sessions
      (id,player_id,training_date,started_at,completed_at,client_updated_at)
      values(gen_random_uuid(),$1,$2,coalesce($3::timestamptz-interval '1 minute','2026-10-31T20:00Z'::timestamptz),$3,now()) returning id`,
    [player, trainingDate, completedAt])).rows[0]?.id;
    if (earnedOn) await db.query(`insert into points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
      values($1,$2,'workout',$3,3,'counted',$4)
      on conflict(player_id,kind,source_key) do update set status='counted',earned_on=excluded.earned_on`,
    [player, captain, session, earnedOn]);
  };
  await add('2026-11-01', null, '2026-10-31');
  await add('2026-11-01', '2026-10-31T22:30Z', null);
  await add('2026-11-01', '2026-11-01T10:00Z', null);
  const done = async (month: string) => (await asUser(db, captain, tx => tx.query<{ done: number }>(
    `select done from public.team_leaderboard($1) where player_id=$2`, [month, player]))).rows[0]?.done;
  expect(await done('2026-10-01')).toBe(1);
  expect(await done('2026-11-01')).toBe(1);
});
