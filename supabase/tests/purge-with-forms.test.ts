import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
beforeEach(async () => { db = await createTestDb(); });
afterEach(async () => { await db?.close(); });

async function graph(captain: string, player: string, invite = true) {
  const { rows } = await db.query<{ form: string; question: string; request: string; schedule: string }>(
    `select gen_random_uuid() as form, gen_random_uuid() as question,
      gen_random_uuid() as request, gen_random_uuid() as schedule`);
  const ids = rows[0];
  if (!ids) throw new Error('Missing fixture IDs');
  await asUser(db, captain, tx => tx.query(`insert into public.forms(id,captain_id,title,kind)
    values ($1,$2,'Purge fixture','custom')`, [ids.form, captain]));
  await db.query(`insert into public.form_questions(id,form_id,position,label_ar,label_en,type)
    values ($1,$2,0,'Weight','Weight','number')`, [ids.question, ids.form]);
  await db.query(`insert into public.form_requests(id,form_id,captain_id,player_id)
    values ($1,$2,$3,$4)`, [ids.request, ids.form, captain, player]);
  // 0113 accepts answers only while the request's captain is still linked to the player.
  await db.query(`insert into public.coach_clients(captain_id,player_id,access_until)
    select $1,$2,'2026-12-31' where not exists (select 1 from public.coach_clients
      where captain_id=$1 and player_id=$2 and archived_at is null)`, [captain, player]);
  await asUser(db, player, tx => tx.query(`insert into public.form_answers(id,request_id,question_id,value)
    values (gen_random_uuid(),$1,$2,'75')`, [ids.request, ids.question]));
  await db.query(`insert into public.assessment_schedules(id,form_id,captain_id,player_id,kind,hour,starts_on)
    values ($1,$2,$3,$4,'once',12,'2026-11-03')`, [ids.schedule, ids.form, captain, player]);
  await db.query(`insert into security_private.assessment_deliveries(schedule_id,player_id,period,request_id)
    values ($1,$2,'2026-11-03',$3)`, [ids.schedule, player, ids.request]);
  if (invite) await db.query(`with invite as (
    insert into public.coach_invites(code,captain_id,access_until) values ($1,$2,'2026-12-01') returning id
  ) insert into public.coach_invite_forms(invite_id,form_id,position) select id,$3,0 from invite`,
  [ids.form, captain, ids.form]);
  return ids;
}

async function due(...users: string[]) {
  await db.query(`update public.profiles set deletion_requested_at=now()-interval '8 days'
    where id=any($1::uuid[])`, [users]);
}

async function gone(ids: Awaited<ReturnType<typeof graph>>, keepForm = false) {
  for (const [table, column, id] of [
    ['public.form_answers', 'request_id', ids.request],
    ['security_private.assessment_deliveries', 'request_id', ids.request],
    ['public.form_requests', 'id', ids.request],
    ['public.assessment_schedules', 'id', ids.schedule],
  ]) expect((await db.query(`select * from ${table} where ${column}=$1`, [id])).rows).toEqual([]);
  for (const table of ['public.forms', 'public.form_questions']) {
    expect((await db.query(`select * from ${table} where ${table.endsWith('forms') ? 'id' : 'form_id'}=$1`,
      [ids.form])).rows).toHaveLength(keepForm ? 1 : 0);
  }
  expect((await db.query('select * from public.coach_invite_forms where form_id=$1', [ids.form])).rows)
    .toHaveLength(keepForm ? 1 : 0);
}

it('reports every non-cascading user/profile FK from the final catalog', async () => {
  const result = await db.query<{ reference: string }>(`select
    conrelid::regclass::text || '.' || a.attname || ' -> ' || confrelid::regclass::text as reference
    from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.contype='f' and c.confrelid in ('public.profiles'::regclass,'auth.users'::regclass)
      and c.confdeltype not in ('c','n') order by 1`);
  expect(result.rows.map(row => row.reference)).toMatchInlineSnapshot(`
    [
      "admin_audit_log.admin_id -> profiles",
      "assessment_schedules.captain_id -> profiles",
      "assessment_schedules.player_id -> profiles",
      "captain_subscriptions.activated_by -> profiles",
      "form_requests.captain_id -> profiles",
      "form_requests.player_id -> profiles",
      "forms.captain_id -> profiles",
      "security_private.assessment_deliveries.player_id -> profiles",
    ]
  `);
});

