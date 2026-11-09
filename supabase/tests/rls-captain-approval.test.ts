import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let captain: string;
let admin: string;
let player: string;
let existing: string;
const run = (id: string, sql: string, params: unknown[] = []) => asUser(db, id, tx => tx.query(sql, params));
beforeAll(async () => {
  db = await createTestDb(async (file, migrating) => {
    if (file !== '0061_captain_approval.sql') return;
    existing = (await migrating.query<{ id: string }>(`insert into auth.users(id,raw_user_meta_data)
      values (gen_random_uuid(),'{"role":"captain"}') returning id`)).rows[0]?.id ?? '';
  });
  captain = (await db.query<{ id: string }>(`insert into auth.users(id) values (gen_random_uuid()) returning id`)).rows[0]?.id ?? '';
  admin = await createUser(db, 'captain');
  player = await createUser(db, 'player');
  await makeAdmin(db, admin);
  await run(captain, `select public.confirm_role('captain')`);
  await db.query('update auth.users set email_confirmed_at=now() where id=$1', [captain]);
  await run(captain, 'update profiles set captain_intake=$1 where id=$2',
    [{ current_tool: 'whatsapp_excel', main_challenge: 'time_on_tables', players_range: '1-10' }, captain]);
});
afterAll(async () => { await db?.close(); });

it('makes confirmed captains pending, leaving existing rows and admins approved', async () => {
  expect((await run(existing, 'select captain_status from public.profiles where id = $1', [existing])).rows)
    .toEqual([{ captain_status: 'approved' }]);
  expect((await run(captain, 'select captain_status from public.profiles')).rows).toEqual([{ captain_status: 'pending' }]);
  expect((await run(admin, 'select captain_status from public.profiles where id = $1', [admin])).rows)
    .toEqual([{ captain_status: 'approved' }]);
  const signup = await db.query<{ id: string }>(`insert into auth.users(id,raw_user_meta_data)
    values (gen_random_uuid(),'{"role":"captain"}') returning id`);
  const id = signup.rows[0]?.id ?? '';
  expect((await run(id, 'select captain_status from public.profiles')).rows).toEqual([{ captain_status: 'pending' }]);
  await db.query('delete from auth.users where id = $1', [id]);
  expect((await db.query('select captain_status from public.profiles where id = $1', [player])).rows)
    .toEqual([{ captain_status: 'approved' }]);
});
it('blocks dashboard writes and reading other profiles', async () => {
  for (const sql of [
    `insert into public.coach_invites(captain_id,code,access_until) values ($1,'blocked','2026-12-01')`,
    `insert into public.programs(captain_id,title,is_template) values ($1,'Blocked',true)`,
    `insert into public.nutrition_plans(captain_id,title,is_template) values ($1,'Blocked',true)`,
    `insert into public.coach_clients(captain_id,player_id,access_until) values ($1,'${player}','2026-12-01')`,
  ]) await expect(run(captain, sql, [captain])).rejects.toMatchObject({ code: '42501' });
  expect((await run(captain, 'select id from public.profiles')).rows).toEqual([{ id: captain }]);
});
it('blocks old invites from adding players to an unapproved captain', async () => {
  await db.query(`insert into public.coach_invites(captain_id,code,access_until)
    values ($1,'old-pending','2026-12-01')`, [captain]);
  await expect(run(player, `select public.redeem_invite('old-pending')`)).rejects.toMatchObject({ code: '42501' });
});
it('allows own profile edits and push registration but guards review columns', async () => {
  expect((await run(captain, `update public.profiles set full_name = 'Updated' where id = $1 returning full_name`, [captain])).rows)
    .toEqual([{ full_name: 'Updated' }]);
  for (const change of [`captain_status = 'approved'`, 'captain_reviewed_at = now()']) {
    await expect(run(captain, `update public.profiles set ${change} where id = $1`, [captain]))
      .rejects.toMatchObject({ code: '42501' });
  }
  await run(captain, `insert into public.push_subscriptions(id,endpoint,p256dh,auth)
    values ('00000000-0000-7000-8000-000000000001','https://fcm.googleapis.com/pending','key','auth')`);
  expect((await run(captain, 'select id from public.push_subscriptions')).rows).toHaveLength(1);
});
it('restricts list and review to admins, including invalid targets and statuses', async () => {
  for (const id of [captain, player]) {
    await expect(run(id, 'select * from public.admin_pending_captains()')).rejects.toMatchObject({ code: '42501' });
    await expect(run(id, `select public.admin_review_captain($1,'approved')`, [captain])).rejects.toMatchObject({ code: '42501' });
  }
  expect((await run(admin, 'select id from public.admin_pending_captains()')).rows).toEqual([{ id: captain }]);
  await expect(run(admin, `select public.admin_review_captain($1,'pending')`, [captain])).rejects.toThrow();
  await expect(run(admin, `select public.admin_review_captain($1,'approved')`, [player])).rejects.toThrow();
});
it('rejects without deleting and approves once with an audit and notification', async () => {
  await run(admin, `select public.admin_review_captain($1,'rejected')`, [captain]);
  expect((await run(captain, 'select public.is_suspended() as blocked')).rows).toEqual([{ blocked: true }]);
  await expect(run(captain, `insert into public.programs(captain_id,title,is_template) values ($1,'Rejected',true)`, [captain]))
    .rejects.toMatchObject({ code: '42501' });
  await run(captain, `update public.profiles set avatar_path = 'own-photo.webp' where id = $1`, [captain]);
  await run(admin, `select public.admin_review_captain($1,'approved')`, [captain]);
  await expect(run(admin, `select public.admin_review_captain($1,'approved')`, [captain])).rejects.toThrow();
  await run(captain, `insert into public.programs(captain_id,title,is_template) values ($1,'Allowed',true)`, [captain]);
  expect((await run(captain, `select type from public.notifications where type = 'captain_approved'`)).rows)
    .toEqual([{ type: 'captain_approved' }]);
  expect((await run(admin, 'select action from public.admin_audit_log where target_id = $1 order by action', [captain])).rows)
    .toEqual([{ action: 'approve_captain' }, { action: 'reject_captain' }]);
});
