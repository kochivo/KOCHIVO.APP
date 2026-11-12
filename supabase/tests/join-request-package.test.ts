import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, other: string, pkg: string, offer: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  await db.query("update profiles set public_slug='request-coach',role_confirmed=true where id=$1", [captain]);
  pkg = (await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,days,price_egp)
    values ($1,'Quarter',90,3000) returning id`, [captain])).rows[0]?.id ?? '';
  offer = (await db.query<{ id: string }>(`insert into captain_offers(captain_id,name,kind,value,starts_at,ends_at)
    values ($1,'Sale','percent',20,'2026-11-01','2026-11-10') returning id`, [captain])).rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });
async function request() {
  return (await asUser(db, player, tx => tx.query<{ id: string }>(`insert into player_renewal_requests
    (id,player_id,captain_id,package_id,offer_id) values (gen_random_uuid(),$1,$2,$3,$4) returning id`,
  [player, captain, pkg, offer]))).rows[0]?.id ?? '';
}
it('limits pending requests and isolates reads and decisions', async () => {
  const id = await request();
  await expect(request()).rejects.toMatchObject({ code: '23505' });
  expect((await asUser(db, other, tx => tx.query('select id from player_renewal_requests'))).rows).toEqual([]);
  await expect(asUser(db, other, tx => tx.query("select decide_player_renewal($1,'approved')", [id])))
    .rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query("update player_renewal_requests set status='approved' where id=$1", [id])))
    .rejects.toMatchObject({ code: '42501' });
  await asUser(db, player, tx => tx.query("select decide_player_renewal($1,'cancelled')", [id]));
});
it('approves once with authoritative pricing and atomically consumes the offer', async () => {
  const id = await request();
  await asUser(db, captain, tx => tx.query("select decide_player_renewal($1,'approved')", [id]));
  await expect(asUser(db, captain, tx => tx.query("select decide_player_renewal($1,'approved')", [id])))
    .rejects.toMatchObject({ code: '42501' });
  expect((await db.query('select price_egp,list_price_egp from player_payments where offer_id=$1', [offer])).rows)
    .toEqual([{ price_egp: 2400, list_price_egp: 3000 }]);
  expect((await db.query('select used_count from captain_offers where id=$1', [offer])).rows).toEqual([{ used_count: 1 }]);
});
it('falls back when an offer expires after the request', async () => {
  const id = await request();
  await db.query("update captain_offers set ends_at='2026-11-02' where id=$1", [offer]);
  expect((await asUser(db, captain, tx => tx.query<{ result: boolean }>(
    "select decide_player_renewal($1,'approved') as result", [id]))).rows).toEqual([{ result: true }]);
  expect((await db.query('select price_egp from player_payments where offer_id is null and package_id=$1', [pkg])).rows)
    .toEqual([{ price_egp: 3000 }]);
});
it('rejects cross-captain targets and ignores expired join offers while exposing duration', async () => {
  const joiner = await createUser(db, 'player');
  await asUser(db, joiner, tx => tx.query(`insert into coach_join_requests(id,player_id,captain_id,package_id,offer_id)
    values ('01900000-0000-7000-8000-000000000208',$1,$2,$3,$4)`, [joiner, captain, pkg, offer]));
  expect((await asUser(db, captain, tx => tx.query('select package_days,offer_id from pending_coach_join_packages()'))).rows)
    .toEqual([{ package_days: 90, offer_id: null }]);
  await expect(asUser(db, joiner, tx => tx.query(`insert into coach_join_requests(id,player_id,captain_id,package_id)
    values ('01900000-0000-7000-8000-000000000209',$1,$2,$3)`, [joiner, other, pkg])))
    .rejects.toMatchObject({ code: '23514' });
  expect((await asUser(db, other, tx => tx.query('select id from coach_join_requests'))).rows).toEqual([]);
});

it('guards renewal targets, immutable selection columns and server notifications', async () => {
  const foreignPackage = (await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,days,price_egp)
    values ($1,'Foreign',30,1000) returning id`, [other])).rows[0]?.id;
  const foreignOffer = (await db.query<{ id: string }>(`insert into captain_offers(captain_id,name,kind,value,starts_at,ends_at)
    values ($1,'Foreign','percent',10,'2026-11-01','2026-11-10') returning id`, [other])).rows[0]?.id;
  for (const [packageId, offerId] of [[foreignPackage, null], [pkg, foreignOffer]]) {
    await expect(asUser(db, player, tx => tx.query(`insert into player_renewal_requests
      (id,player_id,captain_id,package_id,offer_id) values (gen_random_uuid(),$1,$2,$3,$4)`,
    [player, captain, packageId, offerId]))).rejects.toMatchObject({ code: '23514' });
  }
  const id = await request();
  expect((await asUser(db, captain, tx => tx.query('select id from player_renewal_requests where id=$1', [id]))).rows).toHaveLength(1);
  expect((await asUser(db, captain, tx => tx.query('select type,payload from notifications where id=$1', [id]))).rows)
    .toEqual([{ type: 'renewal_requested', payload: expect.objectContaining({ player_id: player, request_id: id }) }]);
  await expect(asUser(db, player, tx => tx.query('update player_renewal_requests set package_id=$1 where id=$2', [pkg, id])))
    .rejects.toMatchObject({ code: '42501' });
  await asUser(db, captain, tx => tx.query("select decide_player_renewal($1,'declined')", [id]));
});

