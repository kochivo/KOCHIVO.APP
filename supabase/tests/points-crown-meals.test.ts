import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let captain: string, player: string, peer: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.query(`insert into security_private.app_secrets(name,value) values ('meal_receipt','meal-receipt-test-secret')
    on conflict (name) do update set value=excluded.value`);
  ({ captain, player } = await createCaptainWithPlayer(db));
  peer = await createUser(db, 'player');
  await db.query(`insert into public.coach_clients(captain_id,player_id,access_until)
    values ($1,$2,'2026-12-01')`, [captain, peer]);
});

interface BoardRow {
  player_id: string; lifetime: number; monthly: number; is_crown: boolean; position: number;
}
interface Points {
  lifetime: number; monthly: number; month_position: number; crown_gap: number;
  logs: { kind: string; points: number }[];
}
const board = () => asUser(db, captain,
  tx => tx.query<BoardRow>("select * from public.team_leaderboard('2026-11-01')"));
const mine = (who = player) => asUser(db, who,
  tx => tx.query<{ result: Points }>('select public.my_points() as result'));
const crowns = () => db.query(`select user_id,type from public.notifications
  where user_id in ($1,$2) and type in ('crown_taken','crown_lost')`, [player, peer]);
async function mealAward() {
  const { rows } = await db.query<{ receipt: string }>(`select
    encode(extensions.hmac($1 || ':2026-11-03','meal-receipt-test-secret','sha256'),'hex') as receipt`, [player]);
  return asUser(db, player, tx => tx.query("select public.award_meal_check('2026-11-03',$1)", [rows[0]?.receipt]));
}
async function meals(who: string, count: number) {
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on,created_at)
    select $1,$2,'meal_check',('2026-11-01'::date+i)::text,1,'counted','2026-11-01'::date+i,$4
    from generate_series(0,$3::int-1) i`, [who, captain, count, TEST_NOW]);
}
async function workout(who: string, points: number, at = TEST_NOW) {
  const program = (await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`, [captain, who])).rows[0]?.id;
  await db.query(`insert into public.program_days(program_id,position,weekday) values($1,0,1)`, [program]);
  const sessions = (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,training_date,started_at,client_updated_at)
    select gen_random_uuid(),$1,'2026-11-01'::date+i,$2,$2 from generate_series(0,3) i returning id`, [who, at])).rows;
  for (const [i, session] of sessions.entries()) {
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on,created_at)
    values ($1,$2,'workout',$5,$3,'counted','2026-11-01',$4)`, [who, captain, i === 0 ? points - 3 : 1, at, session.id]);
  }
}

it('keeps 25 meal checks in lifetime and logs without awarding a monthly crown', async () => {
  await meals(player, 25);
  expect((await board()).rows.find(r => r.player_id === player))
    .toMatchObject({ lifetime: 25, monthly: 0, is_crown: false });
  expect((await crowns()).rows).toEqual([]);
  const result = (await mine()).rows[0]?.result;
  expect(result).toMatchObject({ lifetime: 25, monthly: 0, crown_gap: 1 });
  expect(result?.logs).toHaveLength(10);
  expect(result?.logs.every(r => r.kind === 'meal_check' && r.points === 1)).toBe(true);
  const ledger = await db.query('select id from public.points_log where player_id=$1', [player]);
  expect(ledger.rows).toHaveLength(25);
});

it('breaks equal adherence by 21 workout points ahead of 20 plus five meals in every reader', async () => {
  await workout(player, 21);
  await workout(peer, 20);
  const before = (await crowns()).rows;
  await meals(peer, 5);
  expect((await board()).rows).toEqual([
    expect.objectContaining({ player_id: player, monthly: 50, lifetime: 21, is_crown: true, position: 1 }),
    expect.objectContaining({ player_id: peer, monthly: 50, lifetime: 25, is_crown: false, position: 2 }),
  ]);
  expect((await mine()).rows[0]?.result).toMatchObject({ monthly: 50, month_position: 1, crown_gap: 0 });
  expect((await mine(peer)).rows[0]?.result).toMatchObject({ monthly: 50, month_position: 2, crown_gap: 1 });
  expect((await crowns()).rows).toEqual(before);
});

it('still awards rank_up when the meal RPC takes lifetime from 99 to 100', async () => {
  await workout(player, 99);
  const before = (await crowns()).rows;
  await mealAward();
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 100, monthly: 50 });
  expect((await db.query(`select payload from public.notifications where user_id=$1 and type='rank_up'`, [player])).rows)
    .toEqual([{ payload: { tier: 'champion', lifetime: 100, medal: 'bronze' } }]);
  expect((await crowns()).rows).toEqual(before);
});

it('does not move the earliest-total tie-break or notify a crown swap on a meal insert', async () => {
  await workout(player, 20, '2026-11-01T08:00:00Z');
  await workout(peer, 20, '2026-11-01T09:00:00Z');
  const before = (await crowns()).rows;
  await mealAward();
  expect((await board()).rows.map(r => [r.player_id, r.monthly, r.is_crown, r.position]))
    .toEqual([[player, 50, true, 1], [peer, 50, false, 2]]);
  expect((await crowns()).rows).toEqual(before);
});

it('preserves private board execution restrictions after replacement', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    const privileges = await db.query<{ allowed: boolean }>(`select has_function_privilege($1,
      'security_private.points_board(uuid,date,public.points_log)','EXECUTE') as allowed`, [role]);
    expect(privileges.rows).toEqual([{ allowed: false }]);
  }
});
