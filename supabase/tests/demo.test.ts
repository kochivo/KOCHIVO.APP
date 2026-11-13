import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, TEST_NOW } from './harness';
import { stableId } from '../../src/core/offline/ids';

let db: PGlite;
let captain: string;
async function anonymous() {
  const row = (await db.query<{ id: string }>(
    'insert into auth.users (id, is_anonymous) values (gen_random_uuid(), true) returning id')).rows[0];
  if (!row) throw new Error('Missing anonymous user');
  return row.id;
}
const demo = (user: string) => asUser(db, user, tx => tx.query('select public.create_demo_workspace()'), true);
const count = async (table: string) => (await db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0]?.n;
const snapshot = () => db.query(`select
  (select count(*)::int from public.profiles) as profiles,
  (select count(*)::int from public.programs) as programs,
  (select count(*)::int from public.nutrition_plans) as plans,
  (select count(*)::int from public.workout_sessions) as sessions,
  (select count(*)::int from public.set_logs) as sets,
  (select count(*)::int from public.meal_logs) as meals`);
const libraryText = readFileSync('supabase/seed/source/starter-templates.json', 'utf8');
const datasetIds = [...new Set([...libraryText.matchAll(/"dataset_id":\s*"(\d+)"/g)].map(m => m[1]))];
const seedKeys = [...new Set([...libraryText.matchAll(/"seed_key":\s*"([^"]+)"/g)].map(m => m[1]))];
async function seedCatalog() {
  await db.query(`insert into public.exercises (dataset_id, name_en, body_part)
    select id, 'Exercise ' || id, 'legs' from unnest($1::text[]) id`, [datasetIds]);
  await db.query(`insert into public.foods (seed_key, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    select key, key, 130, 10, 20, 3 from unnest($1::text[]) key`, [seedKeys]);
}
const mine = (sql: string) => db.query<{ n: number }>(sql, [captain]).then(r => r.rows[0]?.n);
beforeAll(async () => { db = await createTestDb(); captain = await anonymous(); });
afterAll(async () => { await db?.close(); });

it('demo log IDs match the offline stableId algorithm', async () => {
  const parts = ['sample-day', '2026-10-20'];
  expect((await db.query('select security_private.demo_stable_id(variadic $1::text[]) as id', [parts])).rows)
    .toEqual([{ id: await stableId(...parts) }]);
});

it('an anonymous caller gets eight players, the starter library, assigned plans, history and an inbox', async () => {
  await seedCatalog();
  await demo(captain);
  expect((await db.query('select role, role_confirmed, full_name, demo_expires_at from public.profiles where id = $1',
    [captain])).rows).toEqual([{ role: 'captain', role_confirmed: true, full_name: 'كابتن تجريبي',
    demo_expires_at: new Date(new Date(TEST_NOW).getTime() + 86400000) }]);
  expect((await asUser(db, captain, tx => tx.query('select * from public.coach_clients'))).rows).toHaveLength(8);
  expect(await count('public.player_intake')).toBe(8);
  expect(await mine('select count(*)::int as n from public.programs where captain_id = $1 and is_template')).toBe(6);
  expect(await mine('select count(*)::int as n from public.nutrition_plans where captain_id = $1 and is_template')).toBe(4);
  expect(await mine(`select count(distinct player_id)::int as n from public.programs where captain_id = $1 and status = 'active'`)).toBe(6);
  expect(await mine(`select count(distinct player_id)::int as n from public.nutrition_plans where captain_id = $1 and status = 'active'`)).toBe(6);
  expect(await count('public.workout_sessions')).toBe(25);
  expect(await count('public.workout_sessions s where not exists (select 1 from public.set_logs l where l.session_id = s.id)')).toBe(0);
  expect(await count('(select distinct player_id from public.meal_logs) p')).toBe(5);
  expect(await count('public.player_payments')).toBe(8);
  expect((await db.query(`select count(*)::int as n from public.set_logs l join public.workout_sessions s on s.id = l.session_id
    join public.program_exercises e on e.id = l.program_exercise_id where e.day_id <> s.program_day_id`)).rows).toEqual([{ n: 0 }]);
  expect((await asUser(db, captain, tx => tx.query('select * from public.inbox_items where reviewed_at is null'))).rows).toHaveLength(2);
  const radar = await asUser(db, captain, tx => tx.query<{ reason: string; days: number }>(
    'select reason, days from public.captain_dropout_radar() order by reason, days'));
  expect(radar.rows).toEqual([{ reason: 'never_started', days: 28 }, { reason: 'no_activity', days: 9 },
    { reason: 'no_program', days: 28 }, { reason: 'no_program', days: 28 }]);
  expect((await db.query(`select max(training_date)::text as last from public.workout_sessions`)).rows).toEqual([{ last: '2026-11-02' }]);
  expect((await db.query('select count(*)::int as n from auth.users where email is not null')).rows).toEqual([{ n: 0 }]);
});

it('demo captains read as Champion so eight sample players fit, real captains stay on Entry', async () => {
  const tier = async (user: string) => (await asUser(db, user,
    tx => tx.query<{ tier: string }>('select public.current_tier($1) as tier', [user]))).rows[0]?.tier;
  expect(await tier(captain)).toBe('champion');
  const real = await createUser(db, 'captain');
  expect(await tier(real)).toBe('entry');
});

it('rejects non-anonymous and missing claims with 42501', async () => {
  const user = await anonymous();
  await expect(asUser(db, user, tx => tx.query('select public.create_demo_workspace()'))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, user, async tx => {
    await tx.exec("select set_config('request.jwt.claims', '{}', true)");
    await tx.query('select public.create_demo_workspace()');
  })).rejects.toMatchObject({ code: '42501' });
});

it('a second call changes nothing, including expiry and history', async () => {
  const before = await snapshot();
  const profile = await db.query('select * from public.profiles where id = $1', [captain]);
  await demo(captain);
  expect((await snapshot()).rows).toEqual(before.rows);
  expect((await db.query('select * from public.profiles where id = $1', [captain])).rows).toEqual(profile.rows);
});

it('blocks demo invites and client changes to demo expiry', async () => {
  await expect(asUser(db, captain, tx => tx.query(
    "insert into public.coach_invites (code, captain_id) values ('DEMO-INVITE', $1)", [captain]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, captain, tx => tx.query(
    'update public.profiles set demo_expires_at = null where id = $1', [captain]))).rejects.toMatchObject({ code: '42501' });
  const normal = await createUser(db, 'captain');
  await expect(asUser(db, normal, tx => tx.query(
    "update public.profiles set demo_expires_at = now() where id = $1", [normal]))).rejects.toMatchObject({ code: '42501' });
});

it('ignores demo players in admission and counting but still limits real players', async () => {
  const normal = await createUser(db, 'captain');
  const player = (await db.query<{ player_id: string }>('select player_id from public.coach_clients where captain_id = $1 limit 1', [captain])).rows[0];
  if (!player) throw new Error('Missing demo player');
  await db.query('update public.coach_clients set archived_at = now() where player_id = $1', [player.player_id]);
  await db.query(`insert into public.coach_clients (captain_id, player_id, access_until)
    values ($1, $2, current_date + 30)`, [normal, player.player_id]);
  for (let i = 0; i < 5; i++) {
    const real = await createUser(db, 'player');
    await db.query('insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, current_date + 30)', [normal, real]);
  }
  const excess = await createUser(db, 'player');
  await expect(db.query('insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, current_date + 30)',
    [normal, excess])).rejects.toMatchObject({ code: 'P0001' });
});

it('another captain cannot read demo data and demo captains cannot read real data', async () => {
  const outsider = await createUser(db, 'captain');
  for (const table of ['coach_clients', 'player_intake', 'workout_sessions', 'set_logs', 'meal_logs', 'check_ins', 'inbox_items']) {
    const rows = await asUser(db, outsider, tx => tx.query(`select * from public.${table}`));
    expect(rows.rows, table).toEqual([]);
  }
  for (const [table, filter] of [['profiles', 'id'], ['programs', 'captain_id'], ['nutrition_plans', 'captain_id']] as const) {
    expect((await asUser(db, outsider, tx => tx.query(`select * from public.${table} where ${filter} = $1`, [captain]))).rows).toEqual([]);
    expect((await asUser(db, captain, tx => tx.query(`select * from public.${table} where ${filter} = $1`, [outsider]))).rows).toEqual([]);
  }
  for (const table of ['program_days', 'program_exercises', 'meals', 'meal_items', 'meal_item_alternatives']) {
    const owned = (await asUser(db, captain, tx => tx.query<{ id: string }>(`select id from public.${table}`))).rows.map(r => r.id);
    expect((await asUser(db, outsider, tx => tx.query(`select * from public.${table} where id = any($1::uuid[])`, [owned]))).rows).toEqual([]);
  }
});

it('suspension, private receipts, purge ACL and RPC ACL stay enforced', async () => {
  const user = await anonymous();
  await db.query('update public.profiles set suspended_at = now() where id = $1', [user]);
  await expect(demo(user)).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, captain, tx => tx.query('select security_private.purge_demo_workspaces()'))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, captain, tx => tx.query('select * from security_private.demo_workspaces'))).rejects.toMatchObject({ code: '42501' });
  expect((await db.query(`select has_function_privilege('anon', 'public.create_demo_workspace()', 'EXECUTE') as anon,
    has_function_privilege('authenticated', 'public.create_demo_workspace()', 'EXECUTE') as authenticated,
    relrowsecurity from pg_class where oid = 'security_private.demo_workspaces'::regclass`)).rows)
    .toEqual([{ anon: false, authenticated: true, relrowsecurity: true }]);
});