it('rolls an unsuccessful approval back without consuming an offer or deciding the request', async () => {
  await db.query("update captain_offers set ends_at='2026-11-10' where id=$1", [offer]);
  const id = await request();
  await db.query('update coach_clients set frozen_at=now() where player_id=$1 and captain_id=$2', [player, captain]);
  const payments = (await db.query('select id from player_payments where player_id=$1', [player])).rows.length;
  await expect(asUser(db, captain, tx => tx.query("select decide_player_renewal($1,'approved')", [id]))).rejects.toThrow();
  expect((await db.query('select status from player_renewal_requests where id=$1', [id])).rows).toEqual([{ status: 'pending' }]);
  expect((await db.query('select used_count from captain_offers where id=$1', [offer])).rows).toEqual([{ used_count: 1 }]);
  expect((await db.query('select id from player_payments where player_id=$1', [player])).rows).toHaveLength(payments);
  await db.query('update coach_clients set frozen_at=null where player_id=$1 and captain_id=$2', [player, captain]);
  await asUser(db, player, tx => tx.query("select decide_player_renewal($1,'cancelled')", [id]));
});

it('revalidates join activation against current catalog prices and expired offers', async () => {
  for (const expired of [false, true]) {
    const joiner = await createUser(db, 'player');
    await db.query("update captain_offers set ends_at='2026-11-10' where id=$1", [offer]);
    const requestId = (await asUser(db, joiner, tx => tx.query<{ id: string }>(`insert into coach_join_requests
      (id,player_id,captain_id,package_id,offer_id) values (gen_random_uuid(),$1,$2,$3,$4) returning id`,
    [joiner, captain, pkg, offer]))).rows[0]?.id;
    const link = requestId;
    await asUser(db, captain, tx => tx.query("select resolve_coach_join_request($1,'accepted',$2)", [requestId, link]));
    await db.query('update captain_packages set price_egp=4000 where id=$1', [pkg]);
    if (expired) await db.query("update captain_offers set ends_at='2026-11-02' where id=$1", [offer]);
    expect((await asUser(db, captain, tx => tx.query<{ fallback: boolean }>(
      'select activate_join_package($1,$2,0) as fallback', [link, pkg]))).rows).toEqual([{ fallback: expired }]);
    expect((await db.query('select price_egp,list_price_egp,offer_id from player_payments where player_id=$1', [joiner])).rows)
      .toEqual([{ price_egp: expired ? 4000 : 3200, list_price_egp: 4000, offer_id: expired ? null : offer }]);
  }
});

it('keeps the selected offer when the captain activates a pending player directly from the roster', async () => {
  const joiner = await createUser(db, 'player');
  await db.query("update captain_offers set ends_at='2026-11-10' where id=$1", [offer]);
  const id = (await asUser(db, joiner, tx => tx.query<{ id: string }>(`insert into coach_join_requests
    (id,player_id,captain_id,package_id,offer_id) values (gen_random_uuid(),$1,$2,$3,$4) returning id`,
  [joiner, captain, pkg, offer]))).rows[0]?.id;
  await asUser(db, captain, tx => tx.query('select activate_join_package($1,$2,0)', [id, pkg]));
  expect((await db.query('select price_egp,offer_id from player_payments where player_id=$1', [joiner])).rows)
    .toEqual([{ price_egp: 3200, offer_id: offer }]);
});
