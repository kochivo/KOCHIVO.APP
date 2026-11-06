import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
async function fixture(kind = 'days') {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const pkg = (await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,days,kind,sessions,price_egp)
    values($1,'Plan',30,$2,8,500) returning id`, [captain, kind])).rows[0]?.id;
  return { captain, player, pkg };
}
function invite(captain: string, pkg: string | null = null, overrides: { paid?: number; price?: number; trial?: boolean; start?: string; name?: string; phone?: string } = {}) {
  return asUser(db, captain, tx => tx.query<{ code: string }>(
    `select create_player_invite($1,$2,$3,'days',7,$4,$5,$6,$7) as code`,
    [overrides.name ?? 'Ali', overrides.phone ?? null, pkg, overrides.price ?? 400,
      overrides.paid ?? 150, overrides.trial ?? false, overrides.start ?? '2026-11-03']));
}
async function redeem(player: string, code?: string) {
  return asUser(db, player, tx => tx.query('select redeem_invite($1)', [code]));
}
it.each(['days', 'sessions'])('redeems %s with the package quantity, discount, partial payment and one atomic activation', async kind => {
  const { captain, player, pkg } = await fixture(kind);
  const code = (await invite(captain, pkg)).rows[0]?.code;
  await redeem(player, code);
  expect((await db.query(`select pending,sessions_left,billing_started_at=now() as billed,
    access_until::text from coach_clients where player_id=$1`, [player])).rows).toEqual([
    { pending: false, sessions_left: kind === 'sessions' ? 8 : null, billed: true,
      access_until: kind === 'sessions' ? '2026-12-03' : '2026-12-02' },
  ]);
  expect((await db.query(`select price_egp,amount_egp,package_id,period_start::text,period_end::text
    from player_payments where player_id=$1`, [player])).rows).toEqual([
    { price_egp: 400, amount_egp: 150, package_id: pkg, period_start: '2026-11-03',
      period_end: kind === 'sessions' ? '2026-12-03' : '2026-12-02' },
  ]);
  await expect(redeem(player, code)).rejects.toThrow(/invalid or expired/);
  expect((await db.query('select id from player_payments where player_id=$1', [player])).rows).toHaveLength(1);
});
it('zeroes trial money and keeps an auditable record', async () => {
  const { captain, player } = await fixture();
  await redeem(player, (await invite(captain, null, { trial: true })).rows[0]?.code);
  expect((await db.query('select price_egp,amount_egp,notes from player_payments where player_id=$1', [player])).rows)
    .toEqual([{ price_egp: 0, amount_egp: 0, notes: 'free_trial' }]);
});
it('rejects foreign and archived packages', async () => {
  const { captain, pkg } = await fixture();
  const other = await createUser(db, 'captain');
  await expect(invite(other, pkg)).rejects.toThrow(/package not found/);
  await db.query('update captain_packages set archived_at=now() where id=$1', [pkg]);
  await expect(invite(captain, pkg)).rejects.toThrow(/package not found/);
});
it('rejects invalid money, dates, names and phone numbers', async () => {
  const { captain } = await fixture();
  for (const values of [{ paid: 401 }, { price: -1 }, { start: '2026-10-03' }, { start: '2027-01-03' },
    { name: ' ' }, { name: 'a'.repeat(61) }, { phone: '+201001234567' }]) {
    await expect(invite(captain, null, values)).rejects.toMatchObject({ code: '22023' });
  }
});
it('blocks demo captains and players', async () => {
  const { captain, player } = await fixture();
  await expect(invite(player)).rejects.toMatchObject({ code: '42501' });
  await db.query("update profiles set demo_expires_at=now()+interval '1 day' where id=$1", [captain]);
  await expect(invite(captain)).rejects.toMatchObject({ code: '42501' });
});
it('keeps old invites pending and disallows direct inserts with plan columns', async () => {
  const { captain, player } = await fixture();
  await asUser(db, captain, tx => tx.query(`insert into coach_invites(captain_id,code,access_until)
    values($1,'legacy','2026-12-01')`, [captain]));
  await redeem(player, 'legacy');
  expect((await db.query('select pending from coach_clients where player_id=$1', [player])).rows).toEqual([{ pending: true }]);
  expect((await db.query('select id from player_payments where player_id=$1', [player])).rows).toHaveLength(0);
  await expect(asUser(db, captain, tx => tx.query(`insert into coach_invites(captain_id,access_until,kind)
    values($1,'2026-12-01','days')`, [captain]))).rejects.toMatchObject({ code: '42501' });
});
it('accepts an existing pending join request without duplicating its reserved link', async () => {
  const { captain, player } = await fixture();
  await db.query("update profiles set public_slug='invite-coach' where id=$1", [captain]);
  await asUser(db, player, tx => tx.query('insert into coach_join_requests(id,captain_id,player_id) values(gen_random_uuid(),$1,$2)', [captain, player]));
  await redeem(player, (await invite(captain)).rows[0]?.code);
  expect((await db.query('select pending from coach_clients where player_id=$1', [player])).rows).toEqual([{ pending: false }]);
  expect((await db.query('select status from coach_join_requests where player_id=$1', [player])).rows).toEqual([{ status: 'accepted' }]);
});
it.each(['suspended', 'rejected'])('blocks %s captains when reusing a reserved pending link', async state => {
  const { captain, player } = await fixture();
  const code = (await invite(captain)).rows[0]?.code;
  await db.query('insert into coach_clients(captain_id,player_id,access_until,pending) values($1,$2,current_date,true)', [captain, player]);
  await db.query(`update profiles set suspended_at=case when $2='suspended' then now() end,
    captain_status=case when $2='rejected' then 'rejected' else 'approved' end where id=$1`, [captain, state]);
  await expect(redeem(player, code)).rejects.toMatchObject({ code: '42501' });
  expect((await db.query('select pending from coach_clients where player_id=$1', [player])).rows).toEqual([{ pending: true }]);
  expect((await db.query('select id from player_payments where player_id=$1', [player])).rows).toHaveLength(0);
  expect((await db.query('select redeemed_at from coach_invites where code=$1', [code])).rows).toEqual([{ redeemed_at: null }]);
});
it('retains the promised session validity and money when a source package changes before redeem', async () => {
  const { captain, player, pkg } = await fixture('sessions');
  const code = (await invite(captain, pkg)).rows[0]?.code;
  await db.query('update captain_packages set days=90,sessions=15,price_egp=999,archived_at=now() where id=$1', [pkg]);
  await redeem(player, code);
  expect((await db.query('select sessions_left,access_until::text from coach_clients where player_id=$1', [player])).rows)
    .toEqual([{ sessions_left: 8, access_until: '2026-12-03' }]);
  expect((await db.query('select price_egp,amount_egp from player_payments where player_id=$1', [player])).rows)
    .toEqual([{ price_egp: 400, amount_egp: 150 }]);
});
