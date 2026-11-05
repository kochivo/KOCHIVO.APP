import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('allows own profile fields and protects deletion requests and other profiles', async () => {
  const user = await createUser(db, 'captain');
  const other = await createUser(db, 'player');
  await asUser(db, user, (tx) => tx.query(`update public.profiles set full_name = 'Ali', phone = '+201012345678', invite_message = 'hello' where id = $1`, [user]));
  expect((await db.query('select full_name, phone, invite_message from public.profiles where id = $1', [user])).rows)
    .toEqual([{ full_name: 'Ali', phone: '+201012345678', invite_message: 'hello' }]);
  await expect(asUser(db, user, (tx) => tx.query('update public.profiles set deletion_requested_at = now() where id = $1', [user])))
    .rejects.toThrow(/cannot be changed/);
  expect((await asUser(db, user, (tx) => tx.query(`update public.profiles set full_name = 'Changed' where id = $1 returning id`, [other]))).rows).toEqual([]);
});

it('requests and cancels only for the caller and preserves the first request date', async () => {
  const user = await createUser(db, 'player');
  const other = await createUser(db, 'player');
  const request = () => asUser(db, user, (tx) => tx.query('select public.request_account_deletion() as due'));
  const first = await request();
  expect((await request()).rows).toEqual(first.rows);
  expect((await db.query(`select deletion_requested_at + interval '7 days' as due from public.profiles where id = $1`, [user])).rows).toEqual(first.rows);
  expect((await db.query('select deletion_requested_at from public.profiles where id = $1', [other])).rows).toEqual([{ deletion_requested_at: null }]);
  await asUser(db, other, (tx) => tx.query('select public.request_account_deletion()'));
  await asUser(db, user, (tx) => tx.query('select public.cancel_account_deletion()'));
  expect((await db.query('select deletion_requested_at from public.profiles where id = $1', [user])).rows).toEqual([{ deletion_requested_at: null }]);
  expect((await db.query('select deletion_requested_at is not null as pending from public.profiles where id = $1', [other])).rows).toEqual([{ pending: true }]);
});

it('purges only requests older than seven days and cascades profiles', async () => {
  const old = await createUser(db, 'player');
  const recent = await createUser(db, 'player');
  const untouched = await createUser(db, 'player');
  await db.query(`update public.profiles set deletion_requested_at = now() - interval '8 days' where id = $1`, [old]);
  await db.query(`update public.profiles set deletion_requested_at = now() - interval '6 days' where id = $1`, [recent]);
  expect((await db.query('select public.purge_deleted_accounts() as count')).rows).toEqual([{ count: 1 }]);
  expect((await db.query('select id from public.profiles where id = $1', [old])).rows).toEqual([]);
  expect((await db.query('select id from auth.users where id = $1', [old])).rows).toEqual([]);
  expect((await db.query('select id from auth.users where id in ($1, $2)', [recent, untouched])).rows).toHaveLength(2);
});

it('skips admins so their audit references never abort the purge', async () => {
  const admin = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  await db.query('insert into public.admins (user_id) values ($1)', [admin]);
  await db.query(`update public.profiles set deletion_requested_at = now() - interval '8 days' where id in ($1, $2)`, [admin, player]);
  expect((await db.query('select public.purge_deleted_accounts() as count')).rows).toEqual([{ count: 1 }]);
  expect((await db.query('select id from auth.users where id = $1', [admin])).rows).toHaveLength(1);
});

it('denies purge execution to authenticated and anon, and deletion RPCs to anon', async () => {
  for (const role of ['authenticated', 'anon']) {
    await expect(db.transaction(async (tx) => {
      await tx.exec(`set local role ${role}`);
      await tx.query('select public.purge_deleted_accounts()');
    })).rejects.toThrow(/permission denied for function/);
  }
  for (const fn of ['request_account_deletion', 'cancel_account_deletion']) {
    expect((await db.query(`select has_function_privilege('anon', 'public.${fn}()', 'EXECUTE') as allowed`)).rows).toEqual([{ allowed: false }]);
  }
});
