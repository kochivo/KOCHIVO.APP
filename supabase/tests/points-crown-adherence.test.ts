import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let captain: string, player: string, peer: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-11-01'));
  peer = await createUser(db, 'player', 'Omar Private');
  await db.query(`insert into public.coach_clients(captain_id,player_id,access_until,started_on)
    values($1,$2,'2026-12-31','2026-11-01')`, [captain, peer]);
});
interface Row { player_id: string | null; monthly: number; adherence: number; done: number; planned: number;
  is_crown: boolean; display_name: string; position: number }
const board = (who = captain, month = '2026-11-01') => asUser(db, who,
  tx => tx.query<Row>('select * from public.team_leaderboard($1)', [month]));
const mine = (who = player) => asUser(db, who,
  tx => tx.query<{ result: Record<string, unknown> }>('select public.my_points() result'));
async function plan(who: string, weekdays: number[]) {
  const p = (await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`, [captain, who])).rows[0]?.id;
  await db.query(`insert into public.program_days(program_id,position,weekday)
    select $1,i,w from unnest($2::int[]) with ordinality t(w,i)`, [p, weekdays]);
}
async function award(who: string, kind: string, key: string, points = 3, status = 'counted', date = '2026-11-03') {
  return (await db.query<{ id: string }>(`insert into public.points_log
    (player_id,captain_id,kind,source_key,points,status,earned_on,created_at)
    values($1,$2,$3,$4,$5,$6,$7,$8) returning id`, [who, captain, kind, key, points, status, date, TEST_NOW])).rows[0]?.id ?? '';
}
async function workout(who: string, date: string, status = 'counted') {
  const id = (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,training_date,started_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$2::date,now()) returning id`, [who, date])).rows[0]?.id ?? '';
  return award(who, 'workout', id, 3, status, date);
}
async function days(who: string, count: number) {
  for (let i = 1; i <= count; i++) await workout(who, `2026-11-${String(i).padStart(2, '0')}`);
}
it('ranks adherence fairly across three and six day plans with equal raw points', async () => {
  await plan(player, [1, 3, 5]); await plan(peer, [0, 1, 2, 3, 4, 5]);
  await days(player, 13); await days(peer, 13);
  const rows = (await board()).rows;
  expect(rows[0]).toMatchObject({ player_id: player, adherence: 100, planned: 13, done: 13, monthly: 100, is_crown: true });
  expect(rows[1]).toMatchObject({ adherence: 50, planned: 26, done: 13 });
});
it('uses PR and InBody bonuses then raw points, excluding meals and perfect weeks from score', async () => {
  await plan(player, [1]); await plan(peer, [1]); await days(player, 8); await days(peer, 8);
  await award(peer, 'pr', 'pr', 1);
  expect((await board()).rows[0]).toMatchObject({ player_id: peer, monthly: 101 });
  await award(player, 'pr', 'pr', 1); await award(player, 'perfect_week', 'week', 10);
  expect((await board()).rows[0]).toMatchObject({ player_id: player, monthly: 101 });
  await award(player, 'meal_check', 'meal', 1);
  expect((await board()).rows[0]?.monthly).toBe(101);
  await award(peer, 'inbody', 'scan', 5);
  expect((await board()).rows[0]).toMatchObject({ player_id: peer, monthly: 106 });
});
it('requires four distinct counted training dates and emits one swap after late sets', async () => {
  await plan(player, [1]); await plan(peer, [1]); await days(player, 3);
  await workout(player, '2026-11-01');
  expect((await board()).rows.some(r => r.is_crown)).toBe(false);
  await days(peer, 4);
  await award(player, 'pr', 'bonus', 10);
  const day = (await db.query<{ id: string }>(`select d.id from public.program_days d
    join public.programs p on p.id=d.program_id where p.player_id=$1`, [player])).rows[0]?.id;
  const exercise = (await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
    values('Lift','legs') returning id`)).rows[0]?.id;
  await db.query(`insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min,rest_seconds)
    values($1,$2,0,10,8,60)`, [day, exercise]);
  const baseline = (await db.query<{ id: string }>(`select id from public.workout_sessions
    where player_id=$1 and training_date='2026-11-01' limit 1`, [player])).rows[0]?.id;
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,0,50,8,'2026-11-01T08:05Z',now())`, [baseline, player, exercise]);
  const session = (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,program_day_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,'2026-11-04','2026-11-04T08:00Z','2026-11-04T09:00Z',now()) returning id`, [player, day])).rows[0]?.id;
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,0,60,8,'2026-11-04T08:05Z',now())`, [session, player, exercise]);
  expect((await db.query(`select kind,status from public.points_log where source_key=$1 or source_key like $1||':%' order by kind`, [session])).rows)
    .toEqual([{ kind: 'pr', status: 'pending' }, { kind: 'workout', status: 'pending' }]);
  await workout(player, '2026-11-05', 'rejected');
  expect((await board()).rows.find(r => r.player_id === player)?.done).toBe(3);
  await db.query(`delete from public.notifications where type in ('crown_taken','crown_lost')`);
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,60,8,'2026-11-04T08:05Z',now() from generate_series(1,5) i`, [session, player, exercise]);
  expect((await db.query(`select kind,status from public.points_log where source_key=$1 or source_key like $1||':%' order by kind`, [session])).rows)
    .toEqual([{ kind: 'pr', status: 'counted' }, { kind: 'workout', status: 'counted' }]);
  expect((await board()).rows[0]).toMatchObject({ player_id: player, done: 4, is_crown: true });
  expect((await db.query(`select user_id,type from public.notifications where type in ('crown_taken','crown_lost')`)).rows)
    .toEqual(expect.arrayContaining([{ user_id: player, type: 'crown_taken' }, { user_id: peer, type: 'crown_lost' }]));
  expect((await db.query(`select id from public.notifications where type in ('crown_taken','crown_lost')`)).rows).toHaveLength(2);
  await db.query(`update public.set_logs set client_updated_at=now() where session_id=$1`, [session]);
  expect((await db.query(`select id from public.notifications where type in ('crown_taken','crown_lost')`)).rows).toHaveLength(2);
});
it('floors late joiners at eight and returns holder and chaser progress', async () => {
  await plan(player, [0, 1, 2, 3, 4, 5, 6]); await plan(peer, [1]);
  await db.query(`update public.coach_clients set started_on='2026-11-25' where player_id=$1`, [player]);
  await workout(player, '2026-11-25'); await workout(player, '2026-11-26'); await days(peer, 4);
  expect((await mine()).rows[0]?.result).toMatchObject({ adherence: 25, done: 2, planned: 8, monthly: 25,
    crown_gap: 26, crown_needs_workouts: 2 });
  expect((await mine(peer)).rows[0]?.result).toMatchObject({ crown_gap: 0, crown_needs_workouts: 0, done: 4 });
});
it('keeps players without a program visible with zero adherence and no crown', async () => {
  await days(player, 4);
  expect((await board()).rows.find(r => r.player_id === player)).toMatchObject({ adherence: 0, monthly: 0, is_crown: false });
});
it('takes the crown on the fourth date while three dates stay below the eight-day floor', async () => {
  await plan(player, [1]); await days(player, 3);
  expect((await board()).rows[0]).toMatchObject({ done: 3, planned: 8, adherence: 38, is_crown: false });
  await workout(player, '2026-11-04');
  expect((await board()).rows[0]).toMatchObject({ done: 4, is_crown: true });
  expect((await db.query(`select type from public.notifications where user_id=$1 and type='crown_taken'`, [player])).rows)
    .toEqual([{ type: 'crown_taken' }]);
});
it('returns empty progress for a player without a team', async () => {
  const unlinked = await createUser(db, 'player');
  expect((await mine(unlinked)).rows[0]?.result).toMatchObject({ adherence: 0, done: 0, planned: 8,
    crown_gap: 1, crown_needs_workouts: 4, month_position: null });
});
it('preserves player privacy and uses the current program for past months', async () => {
  await plan(player, [1]); await days(player, 4);
  expect((await board(player)).rows.find(r => r.display_name === 'Omar')).toMatchObject({ player_id: null });
  expect((await board(player)).rows.find(r => r.player_id === player)?.display_name).toBe('player');
  expect((await board(captain, '2026-10-01')).rows.every(r => r.monthly === 0)).toBe(true);
});
it('recalculates historical adherence with the current weekdays and uses training dates for done', async () => {
  await db.query(`update public.coach_clients set started_on='2026-10-01' where player_id=$1`, [player]);
  await plan(player, [1]);
  const id = (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,training_date,started_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-10-31',$2,$2) returning id`, [player, TEST_NOW])).rows[0]?.id ?? '';
  await award(player, 'workout', id);
  expect((await board(captain, '2026-10-01')).rows.find(r => r.player_id === player))
    .toMatchObject({ done: 1, planned: 8, adherence: 13 });
  await db.query(`insert into public.program_days(program_id,position,weekday)
    select p.id,w,w from public.programs p cross join generate_series(2,6) w where p.player_id=$1`, [player]);
  expect((await board(captain, '2026-10-01')).rows.find(r => r.player_id === player))
    .toMatchObject({ done: 1, planned: 26, adherence: 4 });
  expect((await board()).rows.find(r => r.player_id === player)?.done).toBe(0);
});
