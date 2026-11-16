import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

async function access(player: string, captain: string) {
  return (await asUser(db, player, tx => tx.query(`select public.player_can_read() as read,
    public.player_can_read_from($1) as scoped, public.player_can_write() as write`, [captain]))).rows;
}
const feed = async (user: string) => (await asUser(db, user,
  tx => tx.query<{ kind: string; data: { sessions_left: number | null } }>('select * from public.ko_feed()'))).rows;

it('keeps waiting access past provisional expiry and isolates the captain', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set access_until='2026-10-01',awaiting_plans_at=now() where player_id=$1`, [player]);
  expect(await access(player, captain)).toEqual([{ read: true, scoped: true, write: true }]);
  const other = await createUser(db, 'captain');
  expect((await access(player, other))[0]).toMatchObject({ scoped: false });
});

it.each(['pending=true', 'frozen_at=now()', 'archived_at=now()'])('preserves restriction %s while waiting', async restriction => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set awaiting_plans_at=now(),${restriction} where player_id=$1`, [player]);
  expect(await access(player, captain)).toEqual([{ read: false, scoped: false, write: false }]);
});

it.each([[0, true, true], [-1, true, false], [-3, true, false], [-4, false, false]] as const)
('preserves normal expiry and read grace at offset %s', async (days, read, write) => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set access_until=public.user_today(captain_id)+$2::int where player_id=$1`, [player, days]);
  expect(await access(player, captain)).toEqual([{ read, scoped: read, write }]);
});

it('blocks suspended waiting players', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query('update coach_clients set awaiting_plans_at=now() where player_id=$1', [player]);
  await db.query('update profiles set suspended_at=now() where id=$1', [player]);
  await expect(access(player, captain)).rejects.toMatchObject({ code: '42501' });
});

it('allows plan reads through RLS while waiting, then restores the expiry gate', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into programs(captain_id,player_id,title,status) values($1,$2,'Plan','active')`, [captain, player]);
  await db.query(`update coach_clients set access_until='2026-10-01',awaiting_plans_at=now() where player_id=$1`, [player]);
  const read = () => asUser(db, player, tx => tx.query('select id from programs where player_id=$1', [player]));
  expect((await read()).rows).toHaveLength(1);
  await db.query('update coach_clients set awaiting_plans_at=null where player_id=$1', [player]);
  expect((await read()).rows).toHaveLength(0);
});

it.each([3, -3, -40])('hides waiting expiry cards and keeps setup prompts at offset %s', async days => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set access_until=public.user_today(captain_id)+$2::int,
    awaiting_plans_at=now() where player_id=$1`, [player, days]);
  expect((await feed(captain)).map(row => row.kind)).toEqual(['no_program', 'no_nutrition']);
  expect(await feed(player)).toEqual([]);
});

it.each([null, 3, 0])('identifies session packages in expiry cards: %s', async sessions => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set access_until=public.user_today(captain_id)+3,
    sessions_left=$2 where player_id=$1`, [player, sessions]);
  expect((await feed(captain)).find(row => row.kind === 'expiring')?.data.sessions_left).toBe(sessions);
});

it('retains package tier access while waiting beyond provisional expiry', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const tier = (await db.query<{ id: string }>(`insert into captain_package_tiers(captain_id,name)
    values($1,'Tier') returning id`, [captain])).rows[0]?.id;
  const pkg = (await db.query<{ id: string }>(`insert into captain_packages(captain_id,tier_id,name,days,price_egp)
    values($1,$2,'Package',30,100) returning id`, [captain, tier])).rows[0]?.id;
  await db.query(`insert into player_payments(captain_id,player_id,package_id,days,period_start,period_end)
    values($1,$2,$3,30,'2026-10-01','2026-10-31')`, [captain, player, pkg]);
  await db.query(`update coach_clients set access_until='2026-10-31',awaiting_plans_at=now() where player_id=$1`, [player]);
  const read = (caller: string) => asUser(db, caller, tx => tx.query('select id from public.player_package_tier($1)', [player]));
  expect((await read(player)).rows).toEqual([{ id: tier }]);
  expect((await read(await createUser(db, 'captain'))).rows).toEqual([]);
  await db.query('update coach_clients set awaiting_plans_at=null where player_id=$1', [player]);
  expect((await read(player)).rows).toEqual([]);
});
