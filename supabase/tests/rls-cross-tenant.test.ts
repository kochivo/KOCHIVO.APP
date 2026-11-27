import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, TEST_NOW } from './harness';
import { runAs, sibling, tenantFixture } from './cross-tenant-fixture';
import type { AuditTarget } from './cross-tenant-fixture';

let db: PGlite;
let a: Awaited<ReturnType<typeof tenantFixture>>;
let b: typeof a;
let sameCaptain: typeof a;
let demo: string;
const run = (user: string, sql: string, params: unknown[] = []) => runAs(db, user, sql, params, user === demo);

// Zero affected rows and explicit authorization rejection are both valid denials.
async function denied(user: string, sql: string, params: unknown[] = []) {
  try {
    await asUser(db, user, async tx => {
      expect((await tx.query(sql, params)).rows).toEqual([]);
    }, user === demo);
  } catch (error) {
    expect(error).toMatchObject({ code: '42501' });
  }
}

async function denyCrud(user: string, target: AuditTarget, checkRead = true) {
  const { table, key, id, edit } = target;
  if (checkRead) await denied(user, `select * from public.${table} where ${key} = $1`, [id]);
  await denied(user, `update public.${table} set ${edit} where ${key} = $1 returning ${key}`, [id]);
  await denied(user, `delete from public.${table} where ${key} = $1 returning ${key}`, [id]);
  const source = (await db.query<Record<string, unknown>>(`select * from public.${table} where ${key} = $1`, [id])).rows[0];
  if (!source) throw new Error(`Missing positive fixture: ${table}`);
  const copy = { ...source, ...(key === 'id' ? { id: '01900000-0000-7000-8000-999999999999' } : {}) };
  const columns = Object.keys(copy);
  await expect(run(user, `insert into public.${table} (${columns.join(',')})
    select ${columns.join(',')} from jsonb_populate_record(null::public.${table}, $1::jsonb)`, [JSON.stringify(copy)]))
    .rejects.toMatchObject({ code: '42501' });
}

beforeAll(async () => {
  db = await createTestDb();
  // Hosted storage grants all CRUD; give the stub enough privileges to test policies, not grants.
  await db.exec('grant update, delete on storage.objects to authenticated');
  const first = await createCaptainWithPlayer(db);
  const second = await createCaptainWithPlayer(db);
  a = await tenantFixture(db, first.captain, first.player);
  b = await tenantFixture(db, second.captain, second.player);
  sameCaptain = await sibling(db, a.captain);
  const anonymous = (await db.query<{ id: string }>(`insert into auth.users (id, is_anonymous)
    values (gen_random_uuid(), true) returning id`)).rows[0];
  if (!anonymous) throw new Error('Missing anonymous user');
  demo = anonymous.id;
  await run(demo, 'select public.create_demo_workspace()');
});
afterAll(async () => { await db?.close(); });

describe('captain and demo tenant isolation', () => {
  it('proves every protected fixture is visible to its owner or captain', async () => {
    for (const target of a.targets) {
      expect((await run(a.captain, `select * from public.${target.table} where ${target.key} = $1`, [target.id])).rows)
        .toHaveLength(1);
    }
    expect((await run(a.captain, 'select * from public.inbox_items where player_id = $1', [a.player])).rows).toHaveLength(2);
  });

  it('denies B and the anonymous demo all CRUD against A, including child rows and templates', async () => {
    for (const user of [b.captain, demo]) {
      for (const target of a.targets) await denyCrud(user, target);
      await denied(user, 'select * from public.inbox_items where captain_id = $1', [a.captain]);
    }
  });

  it('denies privileged RPCs using another captain’s identifiers', async () => {
    for (const user of [b.captain, b.player, a.player, demo]) {
      for (const [sql, params] of [
        ['select public.renew_player($1, 30)', [a.player]],
        ['select public.collect_player_payment($1, 10)', [a.player]],
        ['select public.activate_program($1)', [a.program]],
        ['select public.activate_nutrition_plan($1)', [a.plan]],
        ['select public.save_nutrition_plan($1, $2)', [a.plan, '{}']],
        ['select public.copy_template($1, $2, $3)', ['program', a.program, 'Copy']],
        ['select public.assign_program_template($1, $2)', [a.program, a.player]],
        ['select public.assign_nutrition_template($1, $2)', [a.plan, a.player]],
        ['select * from public.admin_captains()', []],
        ['select public.admin_activate_plan($1, $2, 1, $3)', [a.captain, 'legend', 'cash']],
        ['select public.admin_set_suspended($1, true, $2)', [a.captain, 'test']],
      ] as const) {
        await expect(run(user, sql, [...params])).rejects.toMatchObject({ code: expect.stringMatching(/42501|P0002/) });
      }
      expect((await run(user, 'select public.current_tier($1) as tier', [a.captain])).rows).toEqual([{ tier: null }]);
      expect((await run(user, 'select public.plan_of_meal($1) as plan', [a.meal])).rows)
        .toEqual([{ plan: user === a.player ? a.plan : null }]);
    }
  });
});

