import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

const secret = 'meal-receipt-test-secret';
const today = '2026-11-03';
let db: PGlite;
let player: string, captain: string, peer: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  ({ player, captain } = await createCaptainWithPlayer(db));
  peer = await createUser(db, 'player');
  await db.query(`insert into security_private.app_secrets(name,value) values ('meal_receipt',$1)
    on conflict (name) do update set value=excluded.value`, [secret]);
});

async function receipt(who = player, day = today) {
  const result = await db.query<{ receipt: string }>(
    `select encode(extensions.hmac($1 || ':' || $2, $3, 'sha256'), 'hex') as receipt`, [who, day, secret]);
  return result.rows[0]?.receipt ?? '';
}
const award = (signed: string | null, day: string | null = today, who = player) =>
  asUser(db, who, tx => tx.query('select public.award_meal_check($1::date,$2)', [day, signed]));

it('awards a valid receipt once per Cairo day and keeps lifetime points out of the crown', async () => {
  const signed = await receipt();
  await award(signed); await award(signed);
  expect((await db.query('select lifetime from public.player_points where player_id=$1', [player])).rows)
    .toEqual([{ lifetime: 1 }]);
  expect((await db.query('select kind,points,source_key from public.points_log where player_id=$1', [player])).rows)
    .toEqual([{ kind: 'meal_check', points: 1, source_key: today }]);
  expect((await asUser(db, captain, tx => tx.query<{ monthly: number; is_crown: boolean }>(
    'select monthly,is_crown from public.team_leaderboard()'))).rows)
    .toEqual([{ monthly: 0, is_crown: false }]);
});

it('rejects wrong, empty, null and another player receipts with 42501', async () => {
  for (const signed of ['wrong', '', null, await receipt(peer)])
    await expect(award(signed)).rejects.toMatchObject({ code: '42501' });
});

it('rejects yesterday, future and null dates even with matching signatures', async () => {
  for (const day of ['2026-11-02', '2026-11-04'])
    await expect(award(await receipt(player, day), day)).rejects.toMatchObject({ code: '42501' });
  await expect(award(await receipt(), null)).rejects.toMatchObject({ code: '42501' });
  await expect(award(await receipt(player, '2026-11-02'))).rejects.toMatchObject({ code: '42501' });
});

it('fails closed when the secret is missing', async () => {
  await db.query("delete from security_private.app_secrets where name='meal_receipt'");
  await expect(award(await receipt())).rejects.toMatchObject({ code: '42501' });
});

it('removes the no-argument function and denies anon execution', async () => {
  await expect(asUser(db, player, tx => tx.query('select public.award_meal_check()')))
    .rejects.toMatchObject({ code: '42883' });
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('select public.award_meal_check($1::date,$2)', [today, 'wrong']);
  })).rejects.toMatchObject({ code: '42501' });
});

it('enables RLS and denies every API role direct secret access', async () => {
  expect((await db.query(`select relrowsecurity from pg_class
    where oid='security_private.app_secrets'::regclass`)).rows).toEqual([{ relrowsecurity: true }]);
  for (const role of ['anon', 'authenticated', 'service_role']) {
    for (const operation of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'])
      expect((await db.query(`select has_table_privilege($1,'security_private.app_secrets',$2) as allowed`,
        [role, operation])).rows).toEqual([{ allowed: false }]);
    await expect(db.transaction(async tx => {
      await tx.exec(`set local role ${role}`);
      await tx.query('select * from security_private.app_secrets');
    })).rejects.toMatchObject({ code: '42501' });
  }
});
