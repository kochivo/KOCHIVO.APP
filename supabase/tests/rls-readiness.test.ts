import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let otherCaptain: string;
let otherPlayer: string;
const id = '00000000-0000-7000-8000-000000000074';
const decisionId = '00000000-0000-7000-8000-000000000075';
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const payload = (water: number, time = '2026-11-04T08:00:00Z') => JSON.stringify([
  { id, log_date: '2026-11-04', sleep_hours: 8, soreness: 2, water_ml: water, client_updated_at: time },
]);

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });

it('allows own checks, captain read only and no cross-tenant reads', async () => {
  await run(player, 'select public.sync_daily_checks($1::jsonb)', [payload(250)]);
  for (const user of [player, captain]) expect((await run(user, 'select * from public.daily_checks')).rows).toHaveLength(1);
  for (const user of [otherCaptain, otherPlayer]) expect((await run(user, 'select * from public.daily_checks')).rows).toHaveLength(0);
  for (const user of [captain, otherCaptain, otherPlayer]) {
    expect((await run(user, 'update public.daily_checks set water_ml=500 returning id')).rows).toHaveLength(0);
    expect((await run(user, 'delete from public.daily_checks returning id')).rows).toHaveLength(0);
    await expect(run(user, `insert into public.daily_checks (id,player_id,log_date,client_updated_at)
      values (gen_random_uuid(),$1,'2026-11-05',now())`, [player])).rejects.toThrow(/row-level security/);
  }
  await expect(run(player, 'update public.daily_checks set player_id=$1', [otherPlayer])).rejects.toThrow(/permission denied/);
  expect((await run(player, 'update public.daily_checks set soreness=3 returning id')).rows).toHaveLength(1);
});

it('uses last writer wins and enforces ranges', async () => {
  await run(player, 'select public.sync_daily_checks($1::jsonb)', [payload(500, '2026-11-04T09:00:00Z')]);
  await run(player, 'select public.sync_daily_checks($1::jsonb)', [payload(250)]);
  await run(player, 'select public.sync_daily_checks($1::jsonb)', [payload(750, '2026-11-04T09:00:00Z')]);
  expect((await run(player, 'select water_ml from public.daily_checks')).rows).toEqual([{ water_ml: 500 }]);
  for (const assignment of ['sleep_hours=3', 'sleep_hours=10', 'soreness=0', 'soreness=6', 'water_ml=-1', 'water_ml=10001']) {
    await expect(run(player, `update public.daily_checks set ${assignment}`)).rejects.toThrow(/check constraint/);
  }
  expect((await run(player, 'update public.daily_checks set sleep_hours=null,soreness=null,water_ml=10000 returning id')).rows).toHaveLength(1);
});

it('allows only the assigned captain to write decisions and the player to read', async () => {
  const insert = (user: string, owner: string) => run(user, `insert into public.readiness_decisions
    (id,captain_id,player_id,decision_date,decision) values ($1,$2,$3,'2026-11-04','reduce')`, [decisionId, owner, player]);
  await expect(insert(otherCaptain, otherCaptain)).rejects.toThrow(/row-level security/);
  await expect(insert(player, player)).rejects.toThrow(/row-level security/);
  await insert(captain, captain);
  for (const user of [captain, player]) expect((await run(user, 'select * from public.readiness_decisions')).rows).toHaveLength(1);
  for (const user of [otherCaptain, otherPlayer]) expect((await run(user, 'select * from public.readiness_decisions')).rows).toHaveLength(0);
  for (const user of [player, otherCaptain, otherPlayer]) expect((await run(user, "update public.readiness_decisions set decision='rest' returning id")).rows).toHaveLength(0);
  expect((await run(captain, "update public.readiness_decisions set decision='rest' returning id")).rows).toHaveLength(1);
  await expect(run(captain, "update public.readiness_decisions set decision='invalid'")).rejects.toThrow(/check constraint/);
  await expect(run(captain, 'update public.readiness_decisions set player_id=$1', [otherPlayer])).rejects.toThrow(/row-level security/);
});

it('blocks suspended callers and anon on both tables', async () => {
  for (const table of ['daily_checks', 'readiness_decisions']) {
    await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query(`select * from public.${table}`); })).rejects.toThrow(/permission denied/);
    for (const user of [captain, player]) {
      await db.query('update public.profiles set suspended_at=now() where id=$1', [user]);
      try { expect((await run(user, `select * from public.${table}`)).rows).toHaveLength(0); }
      finally { await db.query('update public.profiles set suspended_at=null where id=$1', [user]); }
    }
  }
  expect((await run(player, 'delete from public.daily_checks returning id')).rows).toHaveLength(1);
});
