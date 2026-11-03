import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

describe('player payments', () => {
  it('indexes each requested hot foreign key as the leading column', async () => {
    for (const [table, column] of [
      ['meal_items', 'meal_id'], ['meal_item_alternatives', 'meal_item_id'], ['meal_logs', 'meal_id'],
      ['set_logs', 'program_exercise_id'], ['workout_sessions', 'program_day_id'],
      ['coach_invites', 'captain_id'], ['form_checks', 'player_id'], ['nutrition_plans', 'captain_id'],
      ['programs', 'source_template_id'], ['nutrition_plans', 'source_template_id'],
    ]) {
      expect((await db.query(`select a.attname from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
        where i.indrelid = $1::regclass and a.attname = $2 and i.indisvalid`,
      [`public.${table}`, column])).rows).toEqual([{ attname: column }]);
    }
  });
  it('returns one latest payment per caller player, breaking timestamp ties by ascending id', async () => {
    const { captain, player } = await createCaptainWithPlayer(db);
    const second = await createUser(db, 'player');
    const foreign = await createCaptainWithPlayer(db);
    const stranger = await createUser(db, 'captain');
    await db.query(`insert into public.coach_clients (captain_id, player_id, access_until)
      values ($1, $2, '2026-12-01')`, [captain, second]);
    const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004'];
    for (const [id, owner, payer, created] of [
      [ids[2], captain, player, '2026-11-03'], [ids[1], captain, player, '2026-11-03'],
      [ids[0], captain, player, '2026-11-02'], [ids[3], captain, second, '2026-11-01'],
      ['00000000-0000-4000-8000-000000000005', foreign.captain, foreign.player, '2026-11-04'],
    ]) {
      await db.query(`insert into public.player_payments
        (id, captain_id, player_id, days, amount_egp, period_start, period_end, created_at)
        values ($1, $2, $3, 30, 800, '2026-11-01', '2026-11-30', $4)`, [id, owner, payer, created]);
    }
    const result = await asUser(db, captain, (tx) => tx.query('select id, player_id from public.captain_last_payments()'));
    expect(result.rows).toHaveLength(2);
    expect(result.rows).toEqual(expect.arrayContaining([{ id: ids[1], player_id: player }, { id: ids[3], player_id: second }]));
    for (const caller of [player, stranger]) {
      expect((await asUser(db, caller, (tx) => tx.query('select * from public.captain_last_payments()'))).rows).toEqual([]);
    }
    await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
    expect((await asUser(db, captain, (tx) => tx.query('select * from public.captain_last_payments()'))).rows).toEqual([]);
  });
  it('keeps the payment RPC invoker, stable, search-path hardened and unavailable to anon', async () => {
    expect((await db.query(`select prosecdef, provolatile, proconfig,
      has_function_privilege('anon', oid, 'EXECUTE') as anon,
      has_function_privilege('authenticated', oid, 'EXECUTE') as authenticated
      from pg_proc where oid = 'public.captain_last_payments()'::regprocedure`)).rows).toEqual([
      { prosecdef: false, provolatile: 's', proconfig: ['search_path=""'], anon: false, authenticated: true },
    ]);
  });
  it.each([
    ['2026-12-10', '2026-12-11', '2027-01-09'],
    ['2026-10-01', TEST_NOW.split('T')[0], '2026-12-02'],
  ])('renews access ending %s atomically', async (access, start, end) => {
    const { captain, player } = await createCaptainWithPlayer(db);
    await db.query('update public.coach_clients set access_until = $1 where player_id = $2', [access, player]);
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
    await expect(asUser(db, captain, (tx) => tx.query(`insert into public.player_payments (captain_id, player_id, days, period_start, period_end) values ($1, $2, 30, test_clock.today(), test_clock.today() + 29)`, [captain, player]))).rejects.toMatchObject({ code: '42501' });
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