describe('player isolation', () => {
  it('hides sibling and other-tenant history and rejects forged ownership and sync IDs', async () => {
    const tables = ['workout_sessions', 'set_logs', 'meal_logs', 'check_ins', 'form_checks', 'player_intake', 'voice_notes', 'daily_checks', 'readiness_decisions'];
    for (const other of [sameCaptain, b]) {
      for (const target of other.targets.filter(t => tables.includes(t.table))) await denyCrud(a.player, target);
      const payload = [{ id: other.set, session_id: other.session, program_exercise_id: other.item,
        exercise_id: other.exercise, set_index: 1, weight_kg: 999, reps: 1,
        completed_at: TEST_NOW, client_updated_at: '2026-11-03T11:00:00Z', deleted_at: null }];
      await expect(run(a.player, 'select public.sync_set_logs($1)', [JSON.stringify(payload)]))
        .rejects.toMatchObject({ code: '42501' });
    }
    expect((await run(a.player, 'select id from public.set_logs')).rows).toEqual([{ id: a.set }]);
  });
});

describe('storage isolation', () => {
  it('allows intended readers and rejects foreign writes in every tenant bucket', async () => {
    for (const [bucket, name] of a.files) {
      expect((await run(a.captain, 'select name from storage.objects where bucket_id = $1 and name = $2', [bucket, name])).rows)
        .toHaveLength(1);
      for (const user of [b.captain, b.player, sameCaptain.player, demo]) {
        const rows = (await run(user, 'select name from storage.objects where bucket_id = $1 and name = $2', [bucket, name])).rows;
        // 0039 intentionally makes food photos public. Private player media has no such exception.
        expect(rows).toHaveLength(bucket === 'captain-food-photos' ? 1 : 0);
        await expect(run(user, 'insert into storage.objects (bucket_id, name) values ($1, $2)', [bucket, `${name}.forged`]))
          .rejects.toMatchObject({ code: '42501' });
        await denied(user, 'update storage.objects set name = name || $3 where bucket_id = $1 and name = $2 returning id', [bucket, name, '.forged']);
        await denied(user, 'delete from storage.objects where bucket_id = $1 and name = $2 returning id', [bucket, name]);
      }
      expect((await run(a.player, 'select name from storage.objects where bucket_id = $1 and name = $2', [bucket, name])).rows)
        .toHaveLength(1);
    }
    for (const bucket of ['exercise-media', 'food-media']) {
      await expect(run(b.captain, 'insert into storage.objects (bucket_id, name) values ($1, $2)', [bucket, 'forged.webp']))
        .rejects.toMatchObject({ code: '42501' });
    }
  });
});

describe('suspension', () => {
  it('blocks all fixture writes, storage writes and mutating RPCs for both roles', async () => {
    for (const user of [a.captain, a.player]) {
      await db.query('update public.profiles set suspended_at = now() where id = $1', [user]);
      try {
        for (const target of a.targets) await denyCrud(user, target, false);
        for (const [bucket, name] of a.files) {
          await expect(run(user, 'insert into storage.objects (bucket_id, name) values ($1, $2)', [bucket, `${name}.blocked`]))
            .rejects.toMatchObject({ code: '42501' });
          await denied(user, 'delete from storage.objects where bucket_id = $1 and name = $2 returning id', [bucket, name]);
        }
        for (const sql of [`select public.renew_player('${a.player}', 30)`,
          `select public.collect_player_payment('${a.player}', 10)`, 'select public.request_account_deletion()',
          'select public.cancel_account_deletion()', `select public.confirm_role('captain')`,
          `select public.sync_set_logs('[{"id":"${a.set}","session_id":"${a.session}","exercise_id":"${a.exercise}","set_index":1,"completed_at":"${TEST_NOW}","client_updated_at":"${TEST_NOW}"}]')`]) {
          await expect(run(user, sql)).rejects.toMatchObject({ code: '42501' });
        }
      } finally { await db.query('update public.profiles set suspended_at = null where id = $1', [user]); }
    }
  });
});

