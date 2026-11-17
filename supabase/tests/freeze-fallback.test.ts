import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, other: string, payment: string;
const request = '01900000-0000-7000-8000-000000000357';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  payment = (await db.query<{ id: string }>(`insert into player_payments(captain_id,player_id,days,bonus_days,period_start,period_end)
    values ($1,$2,35,5,'2026-11-01','2026-12-05') returning id`, [captain, player])).rows[0]?.id ?? '';
});
beforeEach(async () => {
  await db.exec('delete from freeze_requests; delete from captain_freeze_settings');
  await db.query('update player_payments set package_id=null where id=$1', [payment]);
  await db.exec('delete from captain_packages');
  await db.query('update coach_clients set frozen_at=null,frozen_until=null where player_id=$1', [player]);
});
afterAll(async () => { await db?.close(); });
async function pkg(days: number, limit: number | null, owner = captain, extra = '') {
  return (await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,price_egp,days,max_freeze_days${extra ? ',created_at' : ''})
    values ($1,'Plan',100,$2,$3${extra ? ',$4' : ''}) returning id`, extra ? [owner, days, limit, extra] : [owner, days, limit])).rows[0]?.id ?? '';
}
async function allowance() {
  return (await asUser(db, player, tx => tx.query<{ days: number }>('select remaining_freeze_days($1) as days', [captain]))).rows[0]?.days;
}
async function defaults(days: number | null, owner = captain) {
  await db.query('insert into captain_freeze_settings(captain_id,default_days) values ($1,$2)', [owner, days]);
}
it('preserves a linked allowance including zero, even for an archived package', async () => {
  const linked = await pkg(60, 7);
  await pkg(30, 12); await defaults(20);
  await db.query('update player_payments set package_id=$1 where id=$2', [linked, payment]);
  await db.query('update captain_packages set archived_at=now() where id=$1', [linked]);
  expect(await allowance()).toBe(7);
  await db.query('update captain_packages set max_freeze_days=0 where id=$1', [linked]);
  expect(await allowance()).toBe(0);
});
it('matches paid days excluding bonuses and picks newest created_at then id', async () => {
  await pkg(30, 5, captain, '2026-10-01');
  const first = await pkg(30, 8, captain, '2026-10-02');
  const second = await pkg(30, 9, captain, '2026-10-02');
  await pkg(35, 20); await defaults(25);
  expect(await allowance()).toBe(first > second ? 8 : 9);
});
it('falls through a linked null allowance to a matching package', async () => {
  const linked = await pkg(60, null);
  await db.query('update player_payments set package_id=$1 where id=$2', [linked, payment]);
  await pkg(30, 6);
  expect(await allowance()).toBe(6);
});
it('ignores archived, session and null-allowance matches and uses the captain default', async () => {
  const archived = await pkg(30, 15), sessions = await pkg(30, 18);
  await db.query('update captain_packages set archived_at=now() where id=$1', [archived]);
  await db.query("update captain_packages set kind='sessions',sessions=10 where id=$1", [sessions]);
  await pkg(30, null); await defaults(4);
  expect(await allowance()).toBe(4);
});
it('returns zero without settings, with null or zero, and never uses foreign packages or defaults', async () => {
  await pkg(30, 30, other); await defaults(40, other);
  expect(await allowance()).toBe(0);
  await defaults(null); expect(await allowance()).toBe(0);
  await db.query('update captain_freeze_settings set default_days=0 where captain_id=$1', [captain]);
  expect(await allowance()).toBe(0);
});
it('subtracts only current-period approved days and floors at zero', async () => {
  await defaults(6);
  await db.query(`insert into freeze_requests(id,player_id,captain_id,days,status,decided_at) values
    ($1,$2,$3,4,'approved','2026-11-02'),
    ('01900000-0000-7000-8000-000000000358',$2,$3,20,'approved','2026-10-31'),
    ('01900000-0000-7000-8000-000000000359',$2,$3,10,'declined','2026-11-02')`, [request, player, captain]);
  expect(await allowance()).toBe(2);
  await db.query('update captain_freeze_settings set default_days=3 where captain_id=$1', [captain]);
  expect(await allowance()).toBe(0);
});
it.each(['package', 'default'])('accepts a request through the %s fallback and approves with the same allowance', async source => {
  if (source === 'package') await pkg(30, 5); else await defaults(5);
  await asUser(db, player, tx => tx.query('select request_player_freeze($1,$2,5,null)', [request, captain]));
  expect((await db.query('select status from freeze_requests where id=$1', [request])).rows).toEqual([{ status: 'pending' }]);
  await asUser(db, captain, tx => tx.query('select decide_freeze_request($1,true)', [request]));
  expect((await db.query('select status from freeze_requests where id=$1', [request])).rows).toEqual([{ status: 'approved' }]);
});
it('allows only captains to read and write their own bounded settings', async () => {
  await asUser(db, captain, tx => tx.query('insert into captain_freeze_settings(captain_id,default_days) values ($1,5)', [captain]));
  await asUser(db, captain, tx => tx.query('update captain_freeze_settings set default_days=8 where captain_id=$1', [captain]));
  expect((await asUser(db, captain, tx => tx.query('select default_days from captain_freeze_settings'))).rows).toEqual([{ default_days: 8 }]);
  for (const user of [other, player]) {
    expect((await asUser(db, user, tx => tx.query('select * from captain_freeze_settings'))).rows).toEqual([]);
    expect((await asUser(db, user, tx => tx.query('update captain_freeze_settings set default_days=9 returning captain_id'))).rows).toEqual([]);
    await expect(asUser(db, user, tx => tx.query('insert into captain_freeze_settings(captain_id) values ($1)', [captain]))).rejects.toThrow();
  }
  await expect(asUser(db, player, tx => tx.query('insert into captain_freeze_settings(captain_id) values ($1)', [player]))).rejects.toThrow();
  for (const days of [-1, 91]) await expect(asUser(db, captain, tx => tx.query('update captain_freeze_settings set default_days=$1', [days]))).rejects.toThrow();
});
