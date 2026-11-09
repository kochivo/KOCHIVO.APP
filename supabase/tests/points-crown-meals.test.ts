import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let captain: string, player: string, peer: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
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
async function meals(who: string, count: number) {
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on,created_at)
    select $1,$2,'meal_check',('2026-11-01'::date+i)::text,1,'counted','2026-11-01'::date+i,$4
    from generate_series(0,$3::int-1) i`, [who, captain, count, TEST_NOW]);
}
async function workout(who: string, points: number, at = TEST_NOW) {
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on,created_at)
    values ($1,$2,'workout','training',$3,'counted','2026-11-01',$4)`, [who, captain, points, at]);
}

it('keeps 25 meal checks in lifetime and logs without awarding a monthly crown', async () => {
  await meals(player, 25);
  expect((await board()).rows.find(r => r.player_id === player))
    .toMatchObject({ lifetime: 25, monthly: 0, is_crown: false });
  expect((await crowns()).rows).toEqual([]);
  const result = (await mine()).rows[0]?.result;
  expect(result).toMatchObject({ lifetime: 25, monthly: 0, crown_gap: 20 });
  expect(result?.logs).toHaveLength(10);
  expect(result?.logs.every(r => r.kind === 'meal_check' && r.points === 1)).toBe(true);
  const ledger = await db.query('select id from public.points_log where player_id=$1', [player]);
  expect(ledger.rows).toHaveLength(25);
});

it('ranks 21 workout points ahead of 20 plus five meals in every monthly reader', async () => {
  await workout(player, 21);
  await workout(peer, 20);
  const before = (await crowns()).rows;
  await meals(peer, 5);
  expect((await board()).rows).toEqual([
    expect.objectContaining({ player_id: player, monthly: 21, lifetime: 21, is_crown: true, position: 1 }),
    expect.objectContaining({ player_id: peer, monthly: 20, lifetime: 25, is_crown: false, position: 2 }),
  ]);
  expect((await mine()).rows[0]?.result).toMatchObject({ monthly: 21, month_position: 1, crown_gap: 0 });
  expect((await mine(peer)).rows[0]?.result).toMatchObject({ monthly: 20, month_position: 2, crown_gap: 2 });
  expect((await crowns()).rows).toEqual(before);
});

it('still awards rank_up when the meal RPC takes lifetime from 99 to 100', async () => {
  await workout(player, 99);
  const before = (await crowns()).rows;
  await asUser(db, player, tx => tx.query('select public.award_meal_check()'));
  expect((await mine()).rows[0]?.result).toMatchObject({ lifetime: 100, monthly: 99 });
  expect((await db.query(`select payload from public.notifications where user_id=$1 and type='rank_up'`, [player])).rows)
    .toEqual([{ payload: { tier: 'champion', lifetime: 100 } }]);
  expect((await crowns()).rows).toEqual(before);
});

it('does not move the earliest-total tie-break or notify a crown swap on a meal insert', async () => {
  await workout(player, 20, '2026-11-01T08:00:00Z');
  await workout(peer, 20, '2026-11-01T09:00:00Z');
  const before = (await crowns()).rows;
  await asUser(db, player, tx => tx.query('select public.award_meal_check()'));
  expect((await board()).rows.map(r => [r.player_id, r.monthly, r.is_crown, r.position]))
    .toEqual([[player, 20, true, 1], [peer, 20, false, 2]]);
  expect((await crowns()).rows).toEqual(before);
});

it('preserves private board execution restrictions after replacement', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    const privileges = await db.query<{ allowed: boolean }>(`select has_function_privilege($1,
      'security_private.points_board(uuid,date,public.points_log)','EXECUTE') as allowed`, [role]);
    expect(privileges.rows).toEqual([{ allowed: false }]);
  }
});
