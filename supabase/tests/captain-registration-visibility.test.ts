import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let admin: string;
const intake = { current_tool: 'whatsapp_excel', main_challenge: 'time_on_tables', players_range: '1-10' };
const run = (id: string, sql: string, params: unknown[] = []) => asUser(db, id, tx => tx.query(sql, params));
const requests = (id: string) => run(admin, 'select id from public.admin_pending_captains() where id=$1', [id]);
const managed = (id: string) => run(admin, 'select id from public.admin_captains() where id=$1', [id]);
async function signup() {
  const result = await db.query<{ id: string }>(`insert into auth.users(id,email,raw_user_meta_data)
    values(gen_random_uuid(),'registration@example.com','{"role":"captain","full_name":"Registration"}') returning id`);
  const id = result.rows[0]?.id;
  if (!id) throw new Error('Missing signup');
  return id;
}
beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
});
afterAll(async () => { await db?.close(); });

it('shows a request only after email verification, role confirmation and intake submission', async () => {
  const id = await signup();
  expect((await requests(id)).rows).toEqual([]);
  expect((await managed(id)).rows).toEqual([]);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [id]);
  expect((await requests(id)).rows).toEqual([]);
  await run(id, 'update profiles set captain_intake=$1 where id=$2', [intake, id]);
  expect((await requests(id)).rows).toEqual([{ id }]);
  await db.query('update profiles set role_confirmed=false where id=$1', [id]);
  expect((await requests(id)).rows).toEqual([]);
  await db.query('update profiles set role_confirmed=true where id=$1', [id]);
  await db.query('update auth.users set email_confirmed_at=null where id=$1', [id]);
  expect((await requests(id)).rows).toEqual([]);
});

it('persists rejection, excludes it on fresh reads and retains its audit and auth account', async () => {
  const id = await signup();
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [id]);
  await run(id, 'update profiles set captain_intake=$1 where id=$2', [intake, id]);
  expect((await requests(id)).rows).toEqual([{ id }]);
  await run(admin, "select public.admin_review_captain($1,'rejected')", [id]);
  expect((await requests(id)).rows).toEqual([]);
  expect((await managed(id)).rows).toEqual([]);
  expect((await db.query('select captain_status from profiles where id=$1', [id])).rows)
    .toEqual([{ captain_status: 'rejected' }]);
  expect((await db.query('select id from auth.users where id=$1', [id])).rows).toEqual([{ id }]);
  expect((await db.query('select action from admin_audit_log where target_id=$1', [id])).rows)
    .toEqual([{ action: 'reject_captain' }]);
});

it('filters pending and rejected rows before search and pagination, retaining approved legacy accounts', async () => {
  const approved = await createUser(db, 'captain', 'Visibility search');
  const pending = await signup();
  const rejected = await signup();
  await db.query("update profiles set full_name='Visibility search' where id in ($1,$2)", [pending, rejected]);
  await run(admin, "select public.admin_review_captain($1,'rejected')", [rejected]);
  expect((await run(admin, "select id from admin_captains('Visibility search',1,0)")).rows).toEqual([{ id: approved }]);
  expect((await run(admin, "select id from admin_captains('Visibility search',1,1)")).rows).toEqual([]);
  await run(admin, "select public.admin_review_captain($1,'approved')", [pending]);
  expect((await managed(pending)).rows).toEqual([{ id: pending }]);
  expect((await requests(pending)).rows).toEqual([]);
});

it('keeps both list functions admin-only', async () => {
  const player = await createUser(db, 'player');
  for (const sql of ['select * from admin_pending_captains()', 'select * from admin_captains()']) {
    await expect(run(player, sql)).rejects.toMatchObject({ code: '42501' });
  }
});
