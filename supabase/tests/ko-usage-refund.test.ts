import type { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, dayOffset, TEST_NOW } from './harness';

let db: PGlite;
let first: Awaited<ReturnType<typeof createCaptainWithPlayer>>;
const month = '2026-11-01';
const secret = 'ko-test-signing-key-123456789012345';

beforeAll(async () => {
  db = await createTestDb(async (file, instance) => {
    if (file !== '0158_ko_usage.sql') return;
    await instance.exec(`
      create or replace function pg_catalog.now() returns timestamptz language sql stable as $$
        select coalesce(nullif(current_setting('test.usage_now', true), '')::timestamptz, timestamptz '${TEST_NOW}')
      $$;
    `);
  });
  first = await createCaptainWithPlayer(db);
  await db.query('insert into security_private.ko_approval_config(signing_key) values ($1)', [secret]);
});
afterAll(async () => db?.close());

async function usage(id: string, day: string, kind = 'message', caps = [2, 1, 5]) {
  const { rows } = await asUser(db, id, tx => tx.query<{ result: string }>(
    'select public.ko_usage_take($1,$2,$3,$4,$5) as result', [day, kind, ...caps]));
  return rows[0]?.result;
}

async function refundUsage(id: string, day: string, kind: string, key: string, anonymous = false) {
  const { rows } = await asUser(db, id, tx => tx.query<{ result: boolean }>(
    'select public.ko_usage_refund($1,$2,$3) as result', [day, kind, key]), anonymous);
  return rows[0]?.result;
}

async function counters(captain: string, user: string, day: string) {
  const { rows } = await db.query(
    `select (select messages from security_private.ko_usage_daily where user_id=$2 and day=$3) as messages,
      (select photos from security_private.ko_usage_daily where user_id=$2 and day=$3) as photos,
      (select calls from security_private.ko_usage_monthly where captain_id=$1 and month=$4) as calls,
      (select credits from security_private.ko_usage_monthly where captain_id=$1 and month=$4) as credits`,
    [captain, user, day, month]);
  return rows[0] as { messages: number | null; photos: number | null; calls: number | null; credits: number | null };
}

const tokenFor = (captain: string, index: number) => {
  const body = Buffer.from(JSON.stringify({
    id: `00000000-0000-7000-8000-00000000000${index}`, actor: captain,
    kind: 'training', expires: Date.parse(TEST_NOW) + 60_000,
  })).toString('base64url');
  return body + '.' + createHmac('sha256', secret).update(body).digest('hex');
};

async function takeCredit(captain: string, signed: string, cap = 2) {
  const { rows } = await asUser(db, captain, tx => tx.query<{ result: boolean }>(
    'select public.ko_credit_take($1,$2,$3) as result', [month, cap, signed]));
  return rows[0]?.result;
}

async function refundCredit(captain: string, signed: string, anonymous = false) {
  const { rows } = await asUser(db, captain, tx => tx.query<{ result: boolean }>(
    'select public.ko_credit_refund($1,$2) as result', [month, signed]), anonymous);
  return rows[0]?.result;
}

const key = (index: number) => `00000000-0000-7000-8000-0000000000${index}0`;

it('returns message and photo counters to their prior values and refunds each key once', async () => {
  const today = await dayOffset(db, 0);
  expect(await usage(first.player, today)).toBe('ok');
  expect(await usage(first.player, today, 'photo')).toBe('ok');
  expect(await counters(first.captain, first.player, today)).toEqual({ messages: 1, photos: 1, calls: 2, credits: 0 });
  expect(await refundUsage(first.player, today, 'message', key(1))).toBe(true);
  expect(await refundUsage(first.player, today, 'message', key(1))).toBe(false);
  expect(await counters(first.captain, first.player, today)).toEqual({ messages: 0, photos: 1, calls: 1, credits: 0 });
  expect(await refundUsage(first.player, today, 'photo', key(2))).toBe(true);
  expect(await counters(first.captain, first.player, today)).toEqual({ messages: 0, photos: 0, calls: 0, credits: 0 });
});

it('refunds a second take with a different key but never drives a counter below 0', async () => {
  const today = await dayOffset(db, 0);
  expect(await usage(first.player, today)).toBe('ok');
  expect(await usage(first.player, today)).toBe('ok');
  expect(await refundUsage(first.player, today, 'message', key(3))).toBe(true);
  expect(await refundUsage(first.player, today, 'message', key(4))).toBe(true);
  expect(await counters(first.captain, first.player, today)).toEqual({ messages: 0, photos: 0, calls: 0, credits: 0 });
  // Unknown-key refund: no take backs it, so it applies once, records the key,
  // and the floor of 0 keeps the counters where they were.
  expect(await refundUsage(first.player, today, 'message', key(5))).toBe(true);
  expect(await refundUsage(first.player, today, 'message', key(5))).toBe(false);
  expect(await counters(first.captain, first.player, today)).toEqual({ messages: 0, photos: 0, calls: 0, credits: 0 });
});

it('restores a taken credit once and is blocked when a receipt exists', async () => {
  const captain = await createUser(db, 'captain');
  const signed = tokenFor(captain, 1);
  expect(await takeCredit(captain, signed)).toBe(true);
  expect((await counters(captain, captain, await dayOffset(db, 0))).credits).toBe(1);
  expect(await refundCredit(captain, signed)).toBe(true);
  expect((await counters(captain, captain, await dayOffset(db, 0))).credits).toBe(0);
  expect(await refundCredit(captain, signed)).toBe(false);
  // A fresh take followed by a receipt blocks the refund: the action applied.
  const applied = tokenFor(captain, 2);
  expect(await takeCredit(captain, applied)).toBe(true);
  await db.query('insert into ko_private.ko_action_receipts(captain_id, action_id) values ($1, $2)',
    [captain, '00000000-0000-7000-8000-000000000002']);
  expect(await refundCredit(captain, applied)).toBe(false);
  expect((await counters(captain, captain, await dayOffset(db, 0))).credits).toBe(1);
});

it('refuses anonymous callers for both refund RPCs', async () => {
  const today = await dayOffset(db, 0);
  await expect(refundUsage(first.player, today, 'message', key(6), true)).rejects.toMatchObject({ code: '42501' });
  await expect(refundCredit(first.captain, tokenFor(first.captain, 3), true)).rejects.toMatchObject({ code: '42501' });
});