it('purges a due captain with a complete form graph and an unrelated due player in one batch', async () => {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const unrelated = await createUser(db, 'player');
  const ids = await graph(captain, player);
  await due(captain, unrelated);
  expect((await db.query('select public.purge_deleted_accounts() as n')).rows).toEqual([{ n: 2 }]);
  expect((await db.query('select id from auth.users where id=any($1::uuid[])', [[captain, unrelated]])).rows).toEqual([]);
  expect((await db.query('select id from auth.users where id=$1', [player])).rows).toHaveLength(1);
  await gone(ids);
});

it('purges a due recipient but keeps the non-due captain, form and questions', async () => {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const ids = await graph(captain, player);
  const otherPlayer = await createUser(db, 'player');
  const kept = await graph(captain, otherPlayer);
  await due(player);
  expect((await db.query('select public.purge_deleted_accounts() as n')).rows).toEqual([{ n: 1 }]);
  expect((await db.query('select id from auth.users where id=$1', [player])).rows).toEqual([]);
  expect((await db.query('select id from auth.users where id=$1', [captain])).rows).toHaveLength(1);
  await gone(ids, true);
  for (const [table, column, id] of [
    ['public.form_requests', 'id', kept.request],
    ['public.form_answers', 'request_id', kept.request],
    ['public.assessment_schedules', 'id', kept.schedule],
    ['security_private.assessment_deliveries', 'request_id', kept.request],
  ]) expect((await db.query(`select * from ${table} where ${column}=$1`, [id])).rows).toHaveLength(1);
});

it('keeps admins and accounts at or inside the seven-day boundary and protects worker ACLs', async () => {
  const admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
  await due(admin);
  const recent = await createUser(db, 'player');
  await db.query(`update public.profiles set deletion_requested_at=now()-interval '7 days' where id=$1`, [recent]);
  expect((await db.query('select public.purge_deleted_accounts() as n')).rows).toEqual([{ n: 0 }]);
  for (const fn of ['public.purge_deleted_accounts()', 'security_private.purge_demo_workspaces()',
    'security_private.purge_account_forms(uuid[])']) {
    expect((await db.query(`select prosecdef, proconfig from pg_proc where oid=$1::regprocedure`, [fn])).rows)
      .toEqual([{ prosecdef: !fn.includes('purge_account_forms'), proconfig: ['search_path=""'] }]);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query(`select has_function_privilege($1,$2,'EXECUTE') as allowed`, [role, fn])).rows)
        .toEqual([{ allowed: false }]);
    }
  }
});

it('purges an expired demo with forms created by its authenticated captain without deleting storage directly', async () => {
  const user = (await db.query<{ id: string }>(`insert into auth.users(id,is_anonymous)
    values (gen_random_uuid(),true) returning id`)).rows[0];
  if (!user) throw new Error('Missing demo captain');
  await asUser(db, user.id, tx => tx.query('select public.create_demo_workspace()'), true);
  const receipt = (await db.query<{ player_ids: string[] }>(
    'select player_ids from security_private.demo_workspaces where captain_id=$1', [user.id])).rows[0];
  const player = receipt?.player_ids[0];
  if (!receipt || !player) throw new Error('Missing demo player');
  const ids = await graph(user.id, player, false);
  await db.exec(`create function pg_temp.block_storage_delete() returns trigger language plpgsql as
    $$ begin raise exception 'Direct storage deletion forbidden'; end $$;
    create trigger block_delete before delete on storage.objects
      for each statement execute function pg_temp.block_storage_delete()`);
  await db.query(`update public.profiles set demo_expires_at=now()-interval '1 second' where id=$1`, [user.id]);
  expect((await db.query('select security_private.purge_demo_workspaces() as n')).rows).toEqual([{ n: 1 }]);
  expect((await db.query('select id from auth.users where id=any($1::uuid[])',
    [[user.id, ...receipt.player_ids]])).rows).toEqual([]);
  await gone(ids);
});
