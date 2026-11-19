import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite, captain: string, player: string, otherCaptain: string, otherPlayer: string, link: string, pkg: string;
const id = '01900000-0000-7000-8000-000000000354';
const second = '01900000-0000-7000-8000-000000000355';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  otherCaptain = await createUser(db, 'captain'); otherPlayer = await createUser(db, 'player');
  link = (await db.query<{ id: string }>('select id from coach_clients where player_id=$1', [player])).rows[0]?.id ?? '';
  pkg = (await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,price_egp,days,max_freeze_days)
    values ($1,'Month',100,30,10) returning id`, [captain])).rows[0]?.id ?? '';
  await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end,package_id)
    values ($1,$2,30,'2026-11-01','2026-11-30',$3)`, [captain, player, pkg]);
});
beforeEach(async () => {
  await db.exec('delete from freeze_requests');
  await db.exec("delete from notifications where type in ('freeze_requested','freeze_approved','freeze_declined')");
  await db.query('update captain_packages set max_freeze_days=10 where id=$1', [pkg]);
  await db.query("update coach_clients set frozen_at=null,frozen_until=null,pending=false,access_until='2026-12-03' where id=$1", [link]);
});
afterAll(async () => { await db?.close(); });
const ask = (days = 3, request = id, user = player) => asUser(db, user, tx => tx.query(
  'select request_player_freeze($1,$2,$3,null)', [request, captain, days]));
const decide = (approve = true, user = captain) => asUser(db, user, tx => tx.query('select decide_freeze_request($1,$2)', [id, approve]));