it('works with empty global catalogs and never borrows private exercises or foods', async () => {
  const owner = await createUser(db, 'captain');
  await db.query('update public.exercises set owner_id = $1', [owner]);
  await db.query('update public.foods set owner_id = $1', [owner]);
  const user = await anonymous();
  await demo(user);
  expect((await db.query('select count(*)::int as n from public.programs where captain_id = $1', [user])).rows).toEqual([{ n: 12 }]);
  expect((await db.query(`select count(*)::int as n from public.program_exercises e join public.program_days d on d.id = e.day_id
    join public.programs p on p.id = d.program_id where p.captain_id = $1`, [user])).rows).toEqual([{ n: 0 }]);
  expect((await db.query(`select count(*)::int as n from public.meal_items i join public.meals m on m.id = i.meal_id
    join public.nutrition_plans p on p.id = m.plan_id where p.captain_id = $1`, [user])).rows).toEqual([{ n: 0 }]);
});

it('the 51st workspace in the fixed clock hour fails atomically and old receipts do not count', async () => {
  const existing = await count('security_private.demo_workspaces') ?? 0;
  for (let i = existing; i < 50; i++) await demo(await anonymous());
  const blocked = await anonymous();
  const before = (await snapshot()).rows;
  await expect(demo(blocked)).rejects.toMatchObject({ code: 'P0001', message: 'demo_limit' });
  expect((await snapshot()).rows).toEqual(before);
  await demo(captain);
  await db.exec(`update security_private.demo_workspaces set created_at = now() - interval '61 minutes'
    where captain_id = (select captain_id from security_private.demo_workspaces limit 1)`);
  await demo(blocked);
  expect(await count('security_private.demo_workspaces')).toBe(51);
  // Seeds 50 full demo workspaces; shared CI runners need more than the global 20 s.
}, 90_000);

