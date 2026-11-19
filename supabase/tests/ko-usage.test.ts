import type { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, dayOffset, TEST_NOW } from './harness';

let db: PGlite;
let first: Awaited<ReturnType<typeof createCaptainWithPlayer>>;
let second: typeof first;
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
  second = await createCaptainWithPlayer(db);
  await db.query('insert into security_private.ko_approval_config(signing_key) values ($1)', [secret]);
});
afterAll(async () => db?.close());

async function usage(id: string, day: string, kind = 'message', caps = [2, 1, 5], anonymous = false) {
  const { rows } = await asUser(db, id, tx => tx.query<{ result: string }>(
    'select public.ko_usage_take($1,$2,$3,$4,$5) as result', [day, kind, ...caps]), anonymous);
  return rows[0]?.result;
}

async function credit(id: string, start = month, cap = 2) {
  const { rows } = await asUser(db, id, tx => tx.query<{ result: boolean }>(
    'select public.ko_credit_take($1,$2) as result', [start, cap]));
  return rows[0]?.result;
}

it('caps separate daily counters and shares only accepted usage with the owning captain', async () => {
  const today = await dayOffset(db, 0);
  expect(await usage(first.player, today)).toBe('ok');
  expect(await usage(first.player, today)).toBe('ok');
  expect(await usage(first.player, today)).toBe('daily');
  expect(await usage(first.player, today, 'photo')).toBe('ok');
  expect(await usage(first.player, today, 'photo')).toBe('daily');
  expect(await usage(first.captain, today)).toBe('ok');
  expect(await usage(second.player, today)).toBe('ok');
  expect(await usage(first.captain, today)).toBe('ok');
  expect(await usage(first.captain, today)).toBe('monthly');
  expect(await usage(second.captain, today)).toBe('ok');
  const proof = (captain: string) => createHmac('sha256', secret).update(`ko-usage-warning:${captain}:${month}:5`).digest('hex');
  const warn = (id: string, signature: string) => asUser(db, id, tx => tx.query('select public.ko_usage_claim_warning(5,$1) as claimed', [signature]));
  expect((await warn(first.player, 'invalid')).rows).toEqual([{ claimed: false }]);
  expect((await warn(second.captain, proof(second.captain))).rows).toEqual([{ claimed: false }]);
  expect((await warn(first.player, proof(first.captain))).rows).toEqual([{ claimed: true }]);
  expect((await warn(first.captain, proof(first.captain))).rows).toEqual([{ claimed: false }]);
  const { rows } = await db.query('select calls, credits from security_private.ko_usage_monthly where captain_id=$1', [first.captain]);
  expect(rows).toEqual([{ calls: 5, credits: 0 }]);
});

it('refuses missing and anonymous callers and denies direct access to protected tables', async () => {
  const today = await dayOffset(db, 0);
  await expect(usage(first.player, today, 'message', [2, 1, 5], true)).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, '', tx => tx.query('select public.ko_usage_take($1,$2,2,1,5)', [today, 'message'])))
    .rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, first.captain, tx => tx.query('select * from security_private.ko_usage_daily')))
    .rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, first.captain, tx => tx.query('select * from security_private.ko_usage_monthly')))
    .rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, first.captain, tx => tx.query('select * from security_private.ko_usage_warnings')))
    .rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, first.captain, tx => tx.query('select * from security_private.ko_credit_approvals')))
    .rejects.toMatchObject({ code: '42501' });
});

it('charges a signed confirmation at most once and does not reserve credits for rejected confirmations', async () => {
  const captain = await createUser(db, 'captain');
  const token = (index: number) => {
    const body = Buffer.from(JSON.stringify({
      id: `00000000-0000-7000-8000-00000000000${index}`, actor: captain,
      kind: 'training', expires: Date.parse(TEST_NOW) + 60_000,
    })).toString('base64url');
    return body + '.' + createHmac('sha256', secret).update(body).digest('hex');
  };
  const take = (signed: string, cap = 1) => asUser(db, captain, tx => tx.query('select public.ko_credit_take($1,$2,$3) as taken', [month, cap, signed]));
  expect((await take(token(1))).rows).toEqual([{ taken: true }]);
  expect((await take(token(1))).rows).toEqual([{ taken: true }]);
  expect((await take(token(2))).rows).toEqual([{ taken: false }]);
  expect((await take(token(2), 2)).rows).toEqual([{ taken: true }]);
  const { rows } = await db.query('select credits from security_private.ko_usage_monthly where captain_id=$1 and month=$2', [captain, month]);
  expect(rows).toEqual([{ credits: 2 }]);
});

it('validates the date, kind and caps and clamps direct RPC requests to the top-tier maxima', async () => {
  const yesterday = await dayOffset(db, -1);
  await expect(usage(first.player, await dayOffset(db, -2))).rejects.toMatchObject({ code: '22023' });
  await expect(usage(first.player, yesterday, 'other')).rejects.toMatchObject({ code: '22023' });
  await expect(usage(first.player, yesterday, 'message', [0, 1, 5])).rejects.toMatchObject({ code: '22023' });
  await expect(usage(first.player, yesterday, 'message', [2, 100001, 5])).rejects.toMatchObject({ code: '22023' });
  const caps = [100000, 100000, 100000];
  for (let index = 0; index < 10; index++) expect(await usage(first.player, yesterday, 'message', caps)).toBe('ok');
  expect(await usage(first.player, yesterday, 'message', caps)).toBe('daily');
  for (let index = 0; index < 2; index++) expect(await usage(first.player, yesterday, 'photo', caps)).toBe('ok');
  expect(await usage(first.player, yesterday, 'photo', caps)).toBe('daily');
});

it('caps credits for the month, resets in Cairo and exposes summaries only to captains', async () => {
  const summary = (id: string) => asUser(db, id, tx => tx.query('select credits_used, credits_cap, month::text from public.ko_usage_summary()'));
  await expect(credit(first.player)).rejects.toMatchObject({ code: '42501' });
  await expect(summary(first.player)).rejects.toMatchObject({ code: '42501' });
  await expect(credit(first.captain, '2026-11-02')).rejects.toMatchObject({ code: '22023' });
  expect(await credit(first.captain)).toBe(true);
  expect(await credit(first.captain)).toBe(true);
  expect(await credit(first.captain)).toBe(false);
  expect((await summary(first.captain)).rows).toEqual([{ credits_used: 2, credits_cap: 10, month }]);
  expect((await summary(second.captain)).rows).toEqual([{ credits_used: 0, credits_cap: 10, month }]);
  try {
    await db.exec("set test.usage_now = '2026-11-30T22:30:00Z'");
    expect((await summary(first.captain)).rows).toEqual([{ credits_used: 0, credits_cap: 10, month: '2026-12-01' }]);
    expect(await credit(first.captain, '2026-12-01')).toBe(true);
  } finally {
    await db.exec('reset test.usage_now');
  }
});
