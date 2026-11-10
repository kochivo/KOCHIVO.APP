import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string, day: string, exercise: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-11-01'));
  const program = (await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`, [captain, player])).rows[0]?.id;
  day = (await db.query<{ id: string }>(`insert into public.program_days(program_id,position,weekday)
    values($1,0,1) returning id`, [program])).rows[0]?.id ?? '';
  exercise = (await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
    values('Lift','legs') returning id`)).rows[0]?.id ?? '';
  await db.query(`insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min,rest_seconds)
    values($1,$2,0,10,8,60)`, [day, exercise]);
});
async function session(date = '2026-11-03') {
  return (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,program_day_id,training_date,started_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,$3::date+time '08:00',now()) returning id`, [player, day, date])).rows[0]?.id ?? '';
}
async function sets(id: string, start: number, end: number, weight = 60, date = '2026-11-03') {
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,$6,8,$7::date+time '08:05',now() from generate_series($4::int,$5::int) i`,
  [id, player, exercise, start, end, weight, date]);
}
const finish = (id: string, minutes = 60) => db.query(`update public.workout_sessions
  set completed_at=started_at+make_interval(mins=>$2) where id=$1`, [id, minutes]);
const logs = () => db.query<{ kind: string; status: string; points: number }>(
  'select kind,status,points from public.points_log where player_id=$1 order by kind', [player]);
const mine = () => asUser(db, player, tx => tx.query<{ result: Record<string, unknown> }>(
  'select public.my_points() result'));

it('blocks manual status changes and removes the review RPC for captain and player', async () => {
  await finish(await session());
  for (const who of [captain, player]) {
    for (const status of ['counted', 'rejected'])
      await expect(asUser(db, who, tx => tx.query('update public.points_log set status=$2 where player_id=$1', [player, status])))
        .rejects.toMatchObject({ code: '42501' });
    for (const approve of [true, false])
      await expect(asUser(db, who, tx => tx.query('select public.review_points($1,$2)', [player, approve])))
        .rejects.toMatchObject({ code: '42883' });
  }
  expect((await logs()).rows).toEqual([{ kind: 'workout', status: 'pending', points: 3 }]);
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 0, monthly: 0, done: 0 });
});
it('keeps flagged workouts and PRs uncounted, then counts them and the week exactly once after late sets', async () => {
  const baseline = await session('2026-11-01');
  await sets(baseline, 0, 0, 50, '2026-11-01');
  const id = await session();
  await sets(id, 0, 0);
  await finish(id);
  const pending = [{ kind: 'pr', status: 'pending', points: 1 }, { kind: 'workout', status: 'pending', points: 3 }];
  expect((await logs()).rows).toEqual(pending);
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 0, monthly: 0, done: 0, adherence: 0 });
  await db.query('update public.set_logs set client_updated_at=now() where session_id=$1', [id]);
  expect((await logs()).rows).toEqual(pending);
  await sets(id, 1, 4);
  expect((await logs()).rows).toEqual(pending);
  await sets(id, 5, 5);
  const counted = [
    { kind: 'perfect_week', status: 'counted', points: 10 },
    { kind: 'pr', status: 'counted', points: 1 }, { kind: 'workout', status: 'counted', points: 3 },
  ];
  expect((await logs()).rows).toEqual(counted);
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 14, monthly: 14, done: 1, adherence: 13 });
  await sets(id, 6, 9);
  await db.query('update public.set_logs set client_updated_at=now() where session_id=$1', [id]);
  expect((await logs()).rows).toEqual(counted);
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 14, monthly: 14, done: 1 });
});
it('keeps a workout pending when late sets cannot clear the duration flag', async () => {
  const id = await session();
  await finish(id, 19);
  await sets(id, 0, 9);
  expect((await logs()).rows).toEqual([{ kind: 'workout', status: 'pending', points: 3 }]);
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 0, monthly: 0, done: 0 });
});
it('preserves historical approvals, rejections and pending rows through migration 0084', async () => {
  let historicalPlayer = '';
  let before: unknown[] = [];
  const upgraded = await createTestDb(async (file, previous) => {
    if (file !== '0084_automatic_ranks.sql') return;
    const team = await createCaptainWithPlayer(previous);
    historicalPlayer = team.player;
    await previous.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
      select $1,$2,'workout',key,3,'pending','2026-11-03' from unnest(array['approved','rejected','pending']) key`,
    [team.player, team.captain]);
    for (const [key, approve] of [['approved', true], ['rejected', false]] as const) {
      const id = (await previous.query<{ id: string }>('select id from public.points_log where player_id=$1 and source_key=$2',
        [team.player, key])).rows[0]?.id;
      await asUser(previous, team.captain, tx => tx.query('select public.review_points($1,$2)', [id, approve]));
    }
    before = (await previous.query('select * from public.points_log where player_id=$1 order by source_key', [team.player])).rows;
  });
  try {
    expect((await upgraded.query('select * from public.points_log where player_id=$1 order by source_key', [historicalPlayer])).rows)
      .toEqual(before);
    expect((await upgraded.query('select status from public.points_log where player_id=$1 order by source_key', [historicalPlayer])).rows)
      .toEqual([{ status: 'counted' }, { status: 'pending' }, { status: 'rejected' }]);
    expect((await upgraded.query('select lifetime from public.player_points where player_id=$1', [historicalPlayer])).rows)
      .toEqual([{ lifetime: 3 }]);
  } finally { await upgraded.close(); }
});
