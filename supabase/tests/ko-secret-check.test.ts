import { createHmac } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

const challenge = 'ko-secret-check';
const approvalSecret = 'approval-test-secret-0123456789ab';
const mealSecret = 'meal-receipt-test-secret-01234567';
let db: PGlite;
let player: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  player = await createUser(db, 'player');
  await db.query(`insert into security_private.ko_approval_config(signing_key) values ($1)
    on conflict (singleton) do update set signing_key = excluded.signing_key`, [approvalSecret]);
  await db.query(`insert into security_private.app_secrets(name, value) values ('meal_receipt', $1)
    on conflict (name) do update set value = excluded.value`, [mealSecret]);
});

const mac = (secret: string) => createHmac('sha256', secret).update(challenge).digest('hex');
async function check(kind: string, secret: string, who = player) {
  const result = await asUser(db, who, tx => tx.query<{ ko_secret_check: boolean }>(
    'select public.ko_secret_check($1, $2, $3) as ko_secret_check', [kind, challenge, mac(secret)]));
  return result.rows[0]?.ko_secret_check;
}

it('returns true for the stored approval and meal-receipt keys', async () => {
  expect(await check('approval', approvalSecret)).toBe(true);
  expect(await check('meal_receipt', mealSecret)).toBe(true);
});

it('returns false for a wrong key', async () => {
  expect(await check('approval', 'wrong-approval-secret-012345678')).toBe(false);
  expect(await check('meal_receipt', 'wrong-meal-secret-012345678901')).toBe(false);
});

it('returns false for an unknown kind', async () => {
  expect(await check('usage_warning', approvalSecret)).toBe(false);
});

it('returns false when the database key is missing', async () => {
  await db.query('delete from security_private.ko_approval_config');
  expect(await check('approval', approvalSecret)).toBe(false);
  await db.query("delete from security_private.app_secrets where name = 'meal_receipt'");
  expect(await check('meal_receipt', mealSecret)).toBe(false);
});

it('denies anon execution', async () => {
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('select public.ko_secret_check($1, $2, $3)',
      ['approval', challenge, mac(approvalSecret)]);
  })).rejects.toMatchObject({ code: '42501' });
});