it('keeps ownership and the rate receipt when the captain is deleted before expiry', async () => {
  const user = (await db.query<{ captain_id: string }>(
    'select captain_id from security_private.demo_workspaces where captain_id <> $1 limit 1', [captain])).rows[0]?.captain_id;
  if (!user) throw new Error('Missing workspace');
  const receipt = (await db.query<{ player_ids: string[] }>(
    'select player_ids from security_private.demo_workspaces where captain_id = $1', [user])).rows[0];
  if (!receipt) throw new Error('Missing receipt');
  await db.query('delete from auth.users where id = $1', [user]);
  expect((await db.query('select player_ids from security_private.demo_workspaces where captain_id = $1', [user])).rows)
    .toEqual([receipt]);
  await db.query("update security_private.demo_workspaces set expires_at = now() - interval '1 second' where captain_id = $1", [user]);
  expect((await db.query('select security_private.purge_demo_workspaces() as n')).rows).toEqual([{ n: 1 }]);
  expect((await db.query('select * from auth.users where id = any($1::uuid[])', [receipt.player_ids])).rows).toEqual([]);
});

it('purges expired captains and their original players, cascades all data, and keeps unexpired workspaces', async () => {
  const ids = (await db.query<{ id: string }>(`select unnest(array[captain_id] || player_ids) as id
    from security_private.demo_workspaces where captain_id = $1`, [captain])).rows.map(r => r.id);
  const kept = await count('auth.users') ?? 0;
  // Hosted Supabase rejects any direct DELETE on storage.objects, so the purge must never issue one.
  await db.exec(`create function pg_temp.block_storage_delete() returns trigger language plpgsql as
    $f$ begin raise exception 'Direct deletion from storage tables is not allowed'; end $f$`);
  await db.exec(`create trigger block_delete before delete on storage.objects
    for each statement execute function pg_temp.block_storage_delete()`);
  await db.query("update public.profiles set demo_expires_at = now() - interval '1 second' where id = $1", [captain]);
  expect((await db.query('select security_private.purge_demo_workspaces() as n')).rows).toEqual([{ n: 1 }]);
  expect(await count('auth.users')).toBe(kept - 9);
  expect((await db.query('select * from public.profiles where id = any($1::uuid[])', [ids])).rows).toEqual([]);
  for (const table of ['coach_clients', 'programs', 'nutrition_plans', 'check_ins']) {
    expect((await db.query(`select * from public.${table} where captain_id = $1`, [captain])).rows).toEqual([]);
  }
  for (const table of ['player_intake', 'workout_sessions', 'set_logs', 'meal_logs']) {
    expect((await db.query(`select * from public.${table} where player_id = any($1::uuid[])`, [ids])).rows).toEqual([]);
  }
  expect((await db.query('select security_private.purge_demo_workspaces() as n')).rows).toEqual([{ n: 0 }]);
  await db.exec('drop trigger block_delete on storage.objects');
});

