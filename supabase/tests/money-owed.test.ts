import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
const owed = (captain: string) => asUser(db, captain, tx => tx.query(
  'select player_id,amount_egp,reason,since::text from public.captain_money_owed()'));
async function fixture(price: number | null = 1200, expired = true) {
  const pair = await createCaptainWithPlayer(db);
  await db.query(`update public.coach_clients set access_until=$1 where player_id=$2`,
    [expired ? '2026-10-30' : '2026-11-06', pair.player]);
  const { rows } = await db.query<{ id: string }>(`insert into public.captain_packages(captain_id,name,price_egp,days)
    values ($1,'Monthly',1200,30) returning id`, [pair.captain]);
  const packageId = rows[0]?.id;
  if (!packageId) throw new Error('Package fixture missing');
  await db.query(`insert into public.player_payments(captain_id,player_id,days,period_start,period_end,package_id,price_egp,amount_egp)
    values ($1,$2,30,'2026-10-01','2026-10-30',$3,$4,$4)`, [pair.captain, pair.player, price === null ? null : packageId, price]);
  return { ...pair, packageId };
}
it('reports expired package prices and preserves missing prices as null', async () => {
  for (const price of [1200, null]) {
    const f = await fixture(price);
    expect((await owed(f.captain)).rows).toEqual([{ player_id: f.player, amount_egp: price, reason: 'expired', since: '2026-10-30' }]);
  }
});
it('uses the requested package, then the receipt amount, without duplicating an expired player', async () => {
  const f = await fixture();
  await db.query(`update public.captain_packages set price_egp=1800 where id=$1`, [f.packageId]);
  const request = '019a5000-0000-7000-8000-000000000020';
  await db.query(`insert into public.player_renewal_requests(id,captain_id,player_id,package_id,created_at)
    values ($1,$2,$3,$4,'2026-11-01T23:30:00Z')`, [request, f.captain, f.player, f.packageId]);
  expect((await owed(f.captain)).rows).toEqual([{ player_id: f.player, amount_egp: 1800, reason: 'renewal_pending', since: '2026-11-02' }]);
  await db.query(`insert into public.payment_receipts(id,captain_id,player_id,renewal_request_id,amount_egp,photo_path,created_at)
    values ($1,$2,$3,$4,800,$5,'2026-11-02T23:30:00Z')`,
  ['019a5000-0000-7000-8000-000000000030', f.captain, f.player, request,
    `${f.player}/${f.captain}/019a5000-0000-7000-8000-000000000030.jpg`]);
  expect((await owed(f.captain)).rows).toEqual([{ player_id: f.player, amount_egp: 800, reason: 'receipt_pending', since: '2026-11-03' }]);
});
it('subtracts all collections from partial payments, and stops counting settled payments', async () => {
  const f = await fixture(1200, false);
  const payment = await db.query<{ id: string }>(`update public.player_payments set amount_egp=300 where player_id=$1 returning id`, [f.player]);
  for (const amount of [200, 100]) await db.query(`insert into public.payment_collections(payment_id,captain_id,player_id,amount_egp)
    values ($1,$2,$3,$4)`, [payment.rows[0]?.id, f.captain, f.player, amount]);
  expect((await owed(f.captain)).rows).toEqual([{ player_id: f.player, amount_egp: 600, reason: 'partial', since: '2026-11-03' }]);
  await db.query(`insert into public.payment_collections(payment_id,captain_id,player_id,amount_egp)
    values ($1,$2,$3,600)`, [payment.rows[0]?.id, f.captain, f.player]);
  expect((await owed(f.captain)).rows).toEqual([]);
});
it('preserves old installment debt alongside a renewal and then its receipt', async () => {
  const f = await fixture();
  await db.query('update public.player_payments set amount_egp=300 where player_id=$1', [f.player]);
  const request = await db.query<{ id: string }>(`insert into public.player_renewal_requests(id,captain_id,player_id,package_id)
    values ('019a5000-0000-7000-8000-000000000021',$1,$2,$3) returning id`, [f.captain, f.player, f.packageId]);
  expect((await owed(f.captain)).rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ reason: 'partial', amount_egp: 900 }),
    expect.objectContaining({ reason: 'renewal_pending', amount_egp: 1200 }),
  ]));
  await db.query(`insert into public.payment_receipts(id,captain_id,player_id,renewal_request_id,amount_egp,photo_path)
    values ('019a5000-0000-7000-8000-000000000031',$1,$2,$3,800,$4)`, [f.captain, f.player, request.rows[0]?.id,
    `${f.player}/${f.captain}/019a5000-0000-7000-8000-000000000031.jpg`]);
  const rows = (await owed(f.captain)).rows;
  expect(rows).toHaveLength(2);
  expect(rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ reason: 'partial', amount_egp: 900 }),
    expect.objectContaining({ reason: 'receipt_pending', amount_egp: 800 }),
  ]));
});
it.each([
  ['percent', 25, 900], ['amount', 200.5, 1000], ['amount', 2000, 0], ['bonus_days', 7, 1200],
] as const)('quotes %s offers exactly as approval records them', async (kind, value, expected) => {
  const f = await fixture();
  const offer = await db.query<{ id: string }>(`insert into public.captain_offers(captain_id,name,kind,value,starts_at,ends_at)
    values ($1,'Offer',$2,$3,'2026-11-01','2026-12-01') returning id`, [f.captain, kind, value]);
  const request = await db.query<{ id: string }>(`insert into public.player_renewal_requests(id,captain_id,player_id,package_id,offer_id)
    values ($5,$1,$2,$3,$4) returning id`, [f.captain, f.player, f.packageId, offer.rows[0]?.id, f.player]);
  expect((await owed(f.captain)).rows[0]).toMatchObject({ amount_egp: expected, reason: 'renewal_pending' });
  expect((await db.query<{ used_count: number }>('select used_count from public.captain_offers where id=$1', [offer.rows[0]?.id])).rows[0]?.used_count).toBe(0);
  await asUser(db, f.captain, tx => tx.query(`select public.decide_player_renewal($1,'approved')`, [request.rows[0]?.id]));
  const sale = await db.query<{ price_egp: number }>('select price_egp from public.player_payments where player_id=$1 and offer_id=$2', [f.player, offer.rows[0]?.id]);
  expect(sale.rows[0]?.price_egp).toBe(expected);
});
it.each(['expired', 'paused', 'full', 'new_only', 'wrong_package', 'wrong_tier'])(
  'falls back to list price when an offer becomes %s before approval', async condition => {
    const f = await fixture();
    const offer = await db.query<{ id: string }>(`insert into public.captain_offers(captain_id,name,kind,value,starts_at,ends_at)
      values ($1,'Offer','percent',25,'2026-11-01','2026-12-01') returning id`, [f.captain]);
    const offerId = offer.rows[0]?.id;
    await db.query(`insert into public.player_renewal_requests(id,captain_id,player_id,package_id,offer_id)
      values ($1,$2,$1,$3,$4)`, [f.player, f.captain, f.packageId, offerId]);
    const changes: Record<string, string> = {
      expired: "ends_at='2026-11-02'", paused: 'paused_at=now()', full: 'max_uses=1,used_count=1',
      new_only: 'for_renewals=false', wrong_package: "scope='packages',package_ids=array[gen_random_uuid()]",
      wrong_tier: "scope='tiers',tier_ids=array[gen_random_uuid()]",
    };
    // Valid owned targets make only the selected package ineligible.
    if (condition === 'wrong_package' || condition === 'wrong_tier') {
      const target = condition === 'wrong_package'
        ? await db.query<{ id: string }>(`insert into public.captain_packages(captain_id,name,price_egp,days) values ($1,'Other',100,30) returning id`, [f.captain])
        : await db.query<{ id: string }>(`insert into public.captain_package_tiers(captain_id,name) values ($1,'Other') returning id`, [f.captain]);
      const column = condition === 'wrong_package' ? 'package_ids' : 'tier_ids';
      await db.query(`update public.captain_offers set scope=$1,${column}=array[$2::uuid] where id=$3`,
        [condition === 'wrong_package' ? 'packages' : 'tiers', target.rows[0]?.id, offerId]);
    } else await db.query(`update public.captain_offers set ${changes[condition]} where id=$1`, [offerId]);
    expect((await owed(f.captain)).rows[0]).toMatchObject({ amount_egp: 1200, reason: 'renewal_pending' });
    const result = await asUser(db, f.captain, tx => tx.query<{ fallback: boolean }>(
      `select public.decide_player_renewal($1,'approved') as fallback`, [f.player]));
    expect(result.rows[0]?.fallback).toBe(true);
    expect((await owed(f.captain)).rows).toEqual([expect.objectContaining({ reason: 'partial', amount_egp: 1200 })]);
  },
);
it('restricts the RPC to active captains and their current non-pending players', async () => {
  const f = await fixture();
  expect((await owed(await createUser(db, 'captain'))).rows).toEqual([]);
  await expect(owed(f.player)).rejects.toMatchObject({ code: '42501' });
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    return tx.query('select * from public.captain_money_owed()');
  }))
    .rejects.toMatchObject({ code: '42501' });
  await db.query(`update public.coach_clients set pending=true where player_id=$1`, [f.player]);
  expect((await owed(f.captain)).rows).toEqual([]);
  await db.query(`update public.coach_clients set pending=false where player_id=$1`, [f.player]);
  await db.query(`update public.coach_clients set archived_at=now() where player_id=$1`, [f.player]);
  expect((await owed(f.captain)).rows).toEqual([]);
  await db.query(`update public.profiles set suspended_at=now() where id=$1`, [f.captain]);
  await expect(owed(f.captain)).rejects.toMatchObject({ code: '42501' });
});
it('uses the captain calendar day at the expiry boundary and stops reporting renewed subscriptions', async () => {
  const f = await fixture();
  await db.query(`update public.coach_clients set access_until='2026-11-03' where player_id=$1`, [f.player]);
  await db.query(`update public.profiles set timezone='Pacific/Honolulu' where id=$1`, [f.captain]);
  expect((await owed(f.captain)).rows).toEqual([]);
  await db.query(`update public.profiles set timezone='Pacific/Kiritimati' where id=$1`, [f.captain]);
  expect((await owed(f.captain)).rows).toEqual([{ player_id: f.player, amount_egp: 1200, reason: 'expired', since: '2026-11-03' }]);
  await db.query(`update public.coach_clients set access_until='2026-12-03' where player_id=$1`, [f.player]);
  expect((await owed(f.captain)).rows).toEqual([]);
});
