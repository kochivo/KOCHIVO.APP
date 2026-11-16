import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite, captain: string, player: string, other: string, tier: string, pkg: string;
const ids = { tier: '01900000-0000-7000-8000-000000000206', pkg: '01900000-0000-7000-8000-000000000207' };
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (!file.startsWith('0099')) return;
    ({ captain, player } = await createCaptainWithPlayer(database));
    other = await createUser(database, 'captain');
    await database.query(`insert into captain_packages(id,captain_id,name,price_egp,days,archived_at)
      values ($1,$2,'Old',1500,30,'2026-01-01')`, [ids.pkg, captain]);
  });
  const result = await db.query<{ tier_id: string }>('select tier_id from captain_packages where id=$1', [ids.pkg]);
  tier = result.rows[0]?.tier_id ?? '';
  pkg = ids.pkg;
});
afterAll(async () => { await db?.close(); });

async function newOffer(patch: Record<string, unknown> = {}) {
  const row = { captain_id: captain, name: 'Sale', kind: 'percent', value: 20, scope: 'all',
    starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-11-10T00:00:00Z', ...patch };
  const result = await db.query<{ id: string }>(`insert into captain_offers
    select * from jsonb_populate_record(null::captain_offers,
      jsonb_build_object('id',security_private.starter_uuidv7(),'tier_ids','[]'::jsonb,'package_ids','[]'::jsonb,
        'for_new',true,'for_renewals',true,'used_count',0,'created_at',now()) || $1::jsonb) returning id`, [JSON.stringify(row)]);
  return result.rows[0]?.id ?? '';
}
const renew = (offerId: string | null, amount = 100) => asUser(db, captain, tx => tx.query(
  'select renew_player_offer($1,$2,p_package=>$3,p_amount=>$4)', [player, offerId, pkg, amount]));

it('backfills only the tier reference and preserves every old package field', async () => {
  expect((await db.query('select name,price_egp,days,archived_at::date::text from captain_packages where id=$1', [pkg])).rows)
    .toEqual([{ name: 'Old', price_egp: 1500, days: 30, archived_at: '2026-01-01' }]);
  expect((await db.query('select name from captain_package_tiers where id=$1', [tier])).rows).toEqual([{ name: 'أساسي' }]);
  await db.query('update captain_packages set archived_at=null where id=$1', [pkg]);
});
it('isolates owner writes, blocks players and other captains, and restricts suspended callers', async () => {
  for (const user of [player, other]) {
    expect((await asUser(db, user, tx => tx.query('select id from captain_package_tiers'))).rows).toEqual(user === player ? [{ id: tier }] : []);
    await expect(asUser(db, user, tx => tx.query(`insert into captain_package_tiers(id,captain_id,name)
      values ($1,$2,'Forbidden')`, [ids.tier, captain]))).rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, user, tx => tx.query(`insert into captain_offers(captain_id,name,kind,value,starts_at,ends_at)
      values ($1,'Forbidden','amount',1,'2026-11-01','2026-11-10')`, [captain]))).rejects.toMatchObject({ code: '42501' });
  }
  expect((await asUser(db, captain, tx => tx.query('select id from captain_package_tiers'))).rows).toHaveLength(1);
  await db.query('update profiles set suspended_at=$2 where id=$1', [captain, TEST_NOW]);
  expect((await asUser(db, captain, tx => tx.query('select id from captain_package_tiers'))).rows).toEqual([]);
  await expect(asUser(db, captain, tx => tx.query(`insert into captain_package_tiers(captain_id,name) values ($1,'Suspended')`, [captain])))
    .rejects.toMatchObject({ code: '42501' });
  await db.query('update profiles set suspended_at=null where id=$1', [captain]);
});
it('publishes active catalog rows and running offers only for eligible public coaches', async () => {
  const running = await newOffer(), scheduled = await newOffer({ starts_at: '2026-11-05' });
  const readAnon = () => db.transaction(async tx => { await tx.exec('set local role anon'); return tx.query('select id from captain_offers'); });
  expect((await readAnon()).rows).toEqual([]);
  await db.query("update profiles set public_slug='test-captain',role_confirmed=true where id=$1", [captain]);
  expect((await readAnon()).rows).toEqual([{ id: running }]);
  expect((await asUser(db, other, tx => tx.query('select id from captain_offers order by id'))).rows).toEqual([{ id: running }]);
  await db.query('update captain_offers set paused_at=now() where id=$1', [running]);
  expect((await readAnon()).rows).toEqual([]);
  await db.query('delete from captain_offers where id=any($1)', [[running, scheduled]]);
  await db.query('update profiles set public_slug=null where id=$1', [captain]);
});
it('allows captain CRUD while keeping counters, references and JSON validation protected', async () => {
  await asUser(db, captain, tx => tx.query(`insert into captain_package_tiers(id,captain_id,name)
    values ($1,$2,'Editable')`, [ids.tier, captain]));
  await asUser(db, captain, tx => tx.query("update captain_package_tiers set description='Edited' where id=$1", [ids.tier]));
  expect((await asUser(db, captain, tx => tx.query('select description from captain_package_tiers where id=$1', [ids.tier]))).rows)
    .toEqual([{ description: 'Edited' }]);
  for (const features of ['{}', '[1]', JSON.stringify(Array(11).fill('x')), JSON.stringify(['x'.repeat(81)])]) {
    await expect(db.query('update captain_package_tiers set features=$2 where id=$1', [ids.tier, features]))
      .rejects.toMatchObject({ code: '23514' });
  }
  const id = await newOffer();
  await expect(asUser(db, captain, tx => tx.query('update captain_offers set used_count=0 where id=$1', [id])))
    .rejects.toMatchObject({ code: '42501' });
  await asUser(db, captain, tx => tx.query('delete from captain_offers where id=$1', [id]));
  await asUser(db, captain, tx => tx.query('delete from captain_package_tiers where id=$1', [ids.tier]));
});
it('enforces one featured tier and same-captain package and offer references', async () => {
  await db.query('update captain_package_tiers set is_featured=true where id=$1', [tier]);
  await expect(db.query(`insert into captain_package_tiers(captain_id,name,is_featured) values ($1,'Duplicate',true)`, [captain]))
    .rejects.toMatchObject({ code: '23505' });
  await expect(newOffer({ tier_ids: [ids.tier], scope: 'tiers' })).rejects.toMatchObject({ code: '23514' });
  await expect(newOffer({ captain_id: other, package_ids: [pkg], scope: 'packages' })).rejects.toMatchObject({ code: '23514' });
  await expect(db.query(`insert into captain_packages(captain_id,name,days,price_egp,tier_id)
    values ($1,'Cross',30,10,$2)`, [other, tier])).rejects.toThrow();
});
it('refuses expired, paused, scheduled and full offers without payments or counter changes', async () => {
  for (const patch of [{ ends_at: '2026-11-02' }, { paused_at: TEST_NOW }, { max_uses: 1, used_count: 1 }, { starts_at: '2026-11-05' }]) {
    const id = await newOffer(patch);
    await expect(renew(id)).rejects.toMatchObject({ code: 'P0206' });
    expect((await db.query('select id from player_payments where offer_id=$1', [id])).rows).toEqual([]);
  }
});
it('snapshots discounted renewals and increments capacity atomically, rolling back failed payment writes', async () => {
  const id = await newOffer({ max_uses: 1 });
  await expect(renew(id, 1500)).rejects.toThrow();
  expect((await db.query('select used_count from captain_offers where id=$1', [id])).rows).toEqual([{ used_count: 0 }]);
  await renew(id);
  expect((await db.query(`select tier_id,offer_id,list_price_egp,price_egp,bonus_days from player_payments where offer_id=$1`, [id])).rows)
    .toEqual([{ tier_id: tier, offer_id: id, list_price_egp: 1500, price_egp: 1200, bonus_days: 0 }]);
  await expect(renew(id)).rejects.toMatchObject({ code: 'P0206' });
  expect((await db.query('select used_count from captain_offers where id=$1', [id])).rows).toEqual([{ used_count: 1 }]);
});
it('snapshots legacy renewals and activations and applies bonus days without changing PT quantities', async () => {
  await asUser(db, captain, tx => tx.query('select renew_player($1,p_package=>$2)', [player, pkg]));
  expect((await db.query('select id from player_payments where tier_id=$1 and list_price_egp=1500 and offer_id is null', [tier])).rows).toHaveLength(1);
  const id = await newOffer({ kind: 'bonus_days', value: 30 });
  await renew(id);
  expect((await db.query('select days,bonus_days from player_payments where offer_id=$1', [id])).rows).toEqual([{ days: 60, bonus_days: 30 }]);
  const link = (await db.query<{ id: string }>('select id from coach_clients where player_id=$1', [player])).rows[0]?.id;
  await db.query('update coach_clients set pending=true where id=$1', [link]);
  await asUser(db, captain, tx => tx.query("select activate_player_offer($1,$2,$3,'days',30,1500,0,false)", [link, id, pkg]));
  expect((await db.query('select used_count from captain_offers where id=$1', [id])).rows).toEqual([{ used_count: 2 }]);
});
it('supports the maximum package duration plus bonus days', async () => {
  await db.query('update captain_packages set days=365 where id=$1', [pkg]);
  const id = await newOffer({ kind: 'bonus_days', value: 365 });
  await renew(id);
  expect((await db.query('select days,bonus_days from player_payments where offer_id=$1', [id])).rows)
    .toEqual([{ days: 730, bonus_days: 365 }]);
  await db.query('update captain_packages set days=30 where id=$1', [pkg]);
});
it('checks offer scope, audience and caller before consuming an offer', async () => {
  const foreignTier = (await db.query<{ id: string }>(`insert into captain_package_tiers(captain_id,name) values ($1,'Other') returning id`, [captain])).rows[0]?.id;
  for (const patch of [{ for_renewals: false }, { scope: 'tiers', tier_ids: [foreignTier] }, { captain_id: other }]) {
    const id = await newOffer(patch);
    await expect(renew(id)).rejects.toMatchObject({ code: 'P0206' });
  }
  const id = await newOffer({ scope: 'tiers', tier_ids: [tier] });
  for (const user of [other, player]) {
    await expect(asUser(db, user, tx => tx.query('select renew_player_offer($1,$2,p_package=>$3)', [player, id, pkg])))
      .rejects.toMatchObject({ code: '42501' });
  }
  await renew(id);
  expect((await db.query('select used_count from captain_offers where id=$1', [id])).rows).toEqual([{ used_count: 1 }]);
});
it('reads only the current tier for the player or their own captain, including unpublished tiers', async () => {
  const read = (user: string) => asUser(db, user, tx => tx.query('select id from player_package_tier($1)', [player]));
  expect((await read(other)).rows).toEqual([]);
  expect((await read(player)).rows).toEqual([{ id: tier }]);
  expect((await read(captain)).rows).toEqual([{ id: tier }]);
  await db.query("update player_payments set period_start='2026-01-01',period_end='2026-01-30' where player_id=$1", [player]);
  // Unfreezing extends the link, not the immutable payment period.
  expect((await read(player)).rows).toEqual([{ id: tier }]);
  await db.query("update coach_clients set access_until='2026-01-30',awaiting_plans_at=null where player_id=$1", [player]);
  expect((await read(player)).rows).toEqual([]);
});
