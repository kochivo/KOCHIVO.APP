import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
beforeEach(async () => { await db.exec(`delete from public.payment_receipts; delete from public.chat_messages;`); });
afterAll(async () => { await db?.close(); });
const id = '019a5000-0000-7000-8000-000000000001';
async function fixture() {
  const { captain, player } = await createCaptainWithPlayer(db);
  const path = `${player}/${captain}/${id}.jpg`;
  await asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('payment-receipts',$1)`, [path]));
  return { captain, player, path };
}
async function submit(player: string, captain: string, path: string, receipt = id, request: string | null = null) {
  return asUser(db, player, tx => tx.query(`select public.submit_payment_receipt($1,$2,800,'instapay',$3,$4) as id`,
    [receipt, captain, path, request]));
}
it('installs a private images-only bucket with a 5 MB limit', async () => {
  expect((await db.query(`select public,file_size_limit,allowed_mime_types from storage.buckets where id='payment-receipts'`)).rows)
    .toEqual([{ public: false, file_size_limit: 5242880, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }]);
});
it('isolates receipt rows and photos from other players and captains, and blocks direct changes', async () => {
  const { captain, player, path } = await fixture();
  await submit(player, captain, path);
  for (const caller of [player, captain]) {
    expect((await asUser(db, caller, tx => tx.query('select id from public.payment_receipts'))).rows).toEqual([{ id }]);
    expect((await asUser(db, caller, tx => tx.query(`select name from storage.objects where bucket_id='payment-receipts'`))).rows).toEqual([{ name: path }]);
  }
  for (const caller of [await createUser(db, 'player'), await createUser(db, 'captain')]) {
    expect((await asUser(db, caller, tx => tx.query('select id from public.payment_receipts'))).rows).toEqual([]);
    expect((await asUser(db, caller, tx => tx.query(`select name from storage.objects where bucket_id='payment-receipts'`))).rows).toEqual([]);
    await expect(asUser(db, caller, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('payment-receipts',$1)`, [path])))
      .rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, caller, tx => tx.query(`select public.accept_payment_receipt($1,30,null,'Accepted')`, [id])))
      .rejects.toMatchObject({ code: '42501' });
  }
  await expect(asUser(db, player, tx => tx.query(`update public.payment_receipts set status='accepted'`)))
    .rejects.toMatchObject({ code: '42501' });
  await db.query(`delete from public.payment_receipts where id=$1`, [id]);
});
it('replaces a pending photo, extends once through manual renewal, and notifies once on retry', async () => {
  const { captain, player, path } = await fixture();
  await submit(player, captain, path);
  const next = `${player}/${captain}/019a5000-0000-7000-8000-000000000002.webp`;
  await asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('payment-receipts',$1)`, [next]));
  await submit(player, captain, next, '019a5000-0000-7000-8000-000000000003');
  expect((await db.query(`select id,photo_path from public.payment_receipts where player_id=$1`, [player])).rows).toEqual([{ id, photo_path: next }]);
  await expect(asUser(db, captain, tx => tx.query(`select public.accept_payment_receipt($1,30,null,'Accepted',$2,1)`, [id, path])))
    .rejects.toMatchObject({ code: '22023' });
  await expect(asUser(db, captain, tx => tx.query(`select public.decline_payment_receipt($1,'Unclear',$2,1)`, [id, path])))
    .rejects.toMatchObject({ code: '22023' });
  for (let retry = 0; retry < 2; retry++) await asUser(db, captain, tx => tx.query(`select public.accept_payment_receipt($1,30,null,'Accepted',$2,2)`, [id, next]));
  expect((await db.query(`select days,amount_egp,method,period_start::text,period_end::text from public.player_payments where player_id=$1`, [player])).rows)
    .toEqual([{ days: 30, amount_egp: 800, method: 'instapay', period_start: '2026-12-04', period_end: '2027-01-02' }]);
  expect((await db.query(`select status,decided_at is not null as decided from public.payment_receipts where id=$1`, [id])).rows)
    .toEqual([{ status: 'accepted', decided: true }]);
  expect((await asUser(db, player, tx => tx.query(`select body from public.chat_messages where id=$1`, [id]))).rows).toEqual([{ body: 'Accepted' }]);
  expect((await asUser(db, player, tx => tx.query(`select type from public.notifications where type='chat_message'`))).rows).toHaveLength(1);
  await db.query(`delete from public.payment_receipts where id=$1`, [id]);
});
it('requires a one-line decline reason and lets a player submit a new receipt', async () => {
  const { captain, player, path } = await fixture();
  await submit(player, captain, path);
  for (const reason of ['', '  ', 'a\nb', 'x'.repeat(201)]) await expect(asUser(db, captain, tx => tx.query(`select public.decline_payment_receipt($1,$2)`, [id, reason])))
    .rejects.toMatchObject({ code: '22023' });
  await asUser(db, captain, tx => tx.query(`select public.decline_payment_receipt($1,'Photo unclear',$2,1)`, [id, path]));
  expect((await asUser(db, player, tx => tx.query(`select decline_reason from public.payment_receipts where id=$1`, [id]))).rows).toEqual([{ decline_reason: 'Photo unclear' }]);
  await submit(player, captain, path, '019a5000-0000-7000-8000-000000000004');
  expect((await db.query(`select status from public.payment_receipts where player_id=$1 order by id`, [player])).rows).toEqual([{ status: 'declined' }, { status: 'pending' }]);
  await db.query(`delete from public.payment_receipts where player_id=$1`, [player]);
});
it('uses the selected renewal package and closes its request so it cannot renew again', async () => {
  const { captain, player, path } = await fixture();
  const request = '019a5000-0000-7000-8000-000000000020';
  const pkg = '019a5000-0000-7000-8000-000000000021';
  await db.query(`insert into public.captain_packages(id,captain_id,name,price_egp,days) values ($1,$2,'Monthly',800,30)`, [pkg, captain]);
  await asUser(db, player, tx => tx.query(`insert into public.player_renewal_requests(id,player_id,captain_id,package_id) values ($1,$2,$3,$4)`, [request, player, captain, pkg]));
  await submit(player, captain, path, id, request);
  for (const [caller, status] of [[player, 'cancelled'], [captain, 'approved']] as const) {
    await expect(asUser(db, caller, tx => tx.query(`select public.decide_player_renewal($1,$2)`, [request, status])))
      .rejects.toMatchObject({ code: '22023' });
  }
  await asUser(db, captain, tx => tx.query(`select public.accept_payment_receipt($1,null,null,'Accepted',$2,1)`, [id, path]));
  expect((await db.query(`select package_id,amount_egp,price_egp from public.player_payments where player_id=$1`, [player])).rows)
    .toEqual([{ package_id: pkg, amount_egp: 800, price_egp: 800 }]);
  expect((await db.query(`select status from public.player_renewal_requests where id=$1`, [request])).rows).toEqual([{ status: 'approved' }]);
  await expect(asUser(db, captain, tx => tx.query(`select public.decide_player_renewal($1,'approved')`, [request])))
    .rejects.toMatchObject({ code: '42501' });
  await db.query(`delete from public.payment_receipts where id=$1`, [id]);
});
it('rejects stale decisions even when a player reuses the same photo with a different amount', async () => {
  const { captain, player, path } = await fixture();
  await submit(player, captain, path);
  await asUser(db, player, tx => tx.query(`select public.submit_payment_receipt($1,$2,1,'cash',$3)`, [id, captain, path]));
  await expect(asUser(db, captain, tx => tx.query(`select public.accept_payment_receipt($1,30,null,'Accepted',$2,1)`, [id, path])))
    .rejects.toMatchObject({ code: '22023' });
  await expect(asUser(db, captain, tx => tx.query(`select public.decline_payment_receipt($1,'Unclear',$2,1)`, [id, path])))
    .rejects.toMatchObject({ code: '22023' });
  expect((await db.query(`select amount_egp,status,revision from public.payment_receipts where id=$1`, [id])).rows)
    .toEqual([{ amount_egp: 1, status: 'pending', revision: 2 }]);
});
it('rejects forged references, invalid amounts and methods, suspended callers, and photo overwrites', async () => {
  const { captain, player, path } = await fixture();
  const other = await createCaptainWithPlayer(db);
  for (const [amount, method] of [[0, 'cash'], [100001, 'cash'], [800, 'other']] as const) {
    await expect(asUser(db, player, tx => tx.query(`select public.submit_payment_receipt($1,$2,$3,$4,$5)`, [id, captain, amount, method, path])))
      .rejects.toMatchObject({ code: '23514' });
  }
  await expect(submit(player, other.captain, path)).rejects.toMatchObject({ code: '42501' });
  await expect(submit(player, captain, `${other.player}/${captain}/${id}.jpg`)).rejects.toMatchObject({ code: '22023' });
  await expect(submit(player, captain, path, id, '019a5000-0000-7000-8000-000000000099')).rejects.toMatchObject({ code: '22023' });
  await expect(asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('payment-receipts',$1)`, [`${player}/${captain}/${id}.svg`])))
    .rejects.toMatchObject({ code: '42501' });
  await submit(player, captain, path);
  await db.query(`update public.profiles set suspended_at=now() where id=$1`, [player]);
  expect((await asUser(db, player, tx => tx.query(`select id from public.payment_receipts`))).rows).toEqual([]);
  expect((await asUser(db, player, tx => tx.query(`select name from storage.objects where bucket_id='payment-receipts'`))).rows).toEqual([]);
  await expect(submit(player, captain, path)).rejects.toMatchObject({ code: '42501' });
  await db.query(`update public.profiles set suspended_at=null where id=$1`, [player]);
  await db.query(`update public.coach_clients set archived_at=now() where player_id=$1`, [player]);
  expect((await asUser(db, captain, tx => tx.query(`select id from public.payment_receipts`))).rows).toEqual([]);
  await expect(asUser(db, captain, tx => tx.query(`select public.accept_payment_receipt($1,30,null,'Accepted')`, [id])))
    .rejects.toMatchObject({ code: '42501' });
});
