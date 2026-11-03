import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

describe('player payments', () => {
  it.each([
    ['2026-12-10', '2026-11-03', '2026-12-11', '2027-01-09'],
    ['2026-10-01', '2026-11-03', '2026-11-03', '2026-12-02'],
  ])('renews access ending %s atomically', async (access, today, start, end) => {
    const { captain, player } = await createCaptainWithPlayer(db);
    await db.query('update public.coach_clients set access_until = $1 where player_id = $2', [access, player]);
    // Freeze SQL today inside this isolated database, keeping the production function unchanged.
    await db.exec(`create or replace function public.payment_test_today() returns date language sql immutable as $$ select date '${today}' $$`);
    const definition = await db.query<{ source: string }>(`select pg_get_functiondef('public.renew_player(uuid,integer,integer)'::regprocedure) as source`);
    const source = definition.rows[0]?.source;
    if (!source) throw new Error('renew_player missing');
    await db.exec(source.replaceAll('current_date', 'public.payment_test_today()'));
    const result = await asUser(db, captain, (tx) => tx.query('select public.renew_player($1, 30, 800)::text as end', [player]));
    expect(result.rows).toEqual([{ end }]);
    const payment = await asUser(db, captain, (tx) => tx.query(`select player_id, days, amount_egp, period_start::text, period_end::text from public.player_payments where player_id = $1`, [player]));
    expect(payment.rows).toEqual([{ player_id: player, days: 30, amount_egp: 800, period_start: start, period_end: end }]);
    expect((await db.query('select access_until::text as end from public.coach_clients where player_id = $1', [player])).rows).toEqual([{ end }]);
  });
  it.each(['other', 'suspended', 'archived'])('denies a %s captain relationship', async (kind) => {
    const { captain, player } = await createCaptainWithPlayer(db);
    const caller = kind === 'other' ? await createUser(db, 'captain') : captain;
    if (kind === 'suspended') await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
    if (kind === 'archived') await db.query('update public.coach_clients set archived_at = now() where player_id = $1', [player]);
    await expect(asUser(db, caller, (tx) => tx.query('select public.renew_player($1, 30)', [player]))).rejects.toMatchObject({ code: '42501' });
  });
  it.each([0, 366, null])('rejects bad days %s', async (days) => {
    const { captain, player } = await createCaptainWithPlayer(db);
    await expect(asUser(db, captain, (tx) => tx.query('select public.renew_player($1, $2)', [player, days]))).rejects.toMatchObject({ code: '22023' });
  });
  it.each([-1, 100001])('rejects bad amount %s', async (amount) => {
    const { captain, player } = await createCaptainWithPlayer(db);
    await expect(asUser(db, captain, (tx) => tx.query('select public.renew_player($1, 30, $2)', [player, amount]))).rejects.toMatchObject({ code: '22023' });
  });
  it('isolates payment history and denies direct writes', async () => {
    const { captain, player } = await createCaptainWithPlayer(db);
    const other = await createUser(db, 'player');
    await asUser(db, captain, (tx) => tx.query('select public.renew_player($1, 30)', [player]));
    expect((await asUser(db, player, (tx) => tx.query('select player_id from public.player_payments'))).rows).toEqual([{ player_id: player }]);
    expect((await asUser(db, other, (tx) => tx.query('select * from public.player_payments'))).rows).toEqual([]);
    const stranger = await createUser(db, 'captain');
    expect((await asUser(db, stranger, (tx) => tx.query('select * from public.player_payments'))).rows).toEqual([]);
    await expect(asUser(db, captain, (tx) => tx.query(`insert into public.player_payments (captain_id, player_id, days, period_start, period_end) values ($1, $2, 30, current_date, current_date + 29)`, [captain, player]))).rejects.toMatchObject({ code: '42501' });
    for (const sql of ['update public.player_payments set days = 1', 'delete from public.player_payments']) {
      await expect(asUser(db, captain, (tx) => tx.query(sql))).rejects.toMatchObject({ code: '42501' });
    }
  });
  it('grants no anon execute', async () => {
    expect((await db.query(`select has_function_privilege('anon', 'public.renew_player(uuid,int,int)', 'EXECUTE') as allowed`)).rows).toEqual([{ allowed: false }]);
    await expect(db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      await tx.query('select public.renew_player(null, 30)');
    })).rejects.toMatchObject({ code: '42501' });
  });
});
