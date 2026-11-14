import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('isolates enabled methods to the owner and active linked player', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const other = await createCaptainWithPlayer(db);
  await asUser(db, captain, tx => tx.query(`insert into public.captain_payment_methods
    (captain_id,method,account_detail) values ($1,'instapay','coach@instapay')`, [captain]));
  await asUser(db, other.captain, tx => tx.query(`insert into public.captain_payment_methods
    (captain_id,method) values ($1,'cash')`, [other.captain]));
  for (const caller of [captain, player]) {
    expect((await asUser(db, caller, tx => tx.query('select method from public.captain_payment_methods'))).rows).toEqual([{ method: 'instapay' }]);
  }
  const outsider = await createUser(db, 'player');
  expect((await asUser(db, outsider, tx => tx.query('select * from public.captain_payment_methods'))).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query(`insert into public.captain_payment_methods
    (captain_id,method) values ($1,'cash')`, [captain]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, other.captain, tx => tx.query(`insert into public.captain_payment_methods
    (captain_id,method) values ($1,'cash')`, [captain]))).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.coach_clients set pending=true where player_id=$1', [player]);
  expect((await asUser(db, player, tx => tx.query('select * from public.captain_payment_methods'))).rows).toEqual([]);
  await db.query('update public.coach_clients set pending=false,archived_at=now() where player_id=$1', [player]);
  expect((await asUser(db, player, tx => tx.query('select * from public.captain_payment_methods'))).rows).toEqual([]);
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  expect((await asUser(db, captain, tx => tx.query('select * from public.captain_payment_methods'))).rows).toEqual([]);
});

it('persists owner edits and enforces account details and method keys', async () => {
  const { captain } = await createCaptainWithPlayer(db);
  for (const [method, detail] of [['invalid', 'x'], ['instapay', null], ['bank_transfer', 'x'.repeat(81)], ['vodafone_cash', ' ']]) {
    await expect(asUser(db, captain, tx => tx.query(`insert into public.captain_payment_methods
      (captain_id,method,account_detail) values ($1,$2,$3)`, [captain, method, detail]))).rejects.toMatchObject({ code: '23514' });
  }
  await asUser(db, captain, tx => tx.query(`insert into public.captain_payment_methods (captain_id,method) values ($1,'cash')`, [captain]));
  await asUser(db, captain, tx => tx.query(`update public.captain_payment_methods set account_detail='Gym desk',position=2 where captain_id=$1`, [captain]));
  expect((await asUser(db, captain, tx => tx.query('select account_detail,position from public.captain_payment_methods'))).rows).toEqual([{ account_detail: 'Gym desk', position: 2 }]);
  await asUser(db, captain, tx => tx.query('delete from public.captain_payment_methods where captain_id=$1', [captain]));
  expect((await asUser(db, captain, tx => tx.query('select * from public.captain_payment_methods'))).rows).toEqual([]);
});

it('records a method atomically with a manual renewal and keeps old renewals nullable', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await asUser(db, captain, tx => tx.query(`select public.renew_player_with_method($1,30,800,null,null,'cash')`, [player]));
  expect((await asUser(db, player, tx => tx.query('select method from public.player_payments where player_id=$1', [player]))).rows).toEqual([{ method: 'cash' }]);
  await asUser(db, captain, tx => tx.query('select public.renew_player($1,30)', [player]));
  expect((await db.query('select method from public.player_payments where player_id=$1 and amount_egp is null', [player])).rows).toEqual([{ method: null }]);
  await expect(asUser(db, player, tx => tx.query(`select public.renew_player_with_method($1,30,800,null,null,'cash')`, [player]))).rejects.toMatchObject({ code: '42501' });
});

it('rejects disabled renewal methods and carries the chosen method onto the approved payment', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const pkg = '01900000-0000-7000-8000-000000000254';
  const request = '01900000-0000-7000-8000-000000000255';
  await db.query(`insert into public.captain_packages(id,captain_id,name,price_egp,days) values ($1,$2,'Monthly',800,30)`, [pkg, captain]);
  await asUser(db, captain, tx => tx.query(`insert into public.captain_payment_methods(captain_id,method) values ($1,'cash')`, [captain]));
  for (const method of ['instapay', 'invalid']) {
    await expect(asUser(db, player, tx => tx.query(`insert into public.player_renewal_requests
      (id,captain_id,player_id,package_id,method) values ($1,$2,$3,$4,$5)`, [request, captain, player, pkg, method])))
      .rejects.toMatchObject({ code: '22023' });
  }
  await asUser(db, player, tx => tx.query(`insert into public.player_renewal_requests
    (id,captain_id,player_id,package_id,method) values ($1,$2,$3,$4,'cash')`, [request, captain, player, pkg]));
  await asUser(db, captain, tx => tx.query(`select public.decide_renewal_with_method($1,'approved')`, [request]));
  expect((await asUser(db, player, tx => tx.query('select method from public.player_payments where player_id=$1', [player]))).rows).toEqual([{ method: 'cash' }]);
  await asUser(db, captain, tx => tx.query(`select public.collect_payment_with_method($1,200,'vodafone_cash')`, [player]));
  expect((await db.query('select method from public.payment_collections where player_id=$1', [player])).rows).toEqual([{ method: 'vodafone_cash' }]);
});

it('allows a renewal without a method when none are enabled and denies anonymous access', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const pkg = '01900000-0000-7000-8000-000000000256';
  const request = '01900000-0000-7000-8000-000000000257';
  await db.query(`insert into public.captain_packages(id,captain_id,name,price_egp,days) values ($1,$2,'Monthly',800,30)`, [pkg, captain]);
  await asUser(db, player, tx => tx.query(`insert into public.player_renewal_requests
    (id,captain_id,player_id,package_id) values ($1,$2,$3,$4)`, [request, captain, player, pkg]));
  expect((await asUser(db, player, tx => tx.query('select method from public.player_renewal_requests where id=$1', [request]))).rows).toEqual([{ method: null }]);
  await asUser(db, captain, tx => tx.query(`insert into public.captain_payment_methods(captain_id,method) values ($1,'cash')`, [captain]));
  await asUser(db, captain, tx => tx.query(`select public.decide_renewal_with_method($1,'declined')`, [request]));
  await asUser(db, player, tx => tx.query(`insert into public.player_renewal_requests
    (id,captain_id,player_id,package_id) values ('01900000-0000-7000-8000-000000000258',$1,$2,$3)`, [captain, player, pkg]));
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from public.captain_payment_methods'); })).rejects.toMatchObject({ code: '42501' });
});

it('records a method for a manually paid activation', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query('update public.coach_clients set pending=true where player_id=$1', [player]);
  const link = await db.query<{ id: string }>('select id from public.coach_clients where player_id=$1', [player]);
  const id = link.rows[0]?.id;
  await asUser(db, captain, tx => tx.query(`select public.activate_player_with_method($1,null,'days',30,800,800,false,false,'bank_transfer')`, [id]));
  expect((await asUser(db, player, tx => tx.query('select method from public.player_payments where player_id=$1', [player]))).rows).toEqual([{ method: 'bank_transfer' }]);
});
