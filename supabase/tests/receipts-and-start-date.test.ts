import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('collects old debt without days, a new sale, or extra access, and retries once', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end,price_egp,amount_egp)
    values($1,$2,30,'2026-09-01','2026-09-30',500,100),($1,$2,30,'2026-10-01','2026-10-30',500,200)`, [captain, player]);
  const id = '019a5000-0000-7000-8000-000000000090';
  const path = `${player}/${captain}/${id}.jpg`;
  await asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values('payment-receipts',$1)`, [path]));
  await asUser(db, player, tx => tx.query(`select submit_payment_receipt($1,$2,600,'instapay',$3)`, [id, captain, path]));
  await expect(asUser(db, captain, tx => tx.query(`select accept_payment_receipt($1,null,null,'Accepted',$2,2)`, [id, path])))
    .rejects.toThrow(/receipt changed/);
  for (let i = 0; i < 2; i++) await asUser(db, captain, tx => tx.query(`select accept_payment_receipt($1,null,null,'Accepted',$2,1)`, [id, path]));
  expect((await db.query(`select amount_egp,method from payment_collections where player_id=$1 order by amount_egp desc`, [player])).rows)
    .toEqual([{ amount_egp: 400, method: 'instapay' }, { amount_egp: 200, method: 'instapay' }]);
  expect((await db.query(`select id from player_payments where player_id=$1`, [player])).rows).toHaveLength(2);
  expect((await db.query(`select access_until::text from coach_clients where player_id=$1`, [player])).rows).toEqual([{ access_until: '2026-12-03' }]);
  expect((await db.query(`select id from chat_messages where id=$1`, [id])).rows).toHaveLength(1);
  expect((await asUser(db, player, tx => tx.query(`select id from notifications where type='chat_message'`))).rows).toHaveLength(1);
  expect((await asUser(db, captain, tx => tx.query(`select receipt_debt($1) as debt`, [player]))).rows).toEqual([{ debt: 100 }]);
  const outsider = await createUser(db, 'captain');
  // An outsider learns nothing: the balance reads as zero.
  expect((await asUser(db, outsider, tx => tx.query(`select receipt_debt($1) as debt`, [player]))).rows).toEqual([{ debt: 0 }]);
});

it('blocks a receipt above the remaining debt atomically', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end,price_egp,amount_egp)
    values($1,$2,30,'2026-10-01','2026-10-30',500,400)`, [captain, player]);
  const id = '019a5000-0000-7000-8000-000000000091', path = `${player}/${captain}/${id}.jpg`;
  await asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values('payment-receipts',$1)`, [path]));
  await asUser(db, player, tx => tx.query(`select submit_payment_receipt($1,$2,200,'cash',$3)`, [id, captain, path]));
  await expect(asUser(db, captain, tx => tx.query(`select accept_payment_receipt($1,null,null,'Accepted',$2,1)`, [id, path])))
    .rejects.toThrow(/more than the player owes/);
  expect((await db.query(`select status from payment_receipts where id=$1`, [id])).rows).toEqual([{ status: 'pending' }]);
  expect((await db.query(`select id from payment_collections where player_id=$1`, [player])).rows).toEqual([]);
});

it('stores an invite start separately and permits reads but no writes before it', async () => {
  const captain = await createUser(db, 'captain'), player = await createUser(db, 'player');
  const code = (await asUser(db, captain, tx => tx.query<{ code: string }>(`select create_player_invite_v2(
    'Ali',null,null,'days',30,500,200,false,'2026-11-10','{}'::uuid[],false) as code`))).rows[0]?.code;
  await asUser(db, player, tx => tx.query(`select redeem_invite($1)`, [code]));
  const allowed = () => asUser(db, player, tx => tx.query(`select player_can_read() as read,player_can_write() as write`));
  expect((await allowed()).rows).toEqual([{ read: true, write: false }]);
  expect((await db.query(`select subscription_starts_on::text,started_on::text from coach_clients where player_id=$1`, [player])).rows)
    .toEqual([{ subscription_starts_on: '2026-11-10', started_on: '2026-11-03' }]);
  await db.query(`update coach_clients set subscription_starts_on='2026-11-03' where player_id=$1`, [player]);
  expect((await allowed()).rows).toEqual([{ read: true, write: true }]);
  await db.query(`update coach_clients set subscription_starts_on=null,access_until='2026-11-01',awaiting_plans_at=now() where player_id=$1`, [player]);
  expect((await allowed()).rows).toEqual([{ read: true, write: true }]);
});