it('lets the captain edit only their own bounded package allowance', async () => {
  await asUser(db, captain, tx => tx.query('update captain_packages set max_freeze_days=7 where id=$1', [pkg]));
  expect((await db.query('select max_freeze_days from captain_packages where id=$1', [pkg])).rows).toEqual([{ max_freeze_days: 7 }]);
  expect((await asUser(db, otherCaptain, tx => tx.query('update captain_packages set max_freeze_days=8 where id=$1 returning id', [pkg]))).rows).toEqual([]);
  await expect(asUser(db, captain, tx => tx.query('update captain_packages set max_freeze_days=91 where id=$1', [pkg]))).rejects.toThrow();
});
it('rejects disabled packages, invalid inputs and over-budget requests', async () => {
  for (const limit of [null, 0]) {
    await db.query('update captain_packages set max_freeze_days=$1 where id=$2', [limit, pkg]);
    await expect(ask()).rejects.toThrow(/freeze allowance/i);
  }
  await db.query('update captain_packages set max_freeze_days=10 where id=$1', [pkg]);
  for (const days of [0, 11, 91]) await expect(ask(days)).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query('select request_player_freeze($1,$2,1,$3)', [id, captain, 'x'.repeat(201)]))).rejects.toThrow();
});
it('uses the latest covering payment, excluding future and expired periods', async () => {
  await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end)
    values ($1,$2,1,'2026-11-02','2026-11-04')`, [captain, player]);
  await expect(ask()).rejects.toThrow(/freeze allowance/i);
  await db.query("delete from player_payments where player_id=$1 and package_id is null", [player]);
  await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end)
    values ($1,$2,1,'2026-12-01','2026-12-02'),($1,$2,1,'2026-10-01','2026-10-02')`, [captain, player]);
  await ask();
});
it('enforces one pending request and denies direct writes and foreign access', async () => {
  await ask();
  await expect(ask(1, second)).rejects.toMatchObject({ code: '23505' });
  for (const user of [otherPlayer, otherCaptain]) {
    expect((await asUser(db, user, tx => tx.query('select * from freeze_requests'))).rows).toEqual([]);
    await expect(decide(true, user)).rejects.toMatchObject({ code: '42501' });
  }
  await expect(ask(1, second, otherPlayer)).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query("update freeze_requests set status='approved'"))).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query('insert into freeze_requests(id,player_id,captain_id,days) values ($1,$2,$3,1)', [second, player, captain]))).rejects.toThrow();
  expect((await asUser(db, captain, tx => tx.query('select * from freeze_requests'))).rows).toHaveLength(1);
});
it('rejects pending, frozen, archived and expired links', async () => {
  for (const flags of ["pending=true", "pending=false,frozen_at=now()", "frozen_at=null,archived_at=now()", "archived_at=null,access_until='2026-11-02'"]) {
    await db.query(`update coach_clients set ${flags} where id=$1`, [link]);
    await expect(ask()).rejects.toThrow(/active unfrozen player link required/i);
    expect((await asUser(db, player, tx => tx.query('select remaining_freeze_days($1) as days', [captain]))).rows).toEqual([{ days: 0 }]);
  }
});
it('approves once, blocks writes and rejects a conflicting decision', async () => {
  await ask(); await decide(); await decide();
  expect((await db.query('select frozen_at is not null as frozen,frozen_until::text from coach_clients where id=$1', [link])).rows)
    .toEqual([{ frozen: true, frozen_until: '2026-11-06' }]);
  expect((await asUser(db, player, tx => tx.query('select player_can_write() as allowed'))).rows).toEqual([{ allowed: false }]);
  await expect(decide(false)).rejects.toThrow(/already decided/i);
  expect((await db.query("select type,payload->>'display_name' as actor from notifications where payload->>'request_id'=$1 order by type", [id])).rows)
    .toEqual([{ type: 'freeze_approved', actor: 'captain' }, { type: 'freeze_requested', actor: 'player' }]);
});
it('declines and cancels only pending owned requests', async () => {
  await ask(); await decide(false); await decide(false);
  await expect(decide()).rejects.toThrow(/already decided/i);
  await ask(1, second);
  await expect(asUser(db, otherPlayer, tx => tx.query('select cancel_freeze_request($1)', [second]))).rejects.toThrow();
  await asUser(db, player, tx => tx.query('select cancel_freeze_request($1)', [second]));
  expect((await db.query('select status from freeze_requests order by id')).rows).toEqual([{ status: 'declined' }, { status: 'cancelled' }]);
});
it('counts approved days in the current period and revalidates on approval', async () => {
  await ask(8); await decide();
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,false)', [link]));
  await expect(ask(3, second)).rejects.toThrow(/freeze allowance/i);
  await ask(2, second);
  await db.query('update captain_packages set max_freeze_days=9 where id=$1', [pkg]);
  await expect(asUser(db, captain, tx => tx.query('select decide_freeze_request($1,true)', [second]))).rejects.toThrow(/freeze allowance/i);
});
it('releases on the due date once, extends whole frozen days and preserves manual freezes', async () => {
  await ask(); await decide();
  await db.exec('select security_private.release_due_freezes()');
  expect((await db.query('select frozen_at is not null as frozen from coach_clients where id=$1', [link])).rows).toEqual([{ frozen: true }]);
  await db.query("update coach_clients set frozen_at=now()-interval '3 days',frozen_until='2026-11-03' where id=$1", [link]);
  await db.exec('select security_private.release_due_freezes(); select security_private.release_due_freezes()');
  expect((await db.query('select frozen_at,frozen_until,access_until::text from coach_clients where id=$1', [link])).rows)
    .toEqual([{ frozen_at: null, frozen_until: null, access_until: '2026-12-06' }]);
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,true)', [link]));
  await db.exec('select security_private.release_due_freezes()');
  expect((await db.query('select frozen_at is not null as frozen,frozen_until from coach_clients where id=$1', [link])).rows)
    .toEqual([{ frozen: true, frozen_until: null }]);
});
it('manual unfreeze clears the automatic return date', async () => {
  await ask(); await decide();
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,false)', [link]));
  expect((await db.query('select frozen_at,frozen_until from coach_clients where id=$1', [link])).rows)
    .toEqual([{ frozen_at: null, frozen_until: null }]);
});

it('restores access at Cairo midnight before the release job finalizes the freeze', async () => {
  await db.query("update profiles set timezone='Africa/Cairo' where id=$1", [captain]);
  await db.query(`update coach_clients set frozen_at='2026-11-03T10:00:00Z',
    frozen_until='2026-11-06',access_until='2026-11-04' where id=$1`, [link]);
  const clock = (at: string) => db.exec(`create or replace function pg_catalog.now() returns timestamptz
    language sql stable as $$ select timestamptz '${at}' $$;`);
  try {
    for (const [at, allowed] of [
      ['2026-11-05T21:59:59Z', false], ['2026-11-05T22:00:00Z', true], ['2026-11-06T05:00:00Z', true],
    ] as const) {
      await clock(at);
      const result = await asUser(db, player, tx => tx.query(
        'select player_can_read() as read, player_can_read_from($1) as scoped, player_can_write() as write', [captain]));
      expect(result.rows).toEqual([{ read: allowed, scoped: allowed, write: allowed }]);
    }
    expect((await db.query('select frozen_until::text from coach_clients where id=$1', [link])).rows)
      .toEqual([{ frozen_until: '2026-11-06' }]);
  } finally {
    await clock(TEST_NOW);
  }
});