it('keeps anon off all tables, private helpers inaccessible and the inbox subject to underlying RLS', async () => {
  expect((await db.query(`select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'security_private') and c.relkind in ('r', 'v')
      and (has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE')
        or (has_table_privilege('anon', c.oid, 'SELECT') and not (n.nspname = 'public'
          and c.relname in ('captain_package_tiers', 'captain_offers', 'captain_packages')))
        or (n.nspname = 'security_private' and has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE'))) `)).rows)
    .toEqual([]);
  expect((await db.query(`select role from (values ('anon'), ('authenticated')) as roles(role)
    where has_schema_privilege(role, 'security_private', 'USAGE')`)).rows).toEqual([]);
  // The two SQL-standard import entrypoints bind their private helpers by OID.
  // The helpers need EXECUTE through that binding and callers lack schema USAGE.
  expect((await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'security_private' and (has_function_privilege('anon', p.oid, 'EXECUTE')
      or (has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and p.oid not in ('security_private.admin_import_plan(uuid,uuid,text,text,jsonb)'::regprocedure,
          'security_private.admin_find_import_captain(text)'::regprocedure)))`)).rows).toEqual([]);
  expect((await db.query(`select reloptions from pg_class where oid = 'public.inbox_items'::regclass`)).rows)
    .toEqual([{ reloptions: ['security_invoker=true'] }]);
});

it('limits anonymous catalog reads to published active tiers/packages and running offers and denies all writes', async () => {
  const anonymous = (sql: string, params: unknown[] = []) => db.transaction(async tx => {
    await tx.exec('set local role anon'); return tx.query(sql, params);
  });
  const profile = (await db.query<{ public_slug: string | null; role_confirmed: boolean }>(
    'select public_slug,role_confirmed from profiles where id=$1', [a.captain])).rows[0];
  if (!profile) throw new Error('Missing catalog captain');
  const tiers = (await db.query<{ id: string }>(`insert into captain_package_tiers(captain_id,name,archived_at)
    values ($1,'Active',null),($1,'Archived',now()),($2,'Unpublished',null) returning id`, [a.captain, b.captain])).rows;
  const packages = (await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,price_egp,days,archived_at)
    values ($1,'Active',1500,30,null),($1,'Archived',1500,30,now()),($2,'Unpublished',1500,30,null) returning id`,
  [a.captain, b.captain])).rows;
  const offers = (await db.query<{ id: string }>(`insert into captain_offers(captain_id,name,kind,value,starts_at,ends_at,paused_at,max_uses,used_count)
    values ($1,'Running','percent',20,now()-interval '1 day',now()+interval '1 day',null,null,0),
      ($1,'Paused','percent',20,now()-interval '1 day',now()+interval '1 day',now(),null,0),
      ($1,'Ended','percent',20,now()-interval '2 days',now(),null,null,0),
      ($1,'Full','percent',20,now()-interval '1 day',now()+interval '1 day',null,1,1),
      ($1,'Scheduled','percent',20,now()+interval '1 day',now()+interval '2 days',null,null,0),
      ($2,'Unpublished','percent',20,now()-interval '1 day',now()+interval '1 day',null,null,0) returning id`,
  [a.captain, b.captain])).rows;
  const tierIds = tiers.map(row => row.id), offerIds = offers.map(row => row.id);
  const packageIds = packages.map(row => row.id);
  try {
    await db.query("update profiles set public_slug='t206-catalog',role_confirmed=true where id=$1", [a.captain]);
    expect((await anonymous('select id from captain_package_tiers where id=any($1)', [tierIds])).rows).toEqual([tiers[0]]);
    expect((await anonymous('select id from captain_offers where id=any($1)', [offerIds])).rows).toEqual([offers[0]]);
    expect((await anonymous('select id from captain_packages where id=any($1)', [packageIds])).rows).toEqual([packages[0]]);
    for (const table of ['captain_package_tiers', 'captain_offers', 'captain_packages']) {
      for (const sql of [`insert into ${table} select * from ${table} where false`,
        `update ${table} set name=name returning id`, `delete from ${table} returning id`]) {
        await expect(anonymous(sql)).rejects.toMatchObject({ code: '42501' });
      }
    }
    // Each condition independently mirrors the existing public coach-page policy.
    for (const hidden of ["public_slug=null", "role_confirmed=false", "captain_status='pending'",
      'suspended_at=now()', "demo_expires_at=now()+interval '1 day'"]) {
      await db.query(`update profiles set ${hidden} where id=$1`, [a.captain]);
      expect((await anonymous('select id from captain_package_tiers where id=any($1)', [tierIds])).rows).toEqual([]);
      expect((await anonymous('select id from captain_offers where id=any($1)', [offerIds])).rows).toEqual([]);
      expect((await anonymous('select id from captain_packages where id=any($1)', [packageIds])).rows).toEqual([]);
      await db.query(`update profiles set public_slug='t206-catalog',role_confirmed=true,captain_status='approved',
        suspended_at=null,demo_expires_at=null where id=$1`, [a.captain]);
    }
    await db.query('insert into admins(user_id) values ($1)', [a.captain]);
    expect((await anonymous('select id from captain_package_tiers where id=any($1)', [tierIds])).rows).toEqual([]);
    expect((await anonymous('select id from captain_offers where id=any($1)', [offerIds])).rows).toEqual([]);
    expect((await anonymous('select id from captain_packages where id=any($1)', [packageIds])).rows).toEqual([]);
    await db.query('delete from admins where user_id=$1', [a.captain]);
  } finally {
    await db.query('delete from captain_offers where id=any($1)', [offerIds]);
    await db.query('delete from captain_packages where id=any($1)', [packageIds]);
    await db.query('delete from captain_package_tiers where id=any($1)', [tierIds]);
    await db.query('update profiles set public_slug=$2,role_confirmed=$3 where id=$1',
      [a.captain, profile.public_slug, profile.role_confirmed]);
  }
});
